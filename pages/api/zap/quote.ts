import type { NextApiRequest, NextApiResponse } from 'next';
import { getRegistry } from '@/lib/zap/registry';
import { getTokenMeta, quoteZap } from '@/lib/zap/quote';
import { serialize } from '@/lib/zap/routes';
import { isEnsoEnabled } from '@/lib/zap/enso';
import { addressParam, amountParam, cached, cacheDrop, sendError, sendJson } from '@/lib/zap/api';

/**
 * GET /api/zap/quote?tokenIn=0x..&tokenOut=0x..&amountIn=<wei>
 * Every route from tokenIn to tokenOut for the amount, best first. tokenIn can be any ERC-20 or ETH: tokens the
 * protocol knows are routed through the swap modules, Curve pools and reward vaults; anything else uses Enso for
 * the first leg. Each route includes `zapSteps`, the arguments for ZapperSwapEnsoV1.zap.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

	const tokenIn = addressParam(req, 'tokenIn');
	const tokenOut = addressParam(req, 'tokenOut');
	const amountIn = amountParam(req, 'amountIn');
	if (!tokenIn || !tokenOut || !amountIn) return sendError(res, 400, 'tokenIn, tokenOut and a positive integer amountIn are required');
	if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) return sendError(res, 400, 'tokenIn and tokenOut must differ');

	try {
		const registry = await getRegistry();
		const [inToken, outToken] = await Promise.all([getTokenMeta(registry, tokenIn), getTokenMeta(registry, tokenOut)]);
		if (!inToken || !outToken) return sendError(res, 400, 'Unknown token');

		const key = `quote:${tokenIn}:${tokenOut}:${amountIn}`.toLowerCase();
		const { routes } = await cached(key, 10_000, async () => {
			const result = await quoteZap(registry, inToken, outToken, amountIn);
			if (!result.complete) setTimeout(() => cacheDrop(key), 0); // partial results are served once, never reused
			return result;
		});

		// Say why there is nothing to show: a token outside the protocol can only be routed through Enso
		const isNative = registry.tokens.some((t) => t.address.toLowerCase() === tokenIn.toLowerCase());
		const reason = routes.some((r) => r.available) ? undefined : !isNative && !isEnsoEnabled() ? 'enso-not-configured' : 'no-route';

		sendJson(res, serialize({ tokenIn, tokenOut, amountIn, routes, reason, fetchedAt: registry.fetchedAt }), 10);
	} catch {
		sendError(res, 502, 'Failed to quote routes');
	}
}
