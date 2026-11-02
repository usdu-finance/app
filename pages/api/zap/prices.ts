import type { NextApiRequest, NextApiResponse } from 'next';
import { isAddress, type Address } from 'viem';
import { getRegistry } from '@/lib/zap/registry';
import { getPrices } from '@/lib/zap/prices';
import { param, sendError, sendJson } from '@/lib/zap/api';

const MAX_TOKENS = 100;

/**
 * GET /api/zap/prices?tokens=0x..,0x..
 * USD price per token, keyed by lowercase address. The protocol's own tokens are priced on-chain from the
 * Curve pools and vaults, everything else (ETH included) through DefiLlama. Tokens without a price are omitted.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

	const tokens = [...new Set((param(req, 'tokens') ?? '').split(',').filter(Boolean))];
	if (tokens.length === 0 || tokens.length > MAX_TOKENS || !tokens.every((t) => isAddress(t))) {
		return sendError(res, 400, `tokens must be 1-${MAX_TOKENS} comma-separated addresses`);
	}

	try {
		sendJson(res, { prices: await getPrices(await getRegistry(), tokens as Address[]) }, 60);
	} catch {
		sendError(res, 502, 'Failed to load prices');
	}
}
