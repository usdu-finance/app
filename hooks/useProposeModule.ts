import { useCallback, useEffect, useRef } from 'react';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import toast from 'react-hot-toast';
import { Stablecoin_ABI } from '@usdu-finance/usdu-core';

/** Fee of a public module proposal, paid in the stablecoin to its curator (ConstantsLib.PUBLIC_FEE). */
export const PUBLIC_PROPOSAL_FEE = 10_000n * 10n ** 18n;

export interface ProposeModuleData {
	/** Proposes `module` on `stablecoin` until `expiredAt` (unix seconds), paying the public fee. The stablecoin moves the fee itself, no approval needed. */
	propose: (stablecoin: `0x${string}`, module: `0x${string}`, expiredAt: bigint, message: string) => Promise<`0x${string}`>;
	isPending: boolean;
	isConfirming: boolean;
	isConfirmed: boolean;
	reset: () => void;
}

/**
 * Hook to propose a module through Stablecoin.setModulePublic and track confirmation, with toast feedback.
 * The proposal then waits out twice the stablecoin's timelock before anyone can accept it.
 */
export function useProposeModule(): ProposeModuleData {
	const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
	const toastIdRef = useRef<string | undefined>(undefined);

	const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

	useEffect(() => {
		if (isConfirmed) toast.success('Module proposed', { id: toastIdRef.current });
	}, [isConfirmed]);

	const propose = useCallback(
		async (stablecoin: `0x${string}`, module: `0x${string}`, expiredAt: bigint, message: string) => {
			try {
				const txHash = await writeContractAsync({
					address: stablecoin,
					abi: Stablecoin_ABI,
					functionName: 'setModulePublic',
					args: [module, expiredAt, message, PUBLIC_PROPOSAL_FEE],
				});
				toastIdRef.current = toast.loading('Confirming proposal...');
				return txHash;
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Proposal failed');
				throw err;
			}
		},
		[writeContractAsync]
	);

	return { propose, isPending, isConfirming, isConfirmed, reset };
}
