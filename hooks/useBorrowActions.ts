import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { sleep } from '@/lib/utils';

export interface BorrowActionsData {
	/** Opens a position, optionally minting right away. */
	open: (marketId: number, amount: bigint, maturity: number, borrowAmount: bigint) => Promise<void>;
	/** Opens a leveraged position: borrow, swap into more collateral and deposit, in one go. */
	openLeveraged: (marketId: number, amount: bigint, maturity: number, leverage: number) => Promise<void>;
	deposit: (positionId: number, amount: bigint) => Promise<void>;
	withdraw: (positionId: number, amount: bigint) => Promise<void>;
	mint: (positionId: number, amount: bigint) => Promise<void>;
	repay: (positionId: number, amount: bigint) => Promise<void>;
	setPrice: (positionId: number, newPrice: bigint) => Promise<void>;
	/** Starts a challenge against a position by putting up `size` collateral. */
	challenge: (positionId: number, size: bigint, minimumPrice: bigint) => Promise<void>;
	/** Bids on a running challenge auction at the current price. */
	bid: (challengeId: number, size: bigint) => Promise<void>;
	/** Force sells an expired position: buys up to `upTo` of its collateral at the current auction price. */
	buyExpired: (positionId: number, upTo: bigint) => Promise<void>;
	coverBadDebt: (marketId: number, amount: bigint) => Promise<void>;
	approve: (token: string) => Promise<void>;
	isPending: boolean;
}

/**
 * Hook to send borrow market transactions with toast feedback.
 * MOCK: every action only simulates a confirmed transaction. Swap each body for a `writeContractAsync` call
 * against IBorrowMarketV1 (same names and argument order) once the contract is deployed.
 */
export function useBorrowActions(): BorrowActionsData {
	const [isPending, setIsPending] = useState(false);

	const run = useCallback(async (label: string) => {
		setIsPending(true);
		const id = toast.loading(`${label}...`);
		try {
			await sleep(1200);
			toast.success(`${label}: confirmed (mock, nothing was sent)`, { id });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : `${label} failed`, { id });
			throw err;
		} finally {
			setIsPending(false);
		}
	}, []);

	return {
		open: useCallback(() => run('Opening position'), [run]),
		openLeveraged: useCallback(() => run('Opening leveraged position'), [run]),
		deposit: useCallback(() => run('Depositing collateral'), [run]),
		withdraw: useCallback(() => run('Withdrawing collateral'), [run]),
		mint: useCallback(() => run('Borrowing'), [run]),
		repay: useCallback(() => run('Repaying'), [run]),
		setPrice: useCallback(() => run('Updating price'), [run]),
		challenge: useCallback(() => run('Starting challenge'), [run]),
		bid: useCallback(() => run('Placing bid'), [run]),
		buyExpired: useCallback(() => run('Buying expired collateral'), [run]),
		coverBadDebt: useCallback(() => run('Covering bad debt'), [run]),
		approve: useCallback(() => run('Approving'), [run]),
		isPending,
	};
}
