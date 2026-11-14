import { encodeFunctionData, type Hex } from 'viem';
import {
	estimateGas,
	getCapabilities,
	getTransactionCount,
	sendCalls,
	sendTransaction,
	waitForCallsStatus,
	waitForTransactionReceipt,
	type Config,
} from '@wagmi/core';
import toast from 'react-hot-toast';
import { txStore } from './store';
import { notificationStore } from '@/lib/notifications/store';
import type { TxBatch, TxCall, TxItem, TxMode } from './types';

/** Gas for a call that cannot be estimated yet, because it depends on a call in front of it (e.g. a swap after its approval). */
const FALLBACK_GAS = 600_000n;
/** A Safe bundle waits for the other owners to sign, so the wait for its receipts is long. */
const BUNDLE_TIMEOUT = 7 * 24 * 60 * 60 * 1000;

export interface RunBatchParams {
	config: Config;
	account: `0x${string}`;
	chainId: number;
	calls: TxCall[];
	title: string;
	/** Runs once every call of the batch is confirmed. */
	onConfirmed?: () => void;
}

const isRejection = (err: unknown) => /user (rejected|denied)|rejected the request|denied transaction/i.test(String((err as Error)?.message ?? err));

export function formatTxError(err: unknown): string {
	if (isRejection(err)) return 'Transaction was rejected';
	const message = err instanceof Error ? ((err as { shortMessage?: string }).shortMessage ?? err.message) : String(err);
	return message.split('\n')[0]!.slice(0, 160);
}

// EIP-5792 atomic batches only where the wallet supports them as is (Safe, smart wallets). 'ready' would
// ask the user to upgrade a plain account, that is not something to trigger from a swap button.
async function supportsAtomic(config: Config, account: `0x${string}`, chainId: number): Promise<boolean> {
	try {
		const caps = await getCapabilities(config, { account, chainId });
		return caps[chainId]?.atomic?.status === 'supported';
	} catch {
		return false; // plain wallets reject wallet_getCapabilities
	}
}

/**
 * Sends the calls as one batch and resolves as soon as the wallet accepted all of them (not when they
 * confirm), so the caller is free to start the next one. Confirmations are tracked in the background,
 * `onConfirmed` and the toast report the result. Rejects if the user declines a call.
 */
export async function runBatch({ config, account, chainId, calls, title, onConfirmed }: RunBatchParams): Promise<void> {
	if (calls.length === 0) return;

	const atomic = calls.length > 1 && (await supportsAtomic(config, account, chainId));
	const mode: TxMode = atomic ? 'atomic' : 'queue';

	const batch: TxBatch = {
		id: crypto.randomUUID(),
		title,
		mode,
		items: calls.map((c): TxItem => ({ label: c.label, status: 'waiting' })),
		status: 'signing',
	};
	const toastId = toast.loading(`${title}: confirm in your wallet...`);

	const update = (patch: Partial<TxBatch>, itemPatch?: (items: TxItem[]) => TxItem[]) => {
		batch.items = itemPatch ? itemPatch(batch.items) : batch.items;
		Object.assign(batch, patch);
		txStore.upsert({ ...batch, items: [...batch.items] });
	};
	const setItem = (i: number, patch: Partial<TxItem>) =>
		update({}, (items) => items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
	const fail = (error: string) => {
		update({ status: 'failed', error }, (items) =>
			items.map((it) => (it.status === 'confirmed' ? it : { ...it, status: it.status === 'waiting' ? 'skipped' : 'failed' }))
		);
		toast.error(`${title}: ${error}`, { id: toastId });
		notificationStore.push({ kind: 'tx', title: `${title} failed`, text: error });
	};
	const progress = () => {
		const done = batch.items.filter((it) => it.status === 'confirmed').length;
		toast.loading(`${title}: ${done}/${batch.items.length} confirmed`, { id: toastId });
	};
	const settle = () => {
		update({ status: 'confirmed' });
		toast.success(`${title}: confirmed`, { id: toastId });
		notificationStore.push({ kind: 'tx', title: `${title} confirmed` });
		onConfirmed?.();
	};

	update({});

	const data = calls.map((c) => encodeFunctionData({ abi: c.abi, functionName: c.functionName, args: c.args }));

	try {
		if (atomic) {
			update({}, (items) => items.map((it) => ({ ...it, status: 'signing' })));
			const { id } = await sendCalls(config, {
				chainId,
				account,
				calls: calls.map((c, i) => ({ to: c.address, data: data[i] as Hex, value: c.value })),
				forceAtomic: true,
			});
			update({ status: 'pending' }, (items) => items.map((it) => ({ ...it, status: 'submitted' })));
			toast.loading(`${title}: waiting for confirmation...`, { id: toastId });

			// tracked in the background, the caller is released already
			void waitForCallsStatus(config, { id, timeout: BUNDLE_TIMEOUT, pollingInterval: 2_000 })
				.then((result) => {
					if (result.status === 'success') {
						update({}, (items) => items.map((it) => ({ ...it, status: 'confirmed' })));
						settle();
					} else {
						fail('Transaction reverted');
					}
				})
				.catch((err) => fail(formatTxError(err)));
			return;
		}

		// queue: sign all, consecutive nonces, no waiting for receipts in between
		const baseNonce = await getTransactionCount(config, { address: account, blockTag: 'pending', chainId });
		const hashes: Hex[] = [];

		for (let i = 0; i < calls.length; i++) {
			const call = calls[i]!;
			setItem(i, { status: 'signing' });

			// the first call is estimated by the wallet itself so a revert shows up there. Later ones may
			// depend on the earlier ones, which are not mined yet, so they fall back to a fixed limit.
			let gas = call.gas;
			if (gas === undefined && i > 0) {
				gas = await estimateGas(config, { account, chainId, to: call.address, data: data[i] as Hex, value: call.value })
					.then((g) => (g * 120n) / 100n)
					.catch(() => FALLBACK_GAS);
			}

			const hash = await sendTransaction(config, {
				chainId,
				account,
				to: call.address,
				data: data[i] as Hex,
				value: call.value,
				nonce: baseNonce + i,
				gas,
			});
			hashes.push(hash);
			setItem(i, { status: 'submitted', hash });
		}

		update({ status: 'pending' });
		progress();

		void Promise.all(
			hashes.map((hash, i) =>
				waitForTransactionReceipt(config, { hash, chainId })
					.then((receipt) => {
						if (receipt.status === 'reverted') throw new Error('Transaction reverted');
						setItem(i, { status: 'confirmed' });
						progress();
					})
					.catch((err) => {
						setItem(i, { status: 'failed', error: formatTxError(err) });
						throw err;
					})
			)
		)
			.then(settle)
			.catch((err) => fail(formatTxError(err)));
	} catch (err) {
		// the user declined, or the wallet refused: calls signed before are still on their way
		const sent = batch.items.some((it) => it.status === 'submitted');
		fail(formatTxError(err));
		if (sent) toast('Earlier transactions of this batch were already sent.', { icon: 'ℹ️' });
		throw err;
	}
}
