import { useQuery, gql } from '@apollo/client';
import { mainnet } from 'viem/chains';
import { APP_REFETCH } from '@/lib/constants';

// SwapIn/SwapOut history of a module, scoped to the receiver of the swap
const GET_MODULE_SWAPS = gql`
	query GetModuleSwaps($chainId: Int!, $module: String!, $target: String!) {
		swapBridgeMorphoV1Swaps(
			where: { chainId: $chainId, module: $module, target: $target }
			orderBy: "created"
			orderDirection: "desc"
			limit: 50
		) {
			items {
				txHash
				logIndex
				created
				kind
				amountCoin
				amountStable
				fee
			}
		}
	}
`;

export interface ModuleSwapEntry {
	txHash: string;
	logIndex: number;
	created: string;
	kind: 'SwapIn' | 'SwapOut';
	amountCoin: string; // coin decimals
	amountStable: string; // 18 decimals, before fee
	fee: string; // 18 decimals
}

export interface ModuleSwapHistoryData {
	entries: ModuleSwapEntry[];
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch the indexed swaps of a wallet on a swap module
 * @param module - Module address
 * @param target - Wallet that received the swap
 */
export function useModuleSwapHistory(module: string | undefined, target: string | undefined): ModuleSwapHistoryData {
	const { data, loading, error } = useQuery(GET_MODULE_SWAPS, {
		variables: { chainId: mainnet.id, module: module?.toLowerCase(), target: target?.toLowerCase() },
		skip: !module || !target,
		pollInterval: APP_REFETCH,
	});

	return {
		entries: data?.swapBridgeMorphoV1Swaps?.items ?? [],
		isLoading: loading && !data,
		error: error?.message ?? null,
	};
}
