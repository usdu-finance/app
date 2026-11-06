import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

type Series = [number, number][];

async function load(): Promise<{ eur: Series; chf: Series }> {
	const r = await fetch('/api/dao/fx');
	if (!r.ok) throw new Error('Failed to load exchange rates');
	return r.json();
}

/** The last price on or before t; before the series starts, its first price */
function priceAt(s: Series, t: number): number {
	let lo = 0;
	let hi = s.length - 1;
	if (t <= s[0][0]) return s[0][1];
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (s[mid][0] <= t) lo = mid;
		else hi = mid - 1;
	}
	return s[lo][1];
}

/**
 * USD value of one unit of a DAO stablecoin at a point in time: USDU is one dollar, EURU and CHFU follow the euro and
 * the franc by their daily rate. `rateOf` is undefined until the rates have loaded.
 */
export function useDaoFx() {
	const { data, isLoading, error } = useQuery({ queryKey: ['dao-fx'], queryFn: load, staleTime: 60 * 60 * 1000 });
	const rateOf = useCallback(
		(symbol: string, t: number): number => {
			if (symbol === 'USDU' || !data) return 1;
			return priceAt(symbol === 'EURU' ? data.eur : data.chf, t);
		},
		[data]
	);
	return { rateOf, ready: !!data, loading: isLoading, error: error ? (error as Error).message : null };
}
