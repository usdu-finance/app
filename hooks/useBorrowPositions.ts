import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_CHALLENGER, MOCK_DATA, contractsOf } from '@/lib/borrow/mock';
import { challengeRisk, positionStatus } from '@/lib/borrow/math';
import type { BorrowMarket, BorrowPosition, ChallengeRisk, PositionStatus } from '@/lib/borrow/types';

export interface BorrowPositionView extends BorrowPosition {
	market: BorrowMarket;
	status: PositionStatus;
	/** How exposed the position is to a challenge, judged from its price against the market price. */
	risk: ChallengeRisk;
	isMine: boolean;
}

export interface BorrowPositionsData {
	positions: BorrowPositionView[];
	mine: BorrowPositionView[];
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch every borrow position of one stablecoin's contract (BorrowMarketV1.getPosition for 1..positionCount, owners via ownerOf).
 * MOCK: serves static data until the contract is deployed. The first mock positions belong to the connected wallet.
 */
export function useBorrowPositions(currency: string): BorrowPositionsData {
	const { address } = useAuth();

	return useMemo(() => {
		const me = address?.toLowerCase();
		const positions = contractsOf(currency)
			.flatMap((c) => MOCK_DATA[c].positions.map((p) => ({ p, markets: MOCK_DATA[c].markets })))
			.flatMap(({ p, markets }) => {
				const market = markets.find((m) => m.marketId === p.marketId);
				if (!market) return [];
				const owner = me && p.owner === MOCK_CHALLENGER ? (address as `0x${string}`) : p.owner;
				return [
					{
						...p,
						owner,
						market,
						status: positionStatus(p),
						risk: challengeRisk(p, market),
						isMine: !!me && owner.toLowerCase() === me,
					},
				];
			});
		return { positions, mine: positions.filter((p) => p.isMine), isLoading: false, error: null };
	}, [address, currency]);
}

export function useBorrowPosition(currency: string, positionId: number | undefined) {
	const data = useBorrowPositions(currency);
	return { ...data, position: data.positions.find((p) => p.positionId === positionId) };
}
