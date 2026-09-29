import { useCallback, useEffect, useRef } from 'react';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { erc20Abi } from 'viem';
import toast from 'react-hot-toast';
import { ICurveStableSwapNG_ABI, ITwocrypto_ABI } from '@usdu-finance/usdu-core';
import type { CurvePoolKind } from '@/redux/api/onChainApi';

export interface CurveLiquidityData {
	approve: (token: `0x${string}`, spender: `0x${string}`, amount: bigint) => Promise<`0x${string}`>;
	addLiquidity: (kind: CurvePoolKind, pool: `0x${string}`, amounts: readonly [bigint, bigint], minMint: bigint) => Promise<`0x${string}`>;
	removeLiquidity: (
		kind: CurvePoolKind,
		pool: `0x${string}`,
		amount: bigint,
		minAmounts: readonly [bigint, bigint]
	) => Promise<`0x${string}`>;
	isPending: boolean;
	isConfirming: boolean;
	isConfirmed: boolean;
	error: string | null;
	reset: () => void;
}

/**
 * Hook to send Curve liquidity transactions (ERC20 approve, add_liquidity, remove_liquidity) and track
 * confirmation. StableSwapNG and Twocrypto pools have different ABIs; the pool kind selects the right one.
 * @returns Write actions plus pending/confirming/confirmed status, with toast feedback
 */
export function useCurveLiquidity(): CurveLiquidityData {
	const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
	const toastIdRef = useRef<string | undefined>(undefined);

	const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

	useEffect(() => {
		if (isConfirmed) {
			toast.success('Transaction confirmed', { id: toastIdRef.current });
		}
	}, [isConfirmed]);

	const approve = useCallback(
		async (token: `0x${string}`, spender: `0x${string}`, amount: bigint) => {
			try {
				const txHash = await writeContractAsync({
					address: token,
					abi: erc20Abi,
					functionName: 'approve',
					args: [spender, amount],
				});
				toastIdRef.current = toast.loading('Confirming approval...');
				return txHash;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Approval failed');
				throw err;
			}
		},
		[writeContractAsync]
	);

	const addLiquidity = useCallback(
		async (kind: CurvePoolKind, pool: `0x${string}`, amounts: readonly [bigint, bigint], minMint: bigint) => {
			try {
				const txHash =
					kind === 'stable'
						? await writeContractAsync({
								address: pool,
								abi: ICurveStableSwapNG_ABI,
								functionName: 'add_liquidity',
								args: [[...amounts], minMint],
							})
						: await writeContractAsync({
								address: pool,
								abi: ITwocrypto_ABI,
								functionName: 'add_liquidity',
								args: [amounts, minMint],
							});
				toastIdRef.current = toast.loading('Confirming deposit...');
				return txHash;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Deposit failed');
				throw err;
			}
		},
		[writeContractAsync]
	);

	const removeLiquidity = useCallback(
		async (kind: CurvePoolKind, pool: `0x${string}`, amount: bigint, minAmounts: readonly [bigint, bigint]) => {
			try {
				const txHash =
					kind === 'stable'
						? await writeContractAsync({
								address: pool,
								abi: ICurveStableSwapNG_ABI,
								functionName: 'remove_liquidity',
								args: [amount, [...minAmounts]],
							})
						: await writeContractAsync({
								address: pool,
								abi: ITwocrypto_ABI,
								functionName: 'remove_liquidity',
								args: [amount, minAmounts],
							});
				toastIdRef.current = toast.loading('Confirming withdrawal...');
				return txHash;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Withdrawal failed');
				throw err;
			}
		},
		[writeContractAsync]
	);

	return {
		approve,
		addLiquidity,
		removeLiquidity,
		isPending,
		isConfirming,
		isConfirmed,
		error: error?.message ?? null,
		reset,
	};
}
