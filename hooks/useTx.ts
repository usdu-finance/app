import { useCallback, useSyncExternalStore } from 'react';
import { useAccount, useChainId, useConfig } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { runBatch } from '@/lib/tx/send';
import { txStore } from '@/lib/tx/store';
import type { TxBatch, TxCall } from '@/lib/tx/types';

export interface SubmitOptions {
	title: string;
	chainId?: number;
	/** Runs once every call is confirmed, e.g. to clear a form. Balances are refetched already. */
	onConfirmed?: () => void;
}

export interface TxData {
	/**
	 * Sends the calls as one batch: a single wallet bundle where the wallet can (Safe, smart wallets), else
	 * one signed transaction per call with consecutive nonces. Resolves once the wallet accepted them, not
	 * when they confirm, and rejects if the user declines. Falsy entries are skipped, so a conditional
	 * approval can sit inline: `submit([needsApproval && approveCall(...), swapCall(...)], ...)`.
	 */
	submit: (calls: (TxCall | false | null | undefined)[], options: SubmitOptions) => Promise<void>;
	/** Batches that were sent and are not finished yet. */
	batches: TxBatch[];
	/** The wallet is asking for a signature. Only this blocks a form, a pending confirmation does not. */
	isSigning: boolean;
	/** Number of calls waiting for their confirmation. */
	pendingCount: number;
}

const ONCHAIN_READS = ['readContract', 'readContracts', 'onchain'];

/**
 * Optimistic transaction layer: calls are handed to the wallet right away and confirmed in the background,
 * so several swaps, approvals and deposits can be in flight at the same time.
 */
export function useTx(): TxData {
	const config = useConfig();
	const { address } = useAccount();
	const connectedChainId = useChainId();
	const queryClient = useQueryClient();
	const batches = useSyncExternalStore(txStore.subscribe, txStore.getSnapshot, txStore.getServerSnapshot);

	const submit = useCallback<TxData['submit']>(
		async (calls, { title, chainId, onConfirmed }) => {
			if (!address) throw new Error('Wallet not connected');
			await runBatch({
				config,
				account: address,
				chainId: chainId ?? connectedChainId,
				calls: calls.filter((c): c is TxCall => !!c),
				title,
				onConfirmed: () => {
					// refetch every on-chain read, so balances, allowances and positions are fresh
					queryClient.invalidateQueries({ predicate: (q) => ONCHAIN_READS.includes(q.queryKey[0] as string) });
					onConfirmed?.();
				},
			});
		},
		[config, address, connectedChainId, queryClient]
	);

	const open = batches.filter((b) => b.status === 'signing' || b.status === 'pending');
	return {
		submit,
		batches: open,
		isSigning: open.some((b) => b.status === 'signing'),
		pendingCount: open.reduce((n, b) => n + b.items.filter((it) => it.status === 'submitted').length, 0),
	};
}
