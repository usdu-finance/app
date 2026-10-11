import { useCallback, useEffect, useRef } from 'react';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { mainnet } from 'viem/chains';
import toast from 'react-hot-toast';
import { StreamerVaultV1_ABI } from '@usdu-finance/usdu-core';

export interface StreamerVaultActions {
	approve: (asset: `0x${string}`, vault: `0x${string}`, amount: bigint) => Promise<`0x${string}`>;
	deposit: (vault: `0x${string}`, assets: bigint, receiver: `0x${string}`) => Promise<`0x${string}`>;
	redeem: (vault: `0x${string}`, shares: bigint, receiver: `0x${string}`) => Promise<`0x${string}`>;
	isPending: boolean;
	isConfirming: boolean;
	isConfirmed: boolean;
	error: string | null;
	reset: () => void;
}

/**
 * Hook to send StreamerVaultV1 transactions (approve, deposit, redeem) and track confirmation
 * @returns Write actions plus pending/confirming/confirmed status, with toast feedback
 */
export function useStreamerVault(): StreamerVaultActions {
	const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
	const toastIdRef = useRef<string | undefined>(undefined);

	const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

	useEffect(() => {
		if (isConfirmed) {
			toast.success('Transaction confirmed', { id: toastIdRef.current });
		}
	}, [isConfirmed]);

	const approve = useCallback(
		async (asset: `0x${string}`, vault: `0x${string}`, amount: bigint) => {
			try {
				const txHash = await writeContractAsync({
					chainId: mainnet.id,
					address: asset,
					abi: erc20Abi,
					functionName: 'approve',
					args: [vault, amount],
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

	const deposit = useCallback(
		async (vault: `0x${string}`, assets: bigint, receiver: `0x${string}`) => {
			try {
				const txHash = await writeContractAsync({
					chainId: mainnet.id,
					address: vault,
					abi: StreamerVaultV1_ABI,
					functionName: 'deposit',
					args: [assets, receiver],
				});
				toastIdRef.current = toast.loading('Confirming stake...');
				return txHash;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Stake failed');
				throw err;
			}
		},
		[writeContractAsync]
	);

	const redeem = useCallback(
		async (vault: `0x${string}`, shares: bigint, receiver: `0x${string}`) => {
			try {
				const txHash = await writeContractAsync({
					chainId: mainnet.id,
					address: vault,
					abi: StreamerVaultV1_ABI,
					functionName: 'redeem',
					args: [shares, receiver, receiver],
				});
				toastIdRef.current = toast.loading('Confirming unstake...');
				return txHash;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Unstake failed');
				throw err;
			}
		},
		[writeContractAsync]
	);

	return { approve, deposit, redeem, isPending, isConfirming, isConfirmed, error: error?.message ?? null, reset };
}
