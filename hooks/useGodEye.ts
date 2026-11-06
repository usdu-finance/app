import { useCallback, useEffect, useRef, useState } from 'react';
import { INDEXER_URL } from '@/lib/constants';
import {
	GodEyeAddress,
	GodEyeGraph,
	GodEyeHolders,
	GodEyeJourney,
	GodEyeMode,
	GodEyeRank,
	GodEyeSearchHit,
	GodEyeSync,
	GodEyeTimelinePoint,
	GodEyeTokenInfo,
	GodEyeTransfer,
	GodEyeTransfers,
} from '@/components/pages/godeye/godeye.types';

class GodEyeError extends Error {
	constructor(
		message: string,
		public status?: number
	) {
		super(message);
	}
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
	if (!INDEXER_URL) throw new GodEyeError('NEXT_PUBLIC_INDEXER_URL is not configured');
	const clean = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== '');
	const query = new URLSearchParams(clean.map(([k, v]) => [k, String(v)])).toString();
	const r = await fetch(`${INDEXER_URL.replace(/\/$/, '')}/godeye/${path}${query ? `?${query}` : ''}`);
	if (!r.ok) {
		const body = await r.json().catch(() => null);
		throw new GodEyeError(body?.message ?? body?.error ?? `request failed (${r.status})`, r.status);
	}
	return r.json();
}

export const godeyeSearch = (q: string, token: string) => get<GodEyeSearchHit[]>('search', { q, token });

/**
 * Waits for the API to have mirrored the ERC20 ledger. The first start of the API takes a minute,
 * so this exposes the real sync progress instead of a blind spinner.
 */
export function useGodEyeBoot() {
	const [sync, setSync] = useState<GodEyeSync | null>(null);
	const [tokens, setTokens] = useState<GodEyeTokenInfo[]>([]);
	const [unreachable, setUnreachable] = useState<string | null>(null);

	useEffect(() => {
		let stop = false;
		let timer: ReturnType<typeof setTimeout>;
		const tick = async () => {
			try {
				const r = await get<{ sync: GodEyeSync; tokens: GodEyeTokenInfo[] }>('tokens');
				if (stop) return;
				setUnreachable(null);
				setSync(r.sync);
				if (r.sync.ready) {
					setTokens(r.tokens.filter((t) => t.transfers > 0));
					return;
				}
			} catch (e: unknown) {
				if (stop) return;
				setUnreachable(
					`${INDEXER_URL}/godeye/tokens failed (${e instanceof GodEyeError && e.status ? e.status : 'network error'}).`
				);
			}
			timer = setTimeout(tick, 1000);
		};
		tick();
		return () => {
			stop = true;
			clearTimeout(timer);
		};
	}, []);

	return { sync, tokens, ready: !!sync?.ready && tokens.length > 0, unreachable };
}

export function useGodEyeTimeline(token: string | null, version = 0) {
	const [timeline, setTimeline] = useState<GodEyeTimelinePoint[]>([]);
	useEffect(() => {
		if (!token) return;
		let stop = false;
		get<GodEyeTimelinePoint[]>('timeline', { token })
			.then((t) => !stop && setTimeline(t))
			.catch(() => !stop && setTimeline([]));
		return () => {
			stop = true;
		};
	}, [token, version]);
	return timeline;
}

export type GodEyeQuery = {
	token: string;
	at: number | null;
	window: number;
	top: number;
	rank: GodEyeRank;
	mode: GodEyeMode;
	focus: string | null;
};

/**
 * Loads graph + holders for a query. Single flight, latest wins: while a request is running newer
 * queries (scrubbing, playback) are collapsed into one follow-up request.
 */
export function useGodEyeScene(query: GodEyeQuery | null, refreshKey = 0) {
	const [scene, setScene] = useState<{ graph: GodEyeGraph; holders: GodEyeHolders; query: GodEyeQuery } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const latest = useRef<GodEyeQuery | null>(null);
	const running = useRef(false);
	const dead = useRef(false);

	const run = useCallback(async () => {
		if (running.current) return;
		running.current = true;
		try {
			while (latest.current && !dead.current) {
				const q = latest.current;
				latest.current = null;
				try {
					const [graph, holders] = await Promise.all([
						get<GodEyeGraph>('graph', {
							token: q.token,
							at: q.at ?? undefined,
							window: q.window || undefined,
							top: q.top,
							rank: q.rank,
							mode: q.mode,
							focus: q.focus ?? undefined,
						}),
						get<GodEyeHolders>('holders', { token: q.token, at: q.at ?? undefined, limit: 20 }),
					]);
					if (!dead.current) {
						setScene({ graph, holders, query: q });
						setError(null);
					}
				} catch (e: unknown) {
					if (!dead.current) setError(e instanceof Error ? e.message : 'request failed');
				}
			}
		} finally {
			running.current = false;
		}
	}, []);

	const key = query ? JSON.stringify(query) : '';
	useEffect(() => {
		dead.current = false;
		return () => {
			dead.current = true;
		};
	}, []);
	useEffect(() => {
		if (!query) return;
		latest.current = query;
		run();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, refreshKey, run]);

	return { scene, error };
}

export function useGodEyeAddress(token: string | null, address: string | null) {
	const [data, setData] = useState<GodEyeAddress | null>(null);
	const [loading, setLoading] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (!token || !address) {
			setData(null);
			return;
		}
		let stop = false;
		setLoading(true);
		setFailed(false);
		get<GodEyeAddress>(`address/${address}`, { token })
			.then((a) => !stop && setData(a))
			.catch(() => !stop && (setData(null), setFailed(true)))
			.finally(() => !stop && setLoading(false));
		return () => {
			stop = true;
		};
	}, [token, address]);

	return { data, loading, failed };
}

export function useGodEyeJourney(token: string | null, address: string | null) {
	const [data, setData] = useState<GodEyeJourney | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!token || !address) return;
		let stop = false;
		setLoading(true);
		setError(null);
		get<GodEyeJourney>(`address/${address}/journey`, { token })
			.then((j) => !stop && setData(j))
			.catch((e) => !stop && (setData(null), setError(e instanceof Error ? e.message : 'request failed')))
			.finally(() => !stop && setLoading(false));
		return () => {
			stop = true;
		};
	}, [token, address]);

	return { data, loading, error };
}

const YEAR = 365 * 86400;

/**
 * Every transfer an address sent in the given tokens, oldest first. The API serves a year at most and caps a window at 100
 * transfers, so the history is walked in year-long windows and any window that comes back truncated is split in half.
 */
export function useGodEyeOutflows(tokens: GodEyeTokenInfo[], address: string) {
	const [rows, setRows] = useState<(GodEyeTransfer & { token: string })[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const key = tokens.map((t) => t.key).join(',');

	useEffect(() => {
		if (!tokens.length) return;
		let stop = false;
		setLoading(true);
		setError(null);

		const fetchWindow = async (token: string, from: number, to: number): Promise<GodEyeTransfer[]> => {
			const r = await get<GodEyeTransfers>(`address/${address}/transfers`, { token, from, to });
			if (!r.more || to - from <= 3600) return r.transfers;
			const mid = Math.floor((from + to) / 2);
			return [...(await fetchWindow(token, from, mid)), ...(await fetchWindow(token, mid, to))];
		};

		const outflowsOf = async (token: GodEyeTokenInfo) => {
			const now = Math.floor(Date.now() / 1000);
			const all = new Map<string, GodEyeTransfer & { token: string }>();
			for (let from = token.firstTs; from < now; from += YEAR) {
				for (const t of await fetchWindow(token.key, from, Math.min(from + YEAR, now))) {
					// windows share their edge, so the same transfer can arrive twice
					all.set(`${t.txHash}:${t.from}:${t.to}:${t.amount}`, { ...t, token: token.key });
				}
			}
			return [...all.values()].filter((t) => t.from.toLowerCase() === address.toLowerCase());
		};

		Promise.all(tokens.map(outflowsOf))
			.then((r) => !stop && setRows(r.flat().sort((a, b) => a.t - b.t)))
			.catch((e) => !stop && setError(e instanceof Error ? e.message : 'request failed'))
			.finally(() => !stop && setLoading(false));
		return () => {
			stop = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, address]);

	return { rows, loading, error };
}

/** The timelines of one address in several tokens at once, keyed by ledger key */
export function useGodEyeJourneys(tokens: string[], address: string) {
	const [data, setData] = useState<Record<string, GodEyeJourney>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const key = tokens.join(',');

	useEffect(() => {
		if (!tokens.length) return;
		let stop = false;
		setLoading(true);
		setError(null);
		Promise.all(tokens.map(async (t) => [t, await get<GodEyeJourney>(`address/${address}/journey`, { token: t })] as const))
			.then((r) => !stop && setData(Object.fromEntries(r)))
			.catch((e) => !stop && (setData({}), setError(e instanceof Error ? e.message : 'request failed')))
			.finally(() => !stop && setLoading(false));
		return () => {
			stop = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, address]);

	return { data, loading, error };
}
