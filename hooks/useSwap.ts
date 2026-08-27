import { useCallback, useEffect, useRef } from 'react';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { erc20Abi } from 'viem';
import toast from 'react-hot-toast';
import { ISwapRouterV1_ABI } from '@usdu-finance/usdu-core';

export interface SwapData {
	approve: (token: `0x${string}`, spender: `0x${string}`, amount: bigint) => Promise<`0x${string}`>;
	swapIn: (router: `0x${string}`, module: `0x${string}`, amount: bigint) => Promise<`0x${string}`>;
	swapOut: (router: `0x${string}`, module: `0x${string}`, amount: bigint) => Promise<`0x${string}`>;
	isPending: boolean;
	isConfirming: boolean;
	isConfirmed: boolean;
	error: string | null;
	reset: () => void;
}

/**
 * Hook to send swap-router transactions (ERC20 approve, swapIn, swapOut) and track confirmation
 * @returns Write actions plus pending/confirming/confirmed status, with toast feedback
 */
export function useSwap(): SwapData {
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

	const swapIn = useCallback(
		async (router: `0x${string}`, module: `0x${string}`, amount: bigint) => {
			try {
				const txHash = await writeContractAsync({
					address: router,
					abi: ISwapRouterV1_ABI,
					functionName: 'swapIn',
					args: [module, amount],
				});
				toastIdRef.current = toast.loading('Confirming swap...');
				return txHash;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Swap failed');
				throw err;
			}
		},
		[writeContractAsync]
	);

	const swapOut = useCallback(
		async (router: `0x${string}`, module: `0x${string}`, amount: bigint) => {
			try {
				const txHash = await writeContractAsync({
					address: router,
					abi: ISwapRouterV1_ABI,
					functionName: 'swapOut',
					args: [module, amount],
				});
				toastIdRef.current = toast.loading('Confirming swap...');
				return txHash;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Swap failed');
				throw err;
			}
		},
		[writeContractAsync]
	);

	return {
		approve,
		swapIn,
		swapOut,
		isPending,
		isConfirming,
		isConfirmed,
		error: error?.message ?? null,
		reset,
	};
}
