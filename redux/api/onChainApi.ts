import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { readContracts } from '@wagmi/core';
import { erc20Abi, formatUnits, parseEther, parseUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS, ICurveStableSwapNG_ABI } from '@usdu-finance/usdu-core';
import { WAGMI_CONFIG } from '@/lib/web3/config';
import { USDU_CURVE_ADAPTER_V1_1_USDC_2 } from '@/lib/whitelisted-tokens';

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

// On-chain reads cached through Redux (and persisted via redux-persist) instead of
// component-local state, so navigating away/back or refreshing the page can paint
// instantly from cache while a background refetch confirms freshness.
export const onChainApi = createApi({
	reducerPath: 'onChainApi',
	baseQuery: fakeBaseQuery<string>(),
	endpoints: (builder) => ({
		getPoolData: builder.query<PoolData, void>({
			async queryFn() {
				try {
					const poolAddress = ADDRESS[mainnet.id].curveStableSwapNG_USDCUSDU;
					const adapterAddress = USDU_CURVE_ADAPTER_V1_1_USDC_2;

					const results = await readContracts(WAGMI_CONFIG, {
						contracts: [
							// Pool balances
							{ address: poolAddress, abi: ICurveStableSwapNG_ABI, functionName: 'balances', args: [0n] }, // USDC (index 0)
							{ address: poolAddress, abi: ICurveStableSwapNG_ABI, functionName: 'balances', args: [1n] }, // USDU (index 1)
							// LP token total supply
							{ address: poolAddress, abi: ICurveStableSwapNG_ABI, functionName: 'totalSupply' },
							// Adapter LP balance
							{ address: poolAddress, abi: erc20Abi, functionName: 'balanceOf', args: [adapterAddress] },
							// USDU price from Curve (get_dy: from USDU to USDC, 1 USDU = ? USDC)
							{
								address: poolAddress,
								abi: ICurveStableSwapNG_ABI,
								functionName: 'get_dy',
								args: [1n, 0n, BigInt(1e18)],
							},
							// Virtual Price for LP
							{ address: poolAddress, abi: ICurveStableSwapNG_ABI, functionName: 'get_virtual_price' },
						],
					});

					const [usdcBalanceResult, usduBalanceResult, totalSupplyResult, adapterLPResult, priceResult, virtualPriceResult] =
						results;

					const allSuccess = results.every((result) => result.status === 'success');
					if (!allSuccess) {
						return { error: 'Some contract calls failed' };
					}

					const usdcBalance = usdcBalanceResult.result as bigint;
					const usduBalance = usduBalanceResult.result as bigint;
					const totalSupply = totalSupplyResult.result as bigint;
					const adapterLPBalance = adapterLPResult.result as bigint;
					const virtualPrice = virtualPriceResult.result as bigint;

					// Calculate USDU price (how much USDC for 1 USDU)
					const usduPrice = priceResult.result ? parseFloat(formatUnits(priceResult.result as bigint, 6)) : null;

					// Calculate ratio for adapter
					const adapterLPRatio = parseFloat(formatUnits((adapterLPBalance * parseEther('1')) / totalSupply, 18));

					// Calculate pool imbalance (check if USDU > 50% of pool)
					const totalBalance = BigInt(parseUnits(String(usdcBalance), 18 - 6)) + usduBalance; // Assuming 1:1 value ratio
					const totalValue = parseFloat(formatUnits(totalBalance, 18));
					const usdcRatio =
						totalBalance > 0n ? parseFloat(formatUnits((usdcBalance * parseEther('1')) / totalBalance, 6)) : 0;
					const usduRatio = 1 - usdcRatio;
					const poolImbalance = usduRatio > 0.5;

					return {
						data: {
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
						},
					};
				} catch (err) {
					return { error: err instanceof Error ? err.message : 'Unknown error occurred' };
				}
			},
		}),
	}),
});

export const { useGetPoolDataQuery } = onChainApi;
