import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { useModulesData } from './useModulesData';
import { IModuleFinancialsABI } from '@/lib/abis/module/IModuleFinancials';
import { APP_REFETCH } from '@/lib/constants';
import { usePoolData } from './usePoolData';
import { ADDRESS } from '@usdu-finance/usdu-core';

export interface ModuleFinancials {
	address: string;
	totalAssets: number;
	totalMinted: number;
	totalAssetsRaw: bigint;
	totalMintedRaw: bigint;
}

export interface ModulesFinancialsData {
	byAddress: Map<string, ModuleFinancials>;
	totalAssets: number;
	totalMinted: number;
	totalAssetsRaw: bigint;
	totalMintedRaw: bigint;
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch financial data (totalAssets, totalMinted) for all active modules
 * @param chainId - Chain ID to query (defaults to mainnet)
 * @returns Financial data mapped by module address and aggregated totals
 */
export function useModulesFinancials(chainId: number = mainnet.id): ModulesFinancialsData {
	// Get active modules
	const { activeModules, isLoading: isLoadingModules, error: modulesError } = useModulesData(chainId);
	const { virtualPrice, adapterLPBalance } = usePoolData();

	// Build contract calls for each active module (2 calls per module: totalAssets + totalMinted)
	const contracts = useMemo(
		() =>
			activeModules.flatMap((module) => [
				{
					address: module.module as `0x${string}`,
					abi: IModuleFinancialsABI,
					functionName: 'totalAssets' as const,
				},
				{
					address: module.module as `0x${string}`,
					abi: IModuleFinancialsABI,
					functionName: 'totalMinted' as const,
				},
			]),
		[activeModules]
	);

	// Fetch all data in parallel
	const {
		data,
		error: contractsError,
		isLoading: isLoadingContracts,
	} = useReadContracts({
		contracts,
		query: {
			enabled: activeModules.length > 0,
			refetchInterval: APP_REFETCH,
		},
	});

	// Process data
	return useMemo(() => {
		// Handle modules loading error
		if (modulesError) {
			return {
				byAddress: new Map(),
				totalAssets: 0,
				totalMinted: 0,
				totalAssetsRaw: 0n,
				totalMintedRaw: 0n,
				isLoading: false,
				error: modulesError,
			};
		}

		// Handle contracts error
		if (contractsError) {
			return {
				byAddress: new Map(),
				totalAssets: 0,
				totalMinted: 0,
				totalAssetsRaw: 0n,
				totalMintedRaw: 0n,
				isLoading: false,
				error: contractsError.message,
			};
		}

		// Wait for data
		if (!data || isLoadingModules || isLoadingContracts) {
			return {
				byAddress: new Map(),
				totalAssets: 0,
				totalMinted: 0,
				totalAssetsRaw: 0n,
				totalMintedRaw: 0n,
				isLoading: isLoadingModules || isLoadingContracts,
				error: null,
			};
		}

		try {
			const byAddress = new Map<string, ModuleFinancials>();
			let totalAssetsSum = 0n;
			let totalMintedSum = 0n;

			// Process results (2 results per module)
			activeModules.forEach((module, index) => {
				const totalAssetsResult = data[index * 2];
				const totalMintedResult = data[index * 2 + 1];

				let totalAssetsRaw = totalAssetsResult?.result ? (totalAssetsResult.result as bigint) : 0n;
				const totalMintedRaw = totalMintedResult?.result ? (totalMintedResult.result as bigint) : 0n;

				// Overwrite for CurveAdapter
				const adapterAddress = ADDRESS[mainnet.id].usduCurveAdapterV1_1_USDC_2;
				if (module.module.toLowerCase() == adapterAddress.toLowerCase()) {
					totalAssetsRaw = ((virtualPrice || 0n) * (adapterLPBalance || 0n)) / parseUnits('1', 18);
				}

				// Format values as numbers (assuming 18 decimals for USDU)
				const totalAssets = parseFloat(formatUnits(totalAssetsRaw, 18));
				const totalMinted = parseFloat(formatUnits(totalMintedRaw, 18));

				byAddress.set(module.module, {
					address: module.module,
					totalAssets,
					totalMinted,
					totalAssetsRaw,
					totalMintedRaw,
				});

				// Add to totals
				totalAssetsSum += totalAssetsRaw;
				totalMintedSum += totalMintedRaw;
			});

			return {
				byAddress,
				totalAssets: parseFloat(formatUnits(totalAssetsSum, 18)),
				totalMinted: parseFloat(formatUnits(totalMintedSum, 18)),
				totalAssetsRaw: totalAssetsSum,
				totalMintedRaw: totalMintedSum,
				isLoading: false,
				error: null,
			};
		} catch (err) {
			return {
				byAddress: new Map(),
				totalAssets: 0,
				totalMinted: 0,
				totalAssetsRaw: 0n,
				totalMintedRaw: 0n,
				isLoading: false,
				error: `Error processing financials: ${err instanceof Error ? err.message : 'Unknown error'}`,
			};
		}
	}, [
		data,
		activeModules,
		modulesError,
		contractsError,
		isLoadingModules,
		isLoadingContracts,
		virtualPrice,
		adapterLPBalance,
	]);
}
