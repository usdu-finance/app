import { useMemo } from 'react';
import { parseUnits } from 'viem';
import { useAuth } from '@/contexts/AuthContext';
import type { BorrowMarket } from '@/lib/borrow/types';

export interface BorrowBalanceData {
	/** Wallet balance of the market's collateral, in collateral decimals. */
	collateral: bigint;
	/** Wallet balance of the stablecoin, 18 decimals. */
	stable: bigint;
	/** Allowance the borrow market holds over the collateral. */
	allowance: bigint;
}

/**
 * Hook to read the connected wallet's balances relevant to a market (erc20Abi balanceOf / allowance).
 * MOCK: a fixed wallet until the contract is deployed.
 */
export function useBorrowBalance(market: BorrowMarket | undefined): BorrowBalanceData {
	const { isConnected } = useAuth();

	return useMemo(() => {
		if (!market || !isConnected) return { collateral: 0n, stable: 0n, allowance: 0n };
		return {
			collateral: parseUnits('25', market.collateralDecimals),
			stable: parseUnits('150000', 18),
			allowance: 0n,
		};
	}, [market, isConnected]);
}
