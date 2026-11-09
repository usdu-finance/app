import type { BorrowMarket, BorrowPosition, BorrowChallenge, PositionStatus, ChallengeRisk } from './types';

/** Mirrors the constants of BorrowMarketV1. */
export const ONE = 10n ** 18n;
export const AUCTION_PRICE_FACTOR = 10n;
export const AUCTION_REWARD_SHARE = 2n * 10n ** 17n; // 0.2
export const MAX_PRICE_INCREASE = 2n;
export const COOLDOWN_PRICE_INCREASE = 5 * 86400;
export const COOLDOWN_CHALLENGE_AVERTED = 3 * 86400;
export const COOLDOWN_CHALLENGE_SUCCEEDED = 5 * 86400;
const YEAR = 365 * 86400;

export const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Contract price ((36 - decimals) decimals) to a human number, stablecoin per whole collateral unit. */
export function priceToNumber(price: bigint, decimals: number): number {
	return Number(price) / 10 ** (36 - decimals);
}

/** Human price back to the contract representation. */
export function numberToPrice(price: number, decimals: number): bigint {
	return (BigInt(Math.round(price * 1e6)) * 10n ** BigInt(36 - decimals)) / 1_000_000n;
}

export const toNumber = (value: bigint, decimals = 18): number => Number(value) / 10 ** decimals;

/** feeRate(): upfront interest share of the borrowed amount for `maturity`, 1e18 scaled. */
export function feeRate(market: Pick<BorrowMarket, 'rate'>, maturity: number, now = nowSeconds()): bigint {
	if (maturity <= now) return 0n;
	return (market.rate * BigInt(maturity - now)) / BigInt(YEAR);
}

/** Gross debt split of a mint: reserve and fee are held back, the borrower receives the rest. */
export function splitMint(market: Pick<BorrowMarket, 'reserve' | 'rate'>, amount: bigint, maturity: number) {
	const reserve = (amount * market.reserve + ONE - 1n) / ONE;
	const fee = (amount * feeRate(market, maturity)) / ONE;
	return { reserve, fee, received: amount - reserve - fee };
}

/** Largest gross debt a position can take: balance * price / 1e18, bounded by the market's free limit. */
export function maxBorrow(market: BorrowMarket, balance: bigint, price: bigint = market.price): bigint {
	const covered = (balance * price) / ONE;
	const free = market.limit > market.borrowed ? market.limit - market.borrowed : 0n;
	return covered < free ? covered : free;
}

/** Quadratic ease-out Dutch auction: 10x the position price at `start`, 0 after `duration`. */
export function auctionPrice(start: number, duration: number, price: bigint, now = nowSeconds()): bigint {
	const startPrice = AUCTION_PRICE_FACTOR * price;
	if (now <= start) return startPrice;
	const elapsed = now - start;
	if (elapsed >= duration) return 0n;
	const remaining = BigInt(duration - elapsed);
	const d = BigInt(duration);
	return (((startPrice * remaining) / d) * remaining) / d;
}

/** Share of the auction duration after which the price reaches the position price (~68%). */
export function auctionTurningPoint(): number {
	return 1 - Math.sqrt(1 / Number(AUCTION_PRICE_FACTOR));
}

export function positionStatus(p: BorrowPosition, now = nowSeconds()): PositionStatus {
	if (p.balance === 0n) return 'closed';
	if (now >= p.maturity) return 'expired';
	if (p.challenged > 0n) return 'challenged';
	if (now <= p.cooldown) return 'hot';
	return 'active';
}

/** Without an oracle the only signal is how far the position price sits below the market price. */
export function challengeRisk(p: Pick<BorrowPosition, 'price'>, m: Pick<BorrowMarket, 'refPrice'>): ChallengeRisk {
	if (m.refPrice === 0n) return 'low';
	const ratio = Number((p.price * 1000n) / m.refPrice) / 1000;
	return ratio < 0.6 ? 'low' : ratio < 0.85 ? 'medium' : 'high';
}

/** Debt that must be repaid in stablecoin to close a position: borrowed - reserve. */
export const debtDue = (p: Pick<BorrowPosition, 'borrowed' | 'reserve'>) => p.borrowed - p.reserve;

/**
 * Leverage quote: the user deposits `base` collateral and loops borrow -> swap -> deposit. Gross debt D buys
 * (D * k) / spot collateral where k = 1 - reserve - fee, and the position has to stay covered at its price.
 * Returns the highest leverage (total collateral / base) that fits, 1 if the market doesn't allow looping.
 */
export function maxLeverage(market: BorrowMarket, maturity: number, price: bigint = market.price): number {
	const k = 1 - toNumber(market.reserve) - toNumber(feeRate(market, maturity));
	const spot = priceToNumber(market.refPrice, market.collateralDecimals);
	const p = priceToNumber(price, market.collateralDecimals);
	const cost = spot / k; // stablecoin of gross debt per collateral unit bought
	if (cost <= p) return 1;
	return cost / (cost - p);
}

export interface LeverageQuote {
	collateral: number;
	debt: number;
	received: number;
	reserve: number;
	fee: number;
	/** collateral price at which the position price is reached from the market price, i.e. how far the market can fall */
	buffer: number;
}

export function quoteLeverage(
	market: BorrowMarket,
	base: number,
	leverage: number,
	maturity: number,
	price: bigint = market.price
): LeverageQuote {
	const k = 1 - toNumber(market.reserve) - toNumber(feeRate(market, maturity));
	const spot = priceToNumber(market.refPrice, market.collateralDecimals);
	const p = priceToNumber(price, market.collateralDecimals);
	const collateral = base * leverage;
	const debt = ((collateral - base) * spot) / k;
	return {
		collateral,
		debt,
		received: debt * k,
		reserve: debt * toNumber(market.reserve),
		fee: debt * toNumber(feeRate(market, maturity)),
		buffer: spot > 0 ? 1 - p / spot : 0,
	};
}

export function challengeCost(ch: BorrowChallenge, p: BorrowPosition, m: BorrowMarket, size: bigint, now = nowSeconds()) {
	const price = auctionPrice(ch.startTime, m.auction, p.price, now);
	return { price, cost: (price * size) / ONE, averts: price >= p.price };
}
