import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { APP_REFETCH } from '@/lib/constants';

export interface SwapBalancesData {
	coinBalance: number;
	coinBalanceRaw: bigint;
	coinAllowanceRaw: bigint;
	targetBalance: number;
	targetBalanceRaw: bigint;
	targetAllowanceRaw: bigint;
	isLoading: boolean;
	error: string | null;
	refetch: () => void;
}

/**
 * Hook to fetch a connected wallet's coin/target-stablecoin balances and their allowance to the swap router
 * @param coinAddress - The bridge module's source coin (e.g. USDC/USDT/EURC/ZCHF)
 * @param coinDecimals - Decimals of the source coin
 * @param ownerAddress - Connected wallet address
 * @param routerAddress - The module's currency's swap router
 * @param targetAddress - The stablecoin minted/burned by the module (USDU/EURU/CHFU/...)
 */
export function useSwapBalances(
	coinAddress: `0x${string}` | undefined,
	coinDecimals: number,
	ownerAddress: `0x${string}` | undefined,
	routerAddress: `0x${string}` | undefined,
	targetAddress: `0x${string}` | undefined
): SwapBalancesData {
	const contracts = useMemo(() => {
		if (!coinAddress || !ownerAddress || !routerAddress || !targetAddress) return [];
		return [
			{ address: coinAddress, abi: erc20Abi, functionName: 'balanceOf' as const, args: [ownerAddress] },
			{
				address: coinAddress,
				abi: erc20Abi,
				functionName: 'allowance' as const,
				args: [ownerAddress, routerAddress],
			},
			{ address: targetAddress, abi: erc20Abi, functionName: 'balanceOf' as const, args: [ownerAddress] },
			{
				address: targetAddress,
				abi: erc20Abi,
				functionName: 'allowance' as const,
				args: [ownerAddress, routerAddress],
			},
		];
	}, [coinAddress, ownerAddress, routerAddress, targetAddress]);

	const { data, isLoading, error, refetch } = useReadContracts({
		contracts,
		query: {
			enabled: contracts.length > 0,
			refetchInterval: APP_REFETCH,
		},
	});

	return useMemo(() => {
		const empty = {
			coinBalance: 0,
			coinBalanceRaw: 0n,
			coinAllowanceRaw: 0n,
			targetBalance: 0,
			targetBalanceRaw: 0n,
			targetAllowanceRaw: 0n,
			refetch,
		};

		if (error) {
			return { ...empty, isLoading: false, error: error.message };
		}

		if (!data || isLoading) {
			return { ...empty, isLoading, error: null };
		}

		const coinBalanceRaw = (data[0]?.result as bigint) ?? 0n;
		const coinAllowanceRaw = (data[1]?.result as bigint) ?? 0n;
		const targetBalanceRaw = (data[2]?.result as bigint) ?? 0n;
		const targetAllowanceRaw = (data[3]?.result as bigint) ?? 0n;

		return {
			coinBalance: parseFloat(formatUnits(coinBalanceRaw, coinDecimals)),
			coinBalanceRaw,
			coinAllowanceRaw,
			targetBalance: parseFloat(formatUnits(targetBalanceRaw, 18)),
			targetBalanceRaw,
			targetAllowanceRaw,
			isLoading: false,
			error: null,
			refetch,
		};
	}, [data, isLoading, error, coinDecimals, refetch]);
}
