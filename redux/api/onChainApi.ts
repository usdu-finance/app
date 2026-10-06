import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { readContracts } from '@wagmi/core';
import { erc20Abi, formatUnits, parseEther, parseUnits } from 'viem';
import { ICurveStableSwapNG_ABI, ITwocrypto_ABI } from '@usdu-finance/usdu-core';
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

export type CurvePoolKind = 'stable' | 'twocrypto';

export interface CurvePoolConfig {
	key: string;
	poolAddress: `0x${string}`;
	kind: CurvePoolKind;
	decimals: [number, number];
}

export interface CurvePoolData {
	balances: [bigint, bigint];
	totalSupply: bigint;
	priceScale: bigint; // value of 1 coin1 in coin0 terms (1e18 for stable pools)
	totalValue: number; // in USD-equivalent (stable pools 1:1, twocrypto coin0 is USDU)
	ratios: [number, number];
	price: number; // live quote of 1 coin1 in coin0 (get_dy), falls back to priceScale when the pool cannot quote
}

// balances(0), balances(1), totalSupply, price_scale (twocrypto only, stable pools re-read totalSupply), get_dy(1 -> 0)
const CALLS_PER_CURVE_POOL = 5;

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
		// Generic Curve pool stats for the swap pages; stable (StableSwapNG) and twocrypto pools alike.
		getCurvePoolsData: builder.query<Record<string, CurvePoolData>, CurvePoolConfig[]>({
			async queryFn(pools) {
				try {
					const contracts = pools.flatMap(({ poolAddress, kind, decimals }) => {
						const abi = kind === 'stable' ? ICurveStableSwapNG_ABI : ITwocrypto_ABI;
						return [
							{ address: poolAddress, abi, functionName: 'balances' as const, args: [0n] },
							{ address: poolAddress, abi, functionName: 'balances' as const, args: [1n] },
							{ address: poolAddress, abi, functionName: 'totalSupply' as const },
							// stable pools have no price_scale; get_virtual_price is a harmless placeholder read
							kind === 'stable'
								? { address: poolAddress, abi: ICurveStableSwapNG_ABI, functionName: 'get_virtual_price' as const }
								: { address: poolAddress, abi: ITwocrypto_ABI, functionName: 'price_scale' as const },
							{ address: poolAddress, abi, functionName: 'get_dy' as const, args: [1n, 0n, 10n ** BigInt(decimals[1])] },
						];
					});

					const results = await readContracts(WAGMI_CONFIG, { contracts });

					// get_dy may revert on an empty pool; only the first four reads per pool are required
					const required = results.filter((_, i) => i % CALLS_PER_CURVE_POOL !== CALLS_PER_CURVE_POOL - 1);
					if (!required.every((result) => result.status === 'success')) {
						return { error: 'Some contract calls failed' };
					}

					const data: Record<string, CurvePoolData> = {};

					pools.forEach((pool, index) => {
						const base = index * CALLS_PER_CURVE_POOL;
						const balance0 = results[base].result as bigint;
						const balance1 = results[base + 1].result as bigint;
						const totalSupply = results[base + 2].result as bigint;
						const priceScale = pool.kind === 'twocrypto' ? (results[base + 3].result as bigint) : parseEther('1');

						const dy = results[base + 4];
						const price =
							dy.status === 'success'
								? parseFloat(formatUnits(dy.result as bigint, pool.decimals[0]))
								: parseFloat(formatUnits(priceScale, 18));

						const value0 = parseFloat(formatUnits(balance0, pool.decimals[0]));
						// Twocrypto pools are valued at the live market quote (the price shown in the tables) rather than the
						// pool's internal price_scale, which lags the market; stable pools are valued 1:1
						const value1Price = pool.kind === 'twocrypto' ? price : 1;
						const value1 = parseFloat(formatUnits(balance1, pool.decimals[1])) * value1Price;
						const totalValue = value0 + value1;

						data[pool.key] = {
							balances: [balance0, balance1],
							totalSupply,
							priceScale,
							totalValue,
							price,
							ratios: totalValue > 0 ? [value0 / totalValue, value1 / totalValue] : [0, 0],
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

export const { useGetPoolsDataQuery, useGetCurvePoolsDataQuery } = onChainApi;
