import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { readContracts } from '@wagmi/core';
import { erc20Abi, formatUnits, parseEther, parseUnits } from 'viem';
import { ICurveStableSwapNG_ABI } from '@usdu-finance/usdu-core';
import { WAGMI_CONFIG } from '@/lib/web3/config';

export interface PoolConfig {
	key: string;
	poolAddress: `0x${string}`;
	adapterAddress: `0x${string}`;
}

export interface PoolData {
	usdcBalance: bigint;
	usduBalance: bigint;
	totalBalance: bigint;
	totalSupply: bigint;
	virtualPrice: bigint;
	adapterLPBalance: bigint;
	totalValue: number;
	usduPrice: number | null;
	poolImbalance: boolean;
	usdcRatio: number;
	usduRatio: number;
	adapterLPRatio: number;
}

// balances(0), balances(1), totalSupply, adapter balanceOf, get_dy, get_virtual_price
const CALLS_PER_POOL = 6;

// On-chain reads cached through Redux (and persisted via redux-persist) instead of
// component-local state, so navigating away/back or refreshing the page can paint
// instantly from cache while a background refetch confirms freshness.
export const onChainApi = createApi({
	reducerPath: 'onChainApi',
	baseQuery: fakeBaseQuery<string>(),
	endpoints: (builder) => ({
		// Takes the full pool registry (see hooks/usePoolModules.ts) and batches every pool's
		// reads into one multicall, mirroring useSwapModules' single-useReadContracts pattern.
		getPoolsData: builder.query<Record<string, PoolData>, PoolConfig[]>({
			async queryFn(pools) {
				try {
					const contracts = pools.flatMap(({ poolAddress, adapterAddress }) => [
						{ address: poolAddress, abi: ICurveStableSwapNG_ABI, functionName: 'balances' as const, args: [0n] }, // USDC (index 0)
						{ address: poolAddress, abi: ICurveStableSwapNG_ABI, functionName: 'balances' as const, args: [1n] }, // USDU (index 1)
						{ address: poolAddress, abi: ICurveStableSwapNG_ABI, functionName: 'totalSupply' as const },
						{ address: poolAddress, abi: erc20Abi, functionName: 'balanceOf' as const, args: [adapterAddress] },
						// USDU price from Curve (get_dy: from USDU to USDC, 1 USDU = ? USDC)
						{
							address: poolAddress,
							abi: ICurveStableSwapNG_ABI,
							functionName: 'get_dy' as const,
							args: [1n, 0n, BigInt(1e18)],
						},
						{ address: poolAddress, abi: ICurveStableSwapNG_ABI, functionName: 'get_virtual_price' as const },
					]);

					const results = await readContracts(WAGMI_CONFIG, { contracts });

					const allSuccess = results.every((result) => result.status === 'success');
					if (!allSuccess) {
						return { error: 'Some contract calls failed' };
					}

					const data: Record<string, PoolData> = {};

					pools.forEach((pool, index) => {
						const base = index * CALLS_PER_POOL;
						const usdcBalance = results[base].result as bigint;
						const usduBalance = results[base + 1].result as bigint;
						const totalSupply = results[base + 2].result as bigint;
						const adapterLPBalance = results[base + 3].result as bigint;
						const priceResult = results[base + 4].result as bigint | undefined;
						const virtualPrice = results[base + 5].result as bigint;

						// Calculate USDU price (how much USDC for 1 USDU)
						const usduPrice = priceResult ? parseFloat(formatUnits(priceResult, 6)) : null;

						// Calculate ratio for adapter
						const adapterLPRatio = parseFloat(formatUnits((adapterLPBalance * parseEther('1')) / totalSupply, 18));

						// Calculate pool imbalance (check if USDU > 50% of pool)
						const totalBalance = BigInt(parseUnits(String(usdcBalance), 18 - 6)) + usduBalance; // Assuming 1:1 value ratio
						const totalValue = parseFloat(formatUnits(totalBalance, 18));
						const usdcRatio =
							totalBalance > 0n ? parseFloat(formatUnits((usdcBalance * parseEther('1')) / totalBalance, 6)) : 0;
						const usduRatio = 1 - usdcRatio;
						const poolImbalance = usduRatio > 0.5;

						data[pool.key] = {
							usdcBalance,
							usduBalance,
							totalBalance,
							totalSupply,
							adapterLPBalance,
							adapterLPRatio,
							poolImbalance,
							totalValue,
							usduRatio,
							usdcRatio,
							usduPrice,
							virtualPrice,
						};
					});

					return { data };
				} catch (err) {
					return { error: err instanceof Error ? err.message : 'Unknown error occurred' };
				}
			},
		}),
	}),
});

export const { useGetPoolsDataQuery } = onChainApi;
