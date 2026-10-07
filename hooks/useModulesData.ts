import { useQuery, gql } from '@apollo/client';
import { mainnet } from 'viem/chains';

// GraphQL query to fetch current module mappings
const GET_STABLECOIN_MODULES = gql`
	query GetStablecoinModules($chainId: Int!) {
		stablecoinModuleMappings(where: { chainId: $chainId }, orderBy: "updatedAt", orderDirection: "desc") {
			items {
				chainId
				stablecoin
				module
				message
				messageUpdated
				createdAt
				updatedAt
				expiredAt
				txHash
				logIndex
				blockheight
				caller
			}
		}
	}
`;

// GraphQL query to fetch module history for a specific module
const GET_STABLECOIN_MODULE_HISTORY = gql`
	query GetStablecoinModuleHistory($chainId: Int!, $module: String) {
		stablecoinModuleHistorys(
			where: { chainId: $chainId, module: $module }
			orderBy: "createdAt"
			orderDirection: "desc"
		) {
			items {
				chainId
				stablecoin
				txHash
				logIndex
				createdAt
				blockheight
				caller
				module
				kind
				message
				expiredAt
				timelock
			}
		}
	}
`;

// GraphQL query to fetch all module history
const GET_STABLECOIN_MODULE_HISTORY_ALL = gql`
	query GetStablecoinModuleHistoryAll($chainId: Int!) {
		stablecoinModuleHistorys(where: { chainId: $chainId }, orderBy: "createdAt", orderDirection: "desc") {
			items {
				chainId
				stablecoin
				txHash
				logIndex
				createdAt
				blockheight
				caller
				module
				kind
				message
				expiredAt
				timelock
			}
		}
	}
`;

export interface StablecoinModule {
	chainId: number;
	/** Address of the stablecoin (USDU, EURU, CHFU, ...) this module is registered on. */
	stablecoin: string;
	module: string;
	message: string;
	messageUpdated: string | null;
	createdAt: bigint;
	updatedAt: bigint;
	expiredAt: bigint;
	txHash: string;
	logIndex: number;
	blockheight: bigint;
	caller: string;
	isExpired: boolean;
}

export interface StablecoinModuleHistoryItem {
	chainId: number;
	stablecoin: string;
	txHash: string;
	logIndex: number;
	createdAt: bigint;
	blockheight: bigint;
	caller: string;
	module: string;
	kind: 'Proposed' | 'Revoked' | 'Set';
	message: string;
	expiredAt: bigint | null;
	timelock: bigint | null;
}

interface ModulesData {
	modules: StablecoinModule[];
	activeModules: StablecoinModule[];
	isLoading: boolean;
	error: string | null;
	refetch: () => void;
}

interface ModuleHistoryData {
	history: StablecoinModuleHistoryItem[];
	isLoading: boolean;
	error: string | null;
	refetch: () => void;
}

/**
 * Hook to fetch current stablecoin module mappings
 * Uses Apollo Client's cache-and-network policy for optimal caching:
 * - Returns cached data immediately if available
 * - Fetches fresh data in the background
 * - Manual refresh (refetch) will always fetch fresh data
 */
export function useModulesData(chainId: number = mainnet.id): ModulesData {
	const { data, loading, error, refetch } = useQuery(GET_STABLECOIN_MODULES, {
		variables: { chainId },
		fetchPolicy: 'cache-and-network', // Use cache but also fetch fresh data
		nextFetchPolicy: 'cache-first', // After first fetch, prefer cache
	});

	const rawModules = data?.stablecoinModuleMappings?.items ?? [];
	const now = BigInt(Math.floor(Date.now() / 1000));

	// Add isExpired flag to each module
	const modules: StablecoinModule[] = rawModules.map((module: StablecoinModule) => ({
		...module,
		isExpired: BigInt(module.expiredAt) < now,
	}));

	const activeModules = modules.filter((m) => !m.isExpired);

	return {
		modules,
		activeModules,
		isLoading: loading,
		error: error ? error.message : null,
		refetch: () => {
			refetch();
		},
	};
}

/**
 * Hook to fetch module history for a specific module
 * @param chainId - Chain ID to query (defaults to mainnet)
 * @param module - Module address to filter history
 */
export function useModuleHistory(chainId: number = mainnet.id, module: string): ModuleHistoryData {
	const { data, loading, error, refetch } = useQuery(GET_STABLECOIN_MODULE_HISTORY, {
		variables: {
			chainId,
			module,
		},
		fetchPolicy: 'cache-and-network',
		nextFetchPolicy: 'cache-first',
	});

	const history = data?.stablecoinModuleHistorys?.items ?? [];

	return {
		history,
		isLoading: loading,
		error: error ? error.message : null,
		refetch: () => {
			refetch();
		},
	};
}

/**
 * Hook to fetch all module across all modules with module data
 * @param chainId - Chain ID to query (defaults to mainnet)
 */
export function useModuleDataAll(chainId: number = mainnet.id) {
	const {
		modules,
		activeModules,
		isLoading: isLoadingModules,
		error: errorModules,
		refetch: refetchModules,
	} = useModulesData(chainId);

	const {
		data,
		loading: isLoadingHistory,
		error: errorHistory,
		refetch: refetchHistory,
	} = useQuery(GET_STABLECOIN_MODULE_HISTORY_ALL, {
		variables: {
			chainId,
		},
		fetchPolicy: 'cache-and-network',
		nextFetchPolicy: 'cache-first',
	});

	const history: StablecoinModuleHistoryItem[] = data?.stablecoinModuleHistorys?.items ?? [];

	return {
		modules,
		activeModules,
		history,
		isLoading: isLoadingModules || isLoadingHistory,
		error: errorModules || (errorHistory ? errorHistory.message : null),
		refetch: () => {
			refetchModules();
			refetchHistory();
		},
	};
}

/**
 * Helper hook to get a specific module by address with its history
 */
export function useModuleByAddress(moduleAddress: string, chainId: number = mainnet.id) {
	const {
		modules,
		isLoading: isLoadingModules,
		error: errorModules,
		refetch: refetchModules,
	} = useModulesData(chainId);

	const {
		history,
		isLoading: isLoadingHistory,
		error: errorHistory,
		refetch: refetchHistory,
	} = useModuleHistory(chainId, moduleAddress);

	const moduleSelected = modules.find((m) => m.module.toLowerCase() === moduleAddress.toLowerCase());

	return {
		module: moduleSelected || null,
		history,
		isLoading: isLoadingModules || isLoadingHistory,
		error: errorModules || errorHistory,
		refetch: () => {
			refetchModules();
			refetchHistory();
		},
	};
}
