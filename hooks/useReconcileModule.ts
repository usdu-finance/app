import { useCallback, useEffect, useRef } from 'react';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ISwapBridgeMorphoV1_ABI } from '@usdu-finance/usdu-core';

export interface ReconcileModuleData {
	/** Recognizes the module's accrued yield as revenue, which is minted to the curator. Permissionless, but only once per stablecoin timelock. */
	reconcile: (module: `0x${string}`) => Promise<`0x${string}`>;
	isPending: boolean;
	isConfirming: boolean;
}

/**
 * Hook to reconcile a bridge module (IModuleRevenueV1.reconcile) and track confirmation, with toast feedback.
 * Refreshes the on-chain reads once it confirms, so the unclaimed amount and the last reconcile update.
 */
export function useReconcileModule(): ReconcileModuleData {
	const queryClient = useQueryClient();
	const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
	const toastIdRef = useRef<string | undefined>(undefined);

	const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

	useEffect(() => {
		if (!isConfirmed) return;
		toast.success('Revenue claimed', { id: toastIdRef.current });
		queryClient.invalidateQueries({ queryKey: ['readContracts'] });
		reset();
	}, [isConfirmed, queryClient, reset]);

	const reconcile = useCallback(
		async (module: `0x${string}`) => {
			try {
				const txHash = await writeContractAsync({
					address: module,
					abi: ISwapBridgeMorphoV1_ABI,
					functionName: 'reconcile',
					args: [],
				});
				toastIdRef.current = toast.loading('Confirming claim...');
				return txHash;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Claim failed');
				throw err;
			}
		},
		[writeContractAsync]
	);

	return { reconcile, isPending, isConfirming };
}
