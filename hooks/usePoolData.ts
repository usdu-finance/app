import { useGetPoolDataQuery } from '@/redux/api/onChainApi';
import { APP_REFETCH } from '@/lib/constants';

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

// Thin wrapper around the Redux-cached on-chain query: data survives navigation and
// page refreshes (via redux-persist), painting instantly from cache while
// `refetchOnMountOrArgChange` confirms freshness in the background.
export function usePoolData(): PoolData {
	const { data, error, isLoading } = useGetPoolDataQuery(undefined, {
		pollingInterval: APP_REFETCH,
		refetchOnMountOrArgChange: 30,
	});

	return {
		usdcBalance: data?.usdcBalance ?? null,
		usduBalance: data?.usduBalance ?? null,
		totalBalance: data?.totalBalance ?? null,
		totalSupply: data?.totalSupply ?? null,
		virtualPrice: data?.virtualPrice ?? null,
		adapterLPBalance: data?.adapterLPBalance ?? null,
		totalValue: data?.totalValue ?? null,
		usduPrice: data?.usduPrice ?? null,
		poolImbalance: data?.poolImbalance ?? null,
		usdcRatio: data?.usdcRatio ?? null,
		usduRatio: data?.usduRatio ?? null,
		adapterLPRatio: data?.adapterLPRatio ?? null,
		isLoading,
		error: error ? (typeof error === 'string' ? error : 'Failed to fetch pool data') : null,
	};
}
