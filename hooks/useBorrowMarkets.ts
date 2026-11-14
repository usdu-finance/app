import { useMemo } from 'react';
import { ALL, MOCK_DATA, USD, contractsOf } from '@/lib/borrow/mock';
import type { BorrowMarket } from '@/lib/borrow/types';

export interface BorrowMarketsData {
	markets: BorrowMarket[];
	/** Stablecoin (18 decimals) that can still be borrowed. For `ALL` the contracts are summed in USD. */
	available: bigint;
	totalBorrowed: bigint;
	totalLimit: bigint;
	isLoading: boolean;
	error: string | null;
}

const toUsd = (currency: string, value: bigint) => (value * BigInt(Math.round(USD[currency as keyof typeof USD] * 1e6))) / 1_000_000n;

/**
 * Hook to fetch the accepted markets of one stablecoin's borrow contract (BorrowMarketV1.getMarket for 1..marketCount),
 * or of all three with `ALL`. There is one borrow contract per stablecoin (USDU, EURU, CHFU).
 * MOCK: serves static data until the contracts are deployed.
 */
export function useBorrowMarkets(currency: string): BorrowMarketsData {
	return useMemo(() => {
		const markets = contractsOf(currency).flatMap((c) => MOCK_DATA[c].markets);
		const convert = (m: BorrowMarket, v: bigint) => (currency === ALL ? toUsd(m.currency, v) : v);
		const totalLimit = markets.reduce((sum, m) => sum + convert(m, m.limit), 0n);
		const totalBorrowed = markets.reduce((sum, m) => sum + convert(m, m.borrowed), 0n);
		return { markets, totalLimit, totalBorrowed, available: totalLimit - totalBorrowed, isLoading: false, error: null };
	}, [currency]);
}

export function useBorrowMarket(currency: string, marketId: number | undefined) {
	const data = useBorrowMarkets(currency);
	return { ...data, market: data.markets.find((m) => m.marketId === marketId) };
}
