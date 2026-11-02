import type { NextApiRequest, NextApiResponse } from 'next';
import { getRegistry, ZAP_TARGETS } from '@/lib/zap/registry';
import { isEnsoEnabled } from '@/lib/zap/enso';
import { sendJson, sendError } from '@/lib/zap/api';

/**
 * GET /api/zap/tokens: the tokens a zap can end in, the tokens with a native (no-aggregator) path, and whether
 * Enso is configured, i.e. whether arbitrary input tokens work.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');
	try {
		const registry = await getRegistry();
		sendJson(res, { targets: ZAP_TARGETS, tokens: registry.tokens, enso: isEnsoEnabled() }, 30);
	} catch {
		sendError(res, 502, 'Failed to load zap registry');
	}
}
