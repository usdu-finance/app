import { parseUnits } from 'viem';
import { nowSeconds, numberToPrice } from './math';
import type { BorrowChallenge, BorrowMarket, BorrowPosition } from './types';

/**
 * MOCK DATA — the borrow markets are not deployed yet. Replace the hooks in `hooks/useBorrow*.ts` with
 * on-chain reads (BorrowMarketV1 getMarket / getPosition / getChallenge plus indexer events) and delete this file.
 *
 * One borrow contract per native stablecoin. Its primary markets are the cross markets: the other native
 * stablecoins as collateral (post EURU, borrow USDU). Volatile assets come on top.
 */

export const CURRENCIES = ['USDU', 'EURU', 'CHFU'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Pseudo currency of the aggregated view over all borrow contracts. */
export const ALL = 'ALL';

/** The contracts a currency selection refers to. */
export const contractsOf = (currency: string): Currency[] =>
	currency === ALL ? [...CURRENCIES] : CURRENCIES.filter((c) => c === currency);

const DAY = 86400;
const HOUR = 3600;
const now = nowSeconds();

const addr = (n: number) => `0x${n.toString(16).padStart(40, '0')}` as `0x${string}`;
const e18 = (v: number) => parseUnits(v.toFixed(2), 18);

/** Stand-in for the connected wallet, so "My positions" has something to show while connected. */
export const MOCK_CHALLENGER = addr(0xc0ffee);
const OTHER = [addr(0xa11ce), addr(0xb0b), addr(0xca401), addr(0xda7e)];

/** Dollar value of one unit, to derive the cross rates. */
export const USD: Record<Currency, number> = { USDU: 1, EURU: 1.087, CHFU: 1.136 };

interface Asset {
	symbol: string;
	decimals: number;
	address: `0x${string}`;
	usd: number;
	cross: boolean;
}

const ASSETS: Asset[] = [
	{ symbol: 'WETH', decimals: 18, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', usd: 3180, cross: false },
	{ symbol: 'WBTC', decimals: 8, address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', usd: 96500, cross: false },
];

interface MarketSpec {
	asset: Asset;
	maturityDays: number;
	auctionDays: number;
	minBalance: number;
	maxPriceShare: number; // of the market price
	reserve: number;
	rate: number;
	limit: number; // in the stablecoin
	utilization: number;
	badDebt?: number;
}

function marketSpecs(currency: Currency): MarketSpec[] {
	const cross: MarketSpec[] = CURRENCIES.filter((c) => c !== currency).map((c, i) => ({
		asset: { symbol: c, decimals: 18, address: addr(0xe00 + CURRENCIES.indexOf(c)), usd: USD[c], cross: true },
		maturityDays: i === 0 ? 180 : 365,
		auctionDays: 1,
		minBalance: 1000,
		maxPriceShare: 0.96,
		reserve: 0.1,
		rate: i === 0 ? 0.03 : 0.035,
		limit: 10_000_000,
		utilization: i === 0 ? 0.46 : 0.31,
	}));
	return [
		...cross,
		{
			asset: ASSETS[0]!,
			maturityDays: 180,
			auctionDays: 3,
			minBalance: 0.5,
			maxPriceShare: 0.75,
			reserve: 0.15,
			rate: 0.06,
			limit: 5_000_000,
			utilization: 0.43,
			badDebt: currency === 'USDU' ? 4200 : 0,
		},
		{
			asset: ASSETS[1]!,
			maturityDays: 365,
			auctionDays: 5,
			minBalance: 0.02,
			maxPriceShare: 0.75,
			reserve: 0.12,
			rate: 0.05,
			limit: 8_000_000,
			utilization: 0.69,
		},
	];
}

function buildMarkets(currency: Currency): BorrowMarket[] {
	return marketSpecs(currency).map((s, i) => {
		const ref = s.asset.usd / USD[currency];
		const limit = e18(s.limit);
		return {
			currency,
			marketId: i + 1,
			collateralSymbol: s.asset.symbol,
			collateralDecimals: s.asset.decimals,
			collateral: s.asset.address,
			maturity: now + s.maturityDays * DAY,
			auction: s.auctionDays * DAY,
			minBalance: parseUnits(String(s.minBalance), s.asset.decimals),
			price: numberToPrice(+(ref * s.maxPriceShare).toPrecision(5), s.asset.decimals),
			reserve: e18(s.reserve),
			limit,
			borrowed: (limit * BigInt(Math.round(s.utilization * 1000))) / 1000n,
			badDebt: e18(s.badDebt ?? 0),
			rate: e18(s.rate),
			refPrice: numberToPrice(+ref.toPrecision(6), s.asset.decimals),
		};
	});
}

interface PositionSpec {
	market: number; // index into the markets, 0 and 1 are cross
	owner: `0x${string}`;
	days: number; // negative: already matured
	balance: number;
	utilization: number; // of what the position price covers
	priceShare: number; // position price as share of the market price, the closer to 1 the riskier
	extra?: Partial<BorrowPosition>;
}

function positionSpecs(currency: Currency): PositionSpec[] {
	const m = MOCK_CHALLENGER;
	return [
		{ market: 0, owner: m, days: 150, balance: 60000, utilization: 0.75, priceShare: 0.94 },
		{ market: 1, owner: m, days: 300, balance: 25000, utilization: 0.55, priceShare: 0.92, extra: { cooldown: now + 2 * DAY } },
		{ market: 0, owner: OTHER[0]!, days: 120, balance: 200000, utilization: 0.9, priceShare: 0.95 },
		{
			market: 0,
			owner: OTHER[1]!,
			days: 170,
			balance: 80000,
			utilization: 0.8,
			priceShare: 0.99,
			extra: { challenged: parseUnits('20000', 18) },
		},
		{
			market: 1,
			owner: OTHER[2]!,
			days: 200,
			balance: 150000,
			utilization: 0.7,
			priceShare: 0.93,
			extra: { challenged: parseUnits('30000', 18) },
		},
		{ market: 1, owner: OTHER[3]!, days: -1.2, balance: 40000, utilization: 0.85, priceShare: 0.9 },
		{ market: 0, owner: OTHER[0]!, days: -2.5, balance: 30000, utilization: 0.6, priceShare: 0.9 },
		{ market: 2, owner: m, days: 150, balance: 12, utilization: 0.7, priceShare: 0.75 },
		{ market: 3, owner: OTHER[2]!, days: 200, balance: 3.5, utilization: 0.9, priceShare: 0.74 },
		{ market: 2, owner: OTHER[1]!, days: 90, balance: 40, utilization: 0.85, priceShare: 0.97 },
	].map((p) => (currency === 'USDU' ? p : { ...p, balance: p.balance * 0.8 }));
}

function build(currency: Currency) {
	const markets = buildMarkets(currency);
	const positions: BorrowPosition[] = positionSpecs(currency).map((s, i) => {
		const market = markets[s.market]!;
		const ref = Number(market.refPrice) / 10 ** (36 - market.collateralDecimals);
		const price = numberToPrice(+(ref * s.priceShare).toPrecision(5), market.collateralDecimals);
		const balance = parseUnits(String(s.balance), market.collateralDecimals);
		const covered = (balance * price) / 10n ** 18n;
		const borrowed = (covered * BigInt(Math.round(s.utilization * 1000))) / 1000n;
		return {
			positionId: i + 1,
			marketId: market.marketId,
			owner: s.owner,
			maturity: now + Math.round(s.days * DAY),
			cooldown: 0,
			balance,
			borrowed,
			reserve: (borrowed * market.reserve) / 10n ** 18n,
			price,
			challenged: 0n,
			...s.extra,
		};
	});

	// 3h in the auction is still far above the position price, 19h of 24h is far below
	const challenges: BorrowChallenge[] = [
		{ challengeId: 0, challenger: OTHER[3]!, startTime: now - 3 * HOUR, positionId: 4, collateralSize: parseUnits('20000', 18) },
		{ challengeId: 1, challenger: MOCK_CHALLENGER, startTime: now - 19 * HOUR, positionId: 5, collateralSize: parseUnits('30000', 18) },
	];

	return { markets, positions, challenges };
}

export const MOCK_DATA = Object.fromEntries(CURRENCIES.map((c) => [c, build(c)])) as Record<Currency, ReturnType<typeof build>>;
