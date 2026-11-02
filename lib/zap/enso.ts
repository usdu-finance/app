import type { Address } from 'viem';
import { cached } from './api';

const ENSO_ROUTE_URL = 'https://api.enso.build/api/v1/shortcuts/route';

export const NATIVE_ETH: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export interface EnsoRoute {
	amountOut: bigint;
	minAmountOut: bigint;
	priceImpact: number | null;
	gas: string;
	tx: { to: Address; data: `0x${string}`; value: string };
	route: unknown[];
}

export const isEnsoEnabled = () => !!process.env.ENSO_API_KEY;

const MIN_GAP_MS = 350;
const MAX_RETRIES = 4;
let nextSlot = 0;

/** Hands out request slots MIN_GAP_MS apart, across all concurrent quotes on this server instance. */
async function turn(): Promise<void> {
	const now = Date.now();
	const slot = Math.max(now, nextSlot);
	nextSlot = slot + MIN_GAP_MS;
	if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
}

/** One Enso route (calldata included, receiver = fromAddress), cached 10s per pair, amount and wallet. */
export async function ensoRoute(params: {
	tokenIn: Address;
	tokenOut: Address;
	amountIn: bigint;
	fromAddress: Address;
	slippageBps: number;
}): Promise<EnsoRoute> {
	const apiKey = process.env.ENSO_API_KEY;
	if (!apiKey) throw new Error('Enso routing is not configured');

	const query = new URLSearchParams({
		chainId: '1',
		fromAddress: params.fromAddress,
		receiver: params.fromAddress,
		tokenIn: params.tokenIn,
		tokenOut: params.tokenOut,
		amountIn: params.amountIn.toString(),
		slippage: String(params.slippageBps),
		routingStrategy: 'router',
	});

	const data = await cached(`enso:${query}`.toLowerCase(), 10_000, async () => {
		// Enso rate limits per key (429 on bursts): requests are spaced out and a 429 is retried with backoff
		for (let attempt = 0; ; attempt++) {
			await turn();
			const r = await fetch(`${ENSO_ROUTE_URL}?${query}`, { headers: { Authorization: `Bearer ${apiKey}` } });
			if (r.ok) return r.json();
			if (r.status !== 429 || attempt >= MAX_RETRIES) throw new Error(`enso ${r.status}`);
			await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
		}
	});

	return {
		amountOut: BigInt(data.amountOut),
		minAmountOut: BigInt(data.minAmountOut),
		priceImpact: data.priceImpact ?? null,
		gas: data.gas,
		tx: { to: data.tx.to, data: data.tx.data, value: data.tx.value ?? '0' },
		route: data.route ?? [],
	};
}
