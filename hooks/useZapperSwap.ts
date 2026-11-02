import { useCallback, useEffect, useRef } from 'react';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { erc20Abi } from 'viem';
import toast from 'react-hot-toast';
import { ZapperSwapEnsoV1_ABI } from '@usdu-finance/usdu-core';
import { ZAPPER_SWAP_ADDRESS } from '@/lib/constants';

/** A step in ZapperSwapEnsoV1's encoding, as returned by /api/zap/quote (numbers arrive as strings over JSON). */
export interface ZapperSwapStepJson {
	kind: number;
	target: `0x${string}`;
	module: `0x${string}`;
	tokenIn: `0x${string}`;
	tokenOut: `0x${string}`;
	amountIn: string;
	minOut: string;
	i: number;
	j: number;
	value: string;
	data: `0x${string}`;
}

export interface ZapperSwapData {
	/** Whether a zapper address is configured; without one the zap card can only preview routes. */
	isAvailable: boolean;
	approve: (token: `0x${string}`, amount: bigint) => Promise<`0x${string}`>;
	zap: (args: {
		tokenIn: `0x${string}`;
		amountIn: bigint;
		steps: ZapperSwapStepJson[];
		tokenOut: `0x${string}`;
		minAmountOut: bigint;
		recipient: `0x${string}`;
		/** ETH to send along; only for a native-ETH input, where it must equal amountIn. */
		value?: bigint;
	}) => Promise<`0x${string}`>;
	isPending: boolean;
	isConfirming: boolean;
	isConfirmed: boolean;
	reset: () => void;
}

/**
 * Hook to approve the zapper and send a zap, tracking confirmation with toast feedback
 * @returns approve/zap actions plus pending/confirming/confirmed status
 */
export function useZapperSwap(): ZapperSwapData {
	const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
	const toastIdRef = useRef<string | undefined>(undefined);

	const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

	useEffect(() => {
		if (isConfirmed) toast.success('Transaction confirmed', { id: toastIdRef.current });
	}, [isConfirmed]);

	const approve = useCallback(
		async (token: `0x${string}`, amount: bigint) => {
			if (!ZAPPER_SWAP_ADDRESS) throw new Error('Zapper is not deployed yet');
			try {
				const txHash = await writeContractAsync({
					address: token,
					abi: erc20Abi,
					functionName: 'approve',
					args: [ZAPPER_SWAP_ADDRESS, amount],
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

	const zap = useCallback<ZapperSwapData['zap']>(
		async ({ tokenIn, amountIn, steps, tokenOut, minAmountOut, recipient, value }) => {
			if (!ZAPPER_SWAP_ADDRESS) throw new Error('Zapper is not deployed yet');
			try {
				const txHash = await writeContractAsync({
					address: ZAPPER_SWAP_ADDRESS,
					abi: ZapperSwapEnsoV1_ABI,
					functionName: 'zap',
					args: [
						tokenIn,
						amountIn,
						steps.map((s) => ({ ...s, amountIn: BigInt(s.amountIn), minOut: BigInt(s.minOut), value: BigInt(s.value) })),
						tokenOut,
						minAmountOut,
						recipient,
					],
					value,
				});
				toastIdRef.current = toast.loading('Confirming zap...');
				return txHash;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Zap failed');
				throw err;
			}
		},
		[writeContractAsync]
	);

	return { isAvailable: !!ZAPPER_SWAP_ADDRESS, approve, zap, isPending, isConfirming, isConfirmed, reset };
}
