import { useQuery } from '@tanstack/react-query';
import type { DaoTransfers } from '@/lib/dao-transfers';

async function load(): Promise<DaoTransfers> {
	const r = await fetch('/api/dao/transfers');
	if (!r.ok) throw new Error('Failed to load the DAO transfers');
	return r.json();
}

/** The DAO wallet's transfers, served by our own API route which caches the chain read for a few minutes */
export function useDaoTransfers() {
	const { data, isLoading, error } = useQuery({ queryKey: ['dao-transfers'], queryFn: load, staleTime: 2 * 60 * 1000 });
	return { data: data ?? null, loading: isLoading, error: error ? (error as Error).message : null };
}
