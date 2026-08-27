import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { APP_REFETCH } from '@/lib/constants';

export interface SwapBalancesData {
	coinBalance: number;
	coinBalanceRaw: bigint;
	coinAllowanceRaw: bigint;
	usduBalance: number;
	usduBalanceRaw: bigint;
	usduAllowanceRaw: bigint;
	isLoading: boolean;
	error: string | null;
	refetch: () => void;
}

/**
 * Hook to fetch a connected wallet's coin/USDU balances and their allowance to the swap router
 * @param coinAddress - The bridge module's source coin (e.g. USDC/USDT)
 * @param coinDecimals - Decimals of the source coin
 * @param ownerAddress - Connected wallet address
 * @param chainId - Chain ID to query (defaults to mainnet)
 */
export function useSwapBalances(
	coinAddress: `0x${string}` | undefined,
	coinDecimals: number,
	ownerAddress: `0x${string}` | undefined,
	chainId: number = mainnet.id
): SwapBalancesData {
	const addresses = chainId === mainnet.id ? ADDRESS[mainnet.id] : undefined;
	const routerAddress = addresses?.swapRouterV1 as `0x${string}` | undefined;
	const usduAddress = addresses?.usduStable as `0x${string}` | undefined;

	const contracts = useMemo(() => {
		if (!coinAddress || !ownerAddress || !routerAddress || !usduAddress) return [];
		return [
			{ address: coinAddress, abi: erc20Abi, functionName: 'balanceOf' as const, args: [ownerAddress] },
			{
				address: coinAddress,
				abi: erc20Abi,
				functionName: 'allowance' as const,
				args: [ownerAddress, routerAddress],
			},
			{ address: usduAddress, abi: erc20Abi, functionName: 'balanceOf' as const, args: [ownerAddress] },
			{
				address: usduAddress,
				abi: erc20Abi,
				functionName: 'allowance' as const,
				args: [ownerAddress, routerAddress],
			},
		];
	}, [coinAddress, ownerAddress, routerAddress, usduAddress]);

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
			usduBalance: 0,
			usduBalanceRaw: 0n,
			usduAllowanceRaw: 0n,
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
		const usduBalanceRaw = (data[2]?.result as bigint) ?? 0n;
		const usduAllowanceRaw = (data[3]?.result as bigint) ?? 0n;

		return {
			coinBalance: parseFloat(formatUnits(coinBalanceRaw, coinDecimals)),
			coinBalanceRaw,
			coinAllowanceRaw,
			usduBalance: parseFloat(formatUnits(usduBalanceRaw, 18)),
			usduBalanceRaw,
			usduAllowanceRaw,
			isLoading: false,
			error: null,
			refetch,
		};
	}, [data, isLoading, error, coinDecimals, refetch]);
}
