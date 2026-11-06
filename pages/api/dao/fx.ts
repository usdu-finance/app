import type { NextApiRequest, NextApiResponse } from 'next';
import { cached, sendError, sendJson } from '@/lib/zap/api';

const LLAMA_CHART = 'https://coins.llama.fi/chart';
// The curator's history starts in mid 2025
const START = 1748736000;
const DAY = 86400;
// DefiLlama serves at most 500 points per request
const CHUNK_DAYS = 480;

// The euro and the franc as the stablecoins that track them: EURC for EUR, Frankencoin (ZCHF) for CHF
const COINS = {
	eur: '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c',
	chf: '0xb58e61c3098d85632df34eecfb899a1ed80921cb',
};

/** Daily USD price of one coin since START as [unix seconds, price] pairs, oldest first. */
async function series(address: string): Promise<[number, number][]> {
	const out = new Map<number, number>();
	const now = Math.floor(Date.now() / 1000);
	for (let start = START; start < now; start += CHUNK_DAYS * DAY) {
		const span = Math.min(CHUNK_DAYS, Math.ceil((now - start) / DAY) + 1);
		const r = await fetch(`${LLAMA_CHART}/ethereum:${address}?start=${start}&span=${span}&period=1d`);
		if (!r.ok) throw new Error(`llama ${r.status}`);
		const { coins } = (await r.json()) as { coins: Record<string, { prices: { timestamp: number; price: number }[] }> };
		for (const p of Object.values(coins)[0]?.prices ?? []) out.set(p.timestamp, p.price);
	}
	return [...out.entries()].sort((a, b) => a[0] - b[0]);
}

/**
 * GET /api/dao/fx: daily USD value of one EUR and one CHF, for valuing EURU and CHFU payments at the day they were made.
 * (USDU is one dollar by definition.)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');
	try {
		const body = await cached('dao-fx', 60 * 60 * 1000, async () => {
			const [eur, chf] = await Promise.all([series(COINS.eur), series(COINS.chf)]);
			if (!eur.length || !chf.length) throw new Error('no prices');
			return { eur, chf };
		});
		sendJson(res, body, 3600);
	} catch {
		sendError(res, 502, 'Failed to load exchange rates');
	}
}
