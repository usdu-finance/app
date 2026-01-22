import { useState, useEffect } from 'react';
import { useReadContracts } from 'wagmi';
import { ICurveStableSwapNG } from '@/lib/abis/curve/ICurveStableSwapNG';
import { erc20Abi, formatUnits, parseEther, parseUnits } from 'viem';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { mainnet } from 'viem/chains';
import { APP_REFETCH } from '@/lib/constants';

interface PoolData {
	// Pool balances
	usdcBalance: bigint | null;
	usduBalance: bigint | null;
	totalBalance: bigint | null;

	// LP token info
	totalSupply: bigint | null;
	virtualPrice: bigint | null;
	adapterLPBalance: bigint | null;

	// Pool stats
	totalValue: number | null;
	usduPrice: number | null;
	poolImbalance: boolean | null;
	usdcRatio: number | null;
	usduRatio: number | null;
	adapterLPRatio: number | null;

	// Loading states
	isLoading: boolean;
	error: string | null;
}

export function usePoolData(): PoolData {
	const [poolData, setPoolData] = useState<PoolData>({
		usdcBalance: null,
		usduBalance: null,
		totalBalance: null,
		totalSupply: null,
		adapterLPBalance: null,
		virtualPrice: null,
		totalValue: null,
		usduPrice: null,
		poolImbalance: null,
		usdcRatio: null,
		usduRatio: null,
		adapterLPRatio: null,
		isLoading: true,
		error: null,
	});

	const poolAddress = ADDRESS[mainnet.id].curveStableSwapNG_USDUUSDC_2;
	const adapterAddress = ADDRESS[mainnet.id].usduCurveAdapterV1_1_USDC_2;

	// Contract read calls
	const { data, isError, isLoading } = useReadContracts({
		contracts: [
			// Pool balances
			{
				address: poolAddress,
				abi: ICurveStableSwapNG,
				functionName: 'balances',
				args: [0n], // USDC balance (index 0)
			},
			{
				address: poolAddress,
				abi: ICurveStableSwapNG,
				functionName: 'balances',
				args: [1n], // USDU balance (index 1)
			},
			// LP token total supply
			{
				address: poolAddress,
				abi: ICurveStableSwapNG,
				functionName: 'totalSupply',
			},
			// Adapter LP balance
			{
				address: poolAddress,
				abi: erc20Abi,
				functionName: 'balanceOf',
				args: [adapterAddress],
			},
			// USDU price from Curve (get_dy: from USDU to USDC, 1 USDU = ? USDC)
			{
				address: poolAddress,
				abi: ICurveStableSwapNG,
				functionName: 'get_dy',
				args: [1n, 0n, BigInt(1e18)], // from token 1 (USDU) to token 0 (USDC), 1 USDU (1e18 wei)
			},
			// Virtual Price for LP
			{
				address: poolAddress,
				abi: ICurveStableSwapNG,
				functionName: 'get_virtual_price',
			},
		],
		query: {
			refetchInterval: APP_REFETCH,
		},
	});

	useEffect(() => {
		if (isLoading) {
			setPoolData((prev) => ({ ...prev, isLoading: true, error: null }));
			return;
		}

		if (isError || !data) {
			setPoolData((prev) => ({
				...prev,
				isLoading: false,
				error: 'Failed to fetch pool data',
			}));
			return;
		}

		const [
			usdcBalanceResult,
			usduBalanceResult,
			totalSupplyResult,
			adapterLPResult,
			priceResult,
			virtualPriceResult,
		] = data;

		// Check if all calls succeeded
		const allSuccess = [
			usdcBalanceResult,
			usduBalanceResult,
			totalSupplyResult,
			adapterLPResult,
			priceResult,
			virtualPriceResult,
		].every((result) => result.status === 'success');

		if (!allSuccess) {
			setPoolData((prev) => ({
				...prev,
				isLoading: false,
				error: 'Some contract calls failed',
			}));
			return;
		}

		const usdcBalance = usdcBalanceResult.result as bigint;
		const usduBalance = usduBalanceResult.result as bigint;
		const totalSupply = totalSupplyResult.result as bigint;
		const adapterLPBalance = adapterLPResult.result as bigint;

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

		// Virtual Price calculation
		const virtualPrice = virtualPriceResult.result as bigint;

		setPoolData({
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
			isLoading: false,
			error: null,
		});
	}, [data, isError, isLoading]);

	return poolData;
}
