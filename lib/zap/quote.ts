import { erc20Abi, type Address } from 'viem';
import { ensoRoute, isEnsoEnabled, NATIVE_ETH, type EnsoRoute } from './enso';
import { cached } from './api';
import { client, isProtocolToken, type ZapRegistry, type ZapToken } from './registry';
import { ZAPPER_SWAP_ADDRESS } from '@/lib/constants';
import { buildRoute, findPaths, quoteRoutes, SLIPPAGE_BPS, type Route, type RouteStep } from './routes';

// Enso needs a sender to build calldata. With a zapper deployed that sender, and the receiver, is the zapper itself,
// so quotes are wallet-independent and cacheable. Without one the quote is for display only and carries no calldata.
const QUOTE_ONLY_SENDER: Address = '0x000000000000000000000000000000000000dEaD';
const MAX_ENTRY_TOKENS = 3;

const sameAddr = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Symbol and decimals for any ERC-20 (or ETH), cached for the life of the server instance. */
export async function getTokenMeta(registry: ZapRegistry, address: Address): Promise<ZapToken | undefined> {
	if (sameAddr(address, NATIVE_ETH)) return { symbol: 'ETH', address: NATIVE_ETH, decimals: 18 };
	const known = registry.tokens.find((t) => sameAddr(t.address, address));
	if (known) return known;
	return cached(`meta:${address}`.toLowerCase(), 24 * 60 * 60 * 1000, async () => {
		try {
			const [symbol, decimals] = await client.multicall({
				contracts: [
					{ address, abi: erc20Abi, functionName: 'symbol' },
					{ address, abi: erc20Abi, functionName: 'decimals' },
				],
				allowFailure: false,
			});
			return { symbol, address, decimals: Number(decimals) };
		} catch {
			return undefined;
		}
	});
}

function ensoStep(from: ZapToken, to: ZapToken, amountIn: bigint, r: EnsoRoute, withTx: boolean): RouteStep {
	return {
		kind: 'enso',
		label: 'Enso aggregator',
		spender: r.tx.to,
		tx: withTx ? r.tx : undefined,
		tokenIn: from,
		tokenOut: to,
		amountIn,
		amountOut: r.amountOut,
		minAmountOut: r.minAmountOut,
		priceImpact: r.priceImpact,
		feePpm: 0,
		available: r.amountOut > 0n,
	};
}

/**
 * Every way to turn `amountIn` of tokenIn into tokenOut, best first.
 *
 * Tokens the protocol knows (swap modules, Curve pools, reward vaults) are routed natively. For anything else
 * Enso is used for the first leg only: either straight to the target, or into an entry coin (USDC, USDT, EURC, ...)
 * that a native path then carries to the target. Each route carries its steps in ZapperSwapEnsoV1's encoding (`zapSteps`),
 * so the app executes the whole list in one transaction. Enso calldata is built for the zapper as sender and
 * receiver, which makes quotes wallet-independent.
 */
export async function quoteZap(registry: ZapRegistry, tokenIn: ZapToken, tokenOut: ZapToken, amountIn: bigint): Promise<Route[]> {
	const isKnown = registry.tokens.some((t) => sameAddr(t.address, tokenIn.address));
	const native = isKnown ? await quoteRoutes(registry, tokenIn, tokenOut, amountIn) : [];
	if (native.some((r) => r.available) || !isEnsoEnabled()) return native;

	const sender = ZAPPER_SWAP_ADDRESS ?? QUOTE_ONLY_SENDER;
	const slippageBps = Number(SLIPPAGE_BPS);
	const withTx = !!ZAPPER_SWAP_ADDRESS;

	// Direct Enso route, plus hybrid routes through each entry coin that has a native path onward
	const entries = registry.tokens
		.filter((t) => !isProtocolToken(t.address) && !sameAddr(t.address, tokenIn.address))
		.map((t) => ({ token: t, hops: Math.min(...findPaths(registry, t, tokenOut).map((p) => p.length), Infinity) }))
		.filter((e) => e.hops < Infinity)
		.sort((a, b) => a.hops - b.hops)
		.slice(0, MAX_ENTRY_TOKENS);

	const direct = ensoRoute({ tokenIn: tokenIn.address, tokenOut: tokenOut.address, amountIn, fromAddress: sender, slippageBps }).then(
		(r): Route => buildRoute('enso', [ensoStep(tokenIn, tokenOut, amountIn, r, withTx)])
	);

	const hybrid = entries.map(async ({ token: entry }): Promise<Route> => {
		const leg = await ensoRoute({ tokenIn: tokenIn.address, tokenOut: entry.address, amountIn, fromAddress: sender, slippageBps });
		const onward = (await quoteRoutes(registry, entry, tokenOut, leg.amountOut)).find((r) => r.available);
		if (!onward) throw new Error('no native path with capacity');
		return buildRoute(`enso>${onward.id}`, [ensoStep(tokenIn, entry, amountIn, leg, withTx), ...onward.steps]);
	});

	const settled = await Promise.allSettled([direct, ...hybrid]);
	const routes = [...native, ...settled.flatMap((s) => (s.status === 'fulfilled' && s.value.available ? [s.value] : []))];
	return routes.sort(
		(a, b) => Number(b.available) - Number(a.available) || (a.amountOut < b.amountOut ? 1 : a.amountOut > b.amountOut ? -1 : 0)
	);
}
