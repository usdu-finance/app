import { useEffect, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS, ICurveStableSwapNG_ABI } from '@usdu-finance/usdu-core';
import { APP_REFETCH } from '@/lib/constants';
import { USDC_MAINNET } from '@/lib/whitelisted-tokens';

interface ProtocolData {
	usduSupply: string | null;
	dexLiquidity: string | null;
	usduPrice: string | null;
	isLoading: boolean;
	error: string | null;
}

export function useProtocolData(): ProtocolData {
	const [protocolData, setProtocolData] = useState<ProtocolData>({
		usduSupply: null,
		dexLiquidity: null,
		usduPrice: null,
		isLoading: true,
		error: null,
	});

	const USDU = ADDRESS[mainnet.id].usduStable;
	const USDC = USDC_MAINNET;
	const poolAddress = ADDRESS[mainnet.id].curveStableSwapNG_USDCUSDU;

	// Contract read calls
	const { data, error, isLoading } = useReadContracts({
		contracts: [
			// USDU Total Supply
			{
				address: USDU,
				abi: erc20Abi,
				functionName: 'totalSupply',
			},
			// USDU balance in Curve pool (DEX Liquidity)
			{
				address: USDU,
				abi: erc20Abi,
				functionName: 'balanceOf',
				args: [poolAddress],
			},
			// USDC balance in Curve pool (for total liquidity calculation)
			{
				address: USDC,
				abi: erc20Abi,
				functionName: 'balanceOf',
				args: [poolAddress],
			},
			// USDU price from Curve (get_dy: from USDU to USDC, 1 USDU = ? USDC)
			{
				address: poolAddress,
				abi: ICurveStableSwapNG_ABI,
				functionName: 'get_dy',
				args: [1n, 0n, BigInt(1e18)], // from token 1 (USDU) to token 0 (USDC), 1 USDU (1e18 wei)
			},
		],
		query: {
			enabled: true,
			refetchInterval: APP_REFETCH,
		},
	});

	useEffect(() => {
		if (error) {
			setProtocolData((prev) => ({
				...prev,
				isLoading: false,
				error: error.message,
			}));
			return;
		}

		if (data && data.length === 4 && !isLoading) {
			try {
				const [usduSupplyResult, usduBalanceResult, usdcBalanceResult, priceResult] = data;

				// Calculate USDU supply (formatted from 6 decimals)
				const usduSupply = usduSupplyResult.result ? formatUnits(usduSupplyResult.result as bigint, 18) : null;

				// Calculate total DEX liquidity (USDU + USDC balance in pool)
				let dexLiquidity: string | null = null;
				if (usduBalanceResult.result && usdcBalanceResult.result) {
					const usduBalance = Number(formatUnits(usduBalanceResult.result as bigint, 18));
					const usdcBalance = Number(formatUnits(usdcBalanceResult.result as bigint, 6));
					dexLiquidity = (usduBalance + usdcBalance).toString();
				}

				// Calculate USDU price (how much USDC for 1 USDU)
				const usduPrice = priceResult.result ? formatUnits(priceResult.result as bigint, 6) : null;

				setProtocolData({
					usduSupply,
					dexLiquidity,
					usduPrice,
					isLoading: false,
					error: null,
				});
			} catch (err) {
				setProtocolData((prev) => ({
					...prev,
					isLoading: false,
					error: `Error processing data: ${err instanceof Error ? err.message : 'Unknown error'}`,
				}));
			}
		} else {
			setProtocolData((prev) => ({
				...prev,
				isLoading,
			}));
		}
	}, [data, error, isLoading]);

	return protocolData;
}
