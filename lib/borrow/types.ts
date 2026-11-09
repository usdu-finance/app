/**
 * Mirrors the structs of IBorrowMarketV1 (usdu-core/contracts/borrow). Amounts are raw on-chain units:
 * stablecoin 18 decimals, collateral `decimals`, prices (36 - decimals) decimals.
 * Fields marked "off-chain" are derived by the app and are not part of the contract.
 */

export interface BorrowMarket {
	/** off-chain: stablecoin the market lends, one borrow contract per stablecoin (USDU, EURU, CHFU). Ids are unique per contract only. */
	currency: string;
	marketId: number;
	/** off-chain: collateral metadata */
	collateralSymbol: string;
	collateralDecimals: number;
	collateral: `0x${string}`;
	/** latest maturity any position of this market may choose, unix seconds */
	maturity: number;
	/** duration of every auction, seconds */
	auction: number;
	minBalance: bigint;
	/** highest position price, (36 - decimals) decimals */
	price: bigint;
	/** 1e18 scaled share of every mint that is locked as reserve */
	reserve: bigint;
	/** 1e18 scaled, max stablecoin outstanding */
	limit: bigint;
	/** gross debt outstanding, counts against the limit */
	borrowed: bigint;
	badDebt: bigint;
	/** 1e18 scaled annual interest, charged upfront until maturity */
	rate: bigint;
	/** off-chain: reference market price of the collateral in stablecoin, (36 - decimals) decimals. Used for risk hints and leverage quotes. */
	refPrice: bigint;
}

export interface BorrowPosition {
	positionId: number;
	marketId: number;
	owner: `0x${string}`;
	maturity: number;
	/** minting, withdrawing and price increases are suspended until this timestamp */
	cooldown: number;
	balance: bigint;
	borrowed: bigint;
	reserve: bigint;
	/** (36 - decimals) decimals */
	price: bigint;
	/** collateral currently under challenge */
	challenged: bigint;
}

export interface BorrowChallenge {
	challengeId: number;
	challenger: `0x${string}`;
	startTime: number;
	positionId: number;
	/** collateral the challenger deposited */
	collateralSize: bigint;
}

export type PositionStatus = 'active' | 'hot' | 'challenged' | 'expired' | 'closed';
export type ChallengeRisk = 'low' | 'medium' | 'high';
