import { useMemo } from 'react';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { useGetPoolsDataQuery, type PoolConfig, type PoolData } from '@/redux/api/onChainApi';
import { USDU_CURVE_ADAPTER_V1_1_USDC_2 } from '@/lib/whitelisted-tokens';
import { APP_REFETCH } from '@/lib/constants';

export interface PoolModule extends PoolConfig, PoolData {
	label: string;
}

export interface PoolModulesData {
	modules: PoolModule[];
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch the registered liquidity pools' on-chain stats (balances, LP supply, adapter
 * holdings). Mirrors useSwapModules: a static pool registry expanded into one batched multicall.
 * @param chainId - Chain ID to query (defaults to mainnet)
 * @returns Available liquidity pools with their balances and adapter stats
 */
export function usePoolModules(chainId: number = mainnet.id): PoolModulesData {
	const addresses = chainId === mainnet.id ? ADDRESS[mainnet.id] : undefined;

	const poolConfigs = useMemo(
		() =>
			addresses
				? [
						{
							key: 'usdc-usdu',
							label: 'USDC / USDU',
							poolAddress: addresses.curveStableSwapNG_USDCUSDU as `0x${string}`,
							adapterAddress: USDU_CURVE_ADAPTER_V1_1_USDC_2,
						},
					]
				: [],
		[addresses]
	);

	const {
		data: poolsData,
		isLoading,
		error,
	} = useGetPoolsDataQuery(poolConfigs, {
		skip: poolConfigs.length === 0,
		pollingInterval: APP_REFETCH,
		refetchOnMountOrArgChange: 30,
	});

	return useMemo(() => {
		if (error) {
			return { modules: [], isLoading: false, error: typeof error === 'string' ? error : 'Failed to fetch pool data' };
		}

		if (!poolsData) {
			return { modules: [], isLoading, error: null };
		}

		const modules: PoolModule[] = poolConfigs
			.filter((config) => poolsData[config.key])
			.map((config) => ({ ...config, ...poolsData[config.key] }));

		return { modules, isLoading: false, error: null };
	}, [poolsData, isLoading, error, poolConfigs]);
}
