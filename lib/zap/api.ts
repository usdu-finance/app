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
