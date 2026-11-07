import type { NextApiRequest, NextApiResponse } from 'next';
import { isAddress, type Address } from 'viem';

/** Tiny in-memory TTL cache shared by the zap routes; per server instance, which is plenty for 10s quotes. */
const store = new Map<string, { at: number; value: unknown }>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
	const hit = store.get(key);
	if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
	const value = await load();
	store.set(key, { at: Date.now(), value });
	if (store.size > 500) store.delete(store.keys().next().value as string); // oldest first
	return value;
}

const swr = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Stale-while-revalidate cache: nothing is loaded until someone asks. Within `ttlMs` the value is served as is; past it
 * the old value is still served instantly while one reload runs in the background, so a visitor only ever waits for the
 * very first load. Concurrent callers share one load, and a failed reload keeps serving the old value.
 */
export async function cachedSwr<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
	const hit = swr.get(key) as { at: number; value: T } | undefined;
	const reload = () => {
		let p = inflight.get(key) as Promise<T> | undefined;
		if (!p) {
			p = load()
				.then((value) => {
					swr.set(key, { at: Date.now(), value });
					return value;
				})
				.finally(() => inflight.delete(key));
			inflight.set(key, p);
		}
		return p;
	};
	if (!hit) return reload();
	if (Date.now() - hit.at >= ttlMs) reload().catch(() => {});
	return hit.value;
}

export const cacheDrop = (key: string) => void store.delete(key);

export const param = (req: NextApiRequest, name: string): string | undefined => {
	const v = req.query[name];
	return typeof v === 'string' ? v : undefined;
};

export const addressParam = (req: NextApiRequest, name: string): Address | undefined => {
	const v = param(req, name);
	return v && isAddress(v) ? (v as Address) : undefined;
};

export const amountParam = (req: NextApiRequest, name: string): bigint | undefined => {
	const v = param(req, name);
	return v && /^\d{1,78}$/.test(v) && BigInt(v) > 0n ? BigInt(v) : undefined;
};

/** Edge-cacheable JSON: shared caches may serve it for `s` seconds and revalidate in the background. */
export function sendJson(res: NextApiResponse, body: unknown, s = 10, status = 200) {
	if (status === 200) res.setHeader('Cache-Control', `public, s-maxage=${s}, stale-while-revalidate=${s * 3}`);
	res.status(status).json(body);
}

export const sendError = (res: NextApiResponse, status: number, error: string) => res.status(status).json({ error });
