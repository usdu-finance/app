import { useQuery, gql } from '@apollo/client';
import { mainnet } from 'viem/chains';
import { APP_REFETCH } from '@/lib/constants';

// Daily snapshots of a module's totalMinted / totalRevenue, and its daily swap aggregates
const GET_MODULE_DAILY = gql`
	query GetModuleDaily($chainId: Int!, $module: String!) {
		moduleRevenueV1Dailys(where: { chainId: $chainId, module: $module }, orderBy: "day", orderDirection: "asc", limit: 1000) {
			items {
				day
				totalMinted
				totalRevenue
			}
		}
		swapBridgeMorphoV1Dailys(where: { chainId: $chainId, module: $module }, orderBy: "day", orderDirection: "asc", limit: 1000) {
			items {
				day
				count
				volumeIn
				volumeOut
				fees
			}
		}
	}
`;

export interface ModuleSnapshot {
	day: number; // utc midnight, seconds
	totalMinted: number; // stablecoin
	totalRevenue: number; // stablecoin
}

export interface ModuleSwapDay {
	day: number; // utc midnight, seconds
	volume: number; // volumeIn + volumeOut, stablecoin
	fees: number; // stablecoin
}

export interface ModuleDailyData {
	snapshots: ModuleSnapshot[];
	swapDays: ModuleSwapDay[];
	isLoading: boolean;
	error: string | null;
}

const toNumber = (value: string) => Number(value) / 1e18;

/**
 * Hook to fetch the indexed daily history of a swap module, oldest first
 * @param module - Module address
 */
export function useModuleDaily(module: string | undefined): ModuleDailyData {
	const { data, loading, error } = useQuery(GET_MODULE_DAILY, {
		variables: { chainId: mainnet.id, module: module?.toLowerCase() },
		skip: !module,
		pollInterval: APP_REFETCH,
	});

	const snapshots: { day: string; totalMinted: string; totalRevenue: string }[] = data?.moduleRevenueV1Dailys?.items ?? [];
	const swapDays: { day: string; volumeIn: string; volumeOut: string; fees: string }[] = data?.swapBridgeMorphoV1Dailys?.items ?? [];

	return {
		snapshots: snapshots.map((s) => ({
			day: Number(s.day),
			totalMinted: toNumber(s.totalMinted),
			totalRevenue: toNumber(s.totalRevenue),
		})),
		swapDays: swapDays.map((s) => ({
			day: Number(s.day),
			volume: toNumber(s.volumeIn) + toNumber(s.volumeOut),
			fees: toNumber(s.fees),
		})),
		isLoading: loading && !data,
		error: error?.message ?? null,
	};
}
