import { usePoolModules } from '@/hooks/usePoolModules';

interface PoolData {
	// Pool balances
	usdcBalance: bigint | null;
	usduBalance: bigint | null;
	totalBalance: bigint | null;

	// LP token info
	totalSupply: bigint | null;
	virtualPrice: bigint | null;
	adapterLPBalance: bigint | null;

	// Pool stats
	totalValue: number | null;
	usduPrice: number | null;
	poolImbalance: boolean | null;
	usdcRatio: number | null;
	usduRatio: number | null;
	adapterLPRatio: number | null;

	// Loading states
	isLoading: boolean;
	error: string | null;
}

// Convenience wrapper around usePoolModules() for the primary USDC/USDU pool, kept for
// consumers that only care about the single default pool (e.g. dashboard-wide financial rollups).
export function usePoolData(): PoolData {
	const { modules, isLoading, error } = usePoolModules();
	const pool = modules[0];

	return {
		usdcBalance: pool?.usdcBalance ?? null,
		usduBalance: pool?.usduBalance ?? null,
		totalBalance: pool?.totalBalance ?? null,
		totalSupply: pool?.totalSupply ?? null,
		virtualPrice: pool?.virtualPrice ?? null,
		adapterLPBalance: pool?.adapterLPBalance ?? null,
		totalValue: pool?.totalValue ?? null,
		usduPrice: pool?.usduPrice ?? null,
		poolImbalance: pool?.poolImbalance ?? null,
		usdcRatio: pool?.usdcRatio ?? null,
		usduRatio: pool?.usduRatio ?? null,
		adapterLPRatio: pool?.adapterLPRatio ?? null,
		isLoading,
		error,
	};
}
