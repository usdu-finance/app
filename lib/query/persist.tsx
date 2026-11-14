'use client';

import { useEffect } from 'react';
import { dehydrate, hydrate, useQueryClient, type Query } from '@tanstack/react-query';

const STORAGE_KEY = 'usdu_finance_query_cache';
// the previous redux-persist store, no longer used
const LEGACY_KEYS = ['persist:usdu_finance_redux_store'];
const MAX_AGE = 24 * 60 * 60 * 1000;
const SAVE_DELAY = 1000;

/** Query keys starting with this are persisted, e.g. ['onchain', 'curve-pools', ...]. */
export const PERSISTED_KEY = 'onchain';

const shouldPersist = (query: Query) => query.queryKey[0] === PERSISTED_KEY && query.state.status === 'success';

// the cached on-chain data holds bigint balances, which JSON can't carry
const replacer = (_key: string, value: unknown) => (typeof value === 'bigint' ? { __bigint: value.toString() } : value);
const reviver = (_key: string, value: unknown) =>
	value && typeof value === 'object' && '__bigint' in value ? BigInt((value as { __bigint: string }).__bigint) : value;

/**
 * Persists the on-chain query cache in localStorage, so navigating or reloading paints from the last
 * result while a background refetch confirms it. Hydrates after mount, never during render, so the
 * server and first client render stay identical. Renders nothing.
 */
export function QueryCachePersistence() {
	const queryClient = useQueryClient();

	useEffect(() => {
		try {
			LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const stored = JSON.parse(raw, reviver) as { savedAt: number; state: Parameters<typeof hydrate>[1] };
				if (Date.now() - stored.savedAt < MAX_AGE) hydrate(queryClient, stored.state);
				else localStorage.removeItem(STORAGE_KEY);
			}
		} catch {
			// unreadable or blocked storage, start with an empty cache
		}

		let timer: ReturnType<typeof setTimeout> | undefined;
		const save = () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				try {
					const state = dehydrate(queryClient, { shouldDehydrateQuery: shouldPersist });
					localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), state }, replacer));
				} catch {
					// quota exceeded or blocked storage, the cache just isn't persisted
				}
			}, SAVE_DELAY);
		};

		const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
			if (event.type === 'updated' && event.action.type === 'success') save();
		});
		return () => {
			unsubscribe();
			clearTimeout(timer);
		};
	}, [queryClient]);

	return null;
}
