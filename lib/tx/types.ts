import type { Abi } from 'viem';

/** One contract call of a batch, generic like the viem/wagmi write parameters. */
export interface TxCall {
	address: `0x${string}`;
	abi: Abi;
	functionName: string;
	args?: readonly unknown[];
	value?: bigint;
	/** Gas limit, only needed for a call that cannot be estimated before the calls in front of it settled. */
	gas?: bigint;
	/** Short name shown in the transaction toast, e.g. "Approve CHFU". */
	label: string;
}

export type TxItemStatus = 'waiting' | 'signing' | 'submitted' | 'confirmed' | 'failed' | 'skipped';

export interface TxItem {
	label: string;
	status: TxItemStatus;
	hash?: `0x${string}`;
	error?: string;
}

/**
 * - `atomic`: one EIP-5792 `wallet_sendCalls` bundle, all calls or none (Safe, smart wallets)
 * - `queue`: every call signed right away with a consecutive nonce, without waiting for the one in front
 */
export type TxMode = 'atomic' | 'queue';

export type TxBatchStatus = 'signing' | 'pending' | 'confirmed' | 'failed';

export interface TxBatch {
	id: string;
	title: string;
	mode: TxMode;
	items: TxItem[];
	status: TxBatchStatus;
	error?: string;
}
