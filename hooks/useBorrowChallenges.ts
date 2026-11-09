import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBorrowPositions, type BorrowPositionView } from '@/hooks/useBorrowPositions';
import { MOCK_CHALLENGER, MOCK_DATA, contractsOf } from '@/lib/borrow/mock';
import type { BorrowChallenge } from '@/lib/borrow/types';

export interface BorrowChallengeView extends BorrowChallenge {
	position: BorrowPositionView;
	isMine: boolean;
}

export interface BorrowChallengesData {
	/** Running challenge auctions, bid on them with `bid`. */
	challenges: BorrowChallengeView[];
	/** Matured positions that still hold collateral, buy it with `buyExpired`. */
	expired: BorrowPositionView[];
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch running challenges (BorrowMarketV1.getChallenge, ChallengeStarted events) and expired positions.
 * MOCK: serves static data until the contract is deployed.
 */
export function useBorrowChallenges(currency: string): BorrowChallengesData {
	const { address } = useAuth();
	const { positions } = useBorrowPositions(currency);

	return useMemo(() => {
		const me = address?.toLowerCase();
		const challenges = contractsOf(currency)
			.flatMap((contract) => MOCK_DATA[contract].challenges.map((c) => ({ c, contract })))
			.flatMap(({ c, contract }) => {
				const position = positions.find((p) => p.market.currency === contract && p.positionId === c.positionId);
				if (!position) return [];
				const challenger = me && c.challenger === MOCK_CHALLENGER ? (address as `0x${string}`) : c.challenger;
				return [{ ...c, challenger, position, isMine: !!me && challenger.toLowerCase() === me }];
			});
		const expired = positions.filter((p) => p.status === 'expired');
		return { challenges, expired, isLoading: false, error: null };
	}, [address, positions, currency]);
}

export function useBorrowChallenge(currency: string, challengeId: number | undefined) {
	const data = useBorrowChallenges(currency);
	return { ...data, challenge: data.challenges.find((c) => c.challengeId === challengeId) };
}
