import type { Address } from 'viem';
import { StreamerVaultV1_ABI } from '@usdu-finance/usdu-core';
import {
	client,
	curveAbi,
	type ModuleEdge,
	type CurveEdge,
	type VaultEdge,
	type ZapEdge,
	type ZapRegistry,
	type ZapToken,
} from './registry';

const MAX_HOPS = 3;

export interface RouteStep {
	kind: 'module' | 'curve' | 'vault' | 'enso';
	label: string;
	/** Contract to approve and call: the swap router for modules, the pool for Curve, the vault, Enso's router. */
	spender: Address;
	/** Module steps: the module passed to the router, and whether it mints (swapIn) or redeems (swapOut). */
	module?: Address;
	/** Module and vault steps: in mints/deposits, out redeems. */
	direction?: 'in' | 'out';
	/** Enso steps: the transaction to send as-is, built for the zapper as sender and receiver. */
	tx?: { to: Address; data: `0x${string}`; value: string };
	minAmountOut?: bigint;
	priceImpact?: number | null;
	/** Curve steps: pool type and coin indices for exchange(i, j, dx, minDy). */
	poolKind?: 'stable' | 'twocrypto';
	i?: number;
	j?: number;
	tokenIn: ZapToken;
	tokenOut: ZapToken;
	amountIn: bigint;
	amountOut: bigint;
	/** Fee in PPM of the step's input, 0 for Curve (priced by the pool). */
	feePpm: number;
	/** False when the step cannot execute, e.g. the module has no mint capacity left. */
	available: boolean;
	reason?: string;
}

/** One entry of ZapperSwapEnsoV1.zap's `steps` argument, ready to pass to the contract once its numbers are BigInt'd. */
export interface ZapperStep {
	kind: number;
	target: Address;
	module: Address;
	tokenIn: Address;
	tokenOut: Address;
	amountIn: bigint;
	minOut: bigint;
	i: number;
	j: number;
	value: bigint;
	data: `0x${string}`;
}

export interface Route {
	id: string;
	steps: RouteStep[];
	/** Quoted output of the whole route, in the target token's units. */
	amountOut: bigint;
	/** The floor passed to the zapper as `minAmountOut`: the quote less slippage for every priced hop. */
	minAmountOut: bigint;
	/** The same steps in the zapper's encoding. */
	zapSteps: ZapperStep[];
	available: boolean;
}

// Mirrors IZapperSwapEnsoV1.Kind in usdu-core, in declaration order
const KIND = { Call: 0, ModuleIn: 1, ModuleOut: 2, CurveStable: 3, CurveTwocrypto: 4, VaultDeposit: 5, VaultRedeem: 6 } as const;
const ZERO: Address = '0x0000000000000000000000000000000000000000';
export const SLIPPAGE_BPS = 50n; // 0.5% per priced hop

function toZapperStep(s: RouteStep, index: number): ZapperStep {
	const kind =
		s.kind === 'enso'
			? KIND.Call
			: s.kind === 'module'
				? s.direction === 'in'
					? KIND.ModuleIn
					: KIND.ModuleOut
				: s.kind === 'vault'
					? s.direction === 'in'
						? KIND.VaultDeposit
						: KIND.VaultRedeem
					: s.poolKind === 'stable'
						? KIND.CurveStable
						: KIND.CurveTwocrypto;

	return {
		kind,
		target: s.kind === 'enso' ? (s.tx?.to ?? s.spender) : s.spender,
		module: s.module ?? ZERO,
		tokenIn: s.tokenIn.address,
		tokenOut: s.tokenOut.address,
		// The first step spends the pulled input; every later one spends whatever the previous step delivered
		amountIn: index === 0 ? s.amountIn : 0n,
		// Intermediate outputs are only known on-chain, so the route's single floor is `minAmountOut`
		minOut: 0n,
		i: s.i ?? 0,
		j: s.j ?? 0,
		value: BigInt(s.tx?.value ?? 0),
		data: s.tx?.data ?? '0x',
	};
}

/** Assembles a route from its quoted steps, deriving the output, the slippage floor and the zapper encoding. */
export function buildRoute(id: string, steps: RouteStep[], complete = true): Route {
	const amountOut = steps.length ? steps[steps.length - 1].amountOut : 0n;
	const priced = BigInt(Math.max(steps.filter((s) => s.kind === 'curve' || s.kind === 'enso').length, 1));
	return {
		id,
		steps,
		amountOut,
		minAmountOut: (amountOut * (10_000n - SLIPPAGE_BPS * priced)) / 10_000n,
		zapSteps: steps.map(toZapperStep),
		available: complete && steps.every((s) => s.available),
	};
}

interface Hop {
	edge: ZapEdge;
	from: ZapToken;
	to: ZapToken;
}

const same = (a: ZapToken, b: ZapToken) => a.address.toLowerCase() === b.address.toLowerCase();

const edgeTokens = (edge: ZapEdge): [ZapToken, ZapToken] =>
	edge.kind === 'module' ? [edge.coin, edge.stable] : edge.kind === 'vault' ? [edge.asset, edge.share] : edge.tokens;

function hopsFrom(edges: ZapEdge[], token: ZapToken): Hop[] {
	return edges.flatMap((edge): Hop[] => {
		const [a, b] = edgeTokens(edge);
		if (same(a, token)) return [{ edge, from: a, to: b }];
		if (same(b, token)) return [{ edge, from: b, to: a }];
		return [];
	});
}

/** Every simple path (no token visited twice) from tokenIn to tokenOut, up to MAX_HOPS hops. */
export function findPaths(registry: ZapRegistry, tokenIn: ZapToken, tokenOut: ZapToken): Hop[][] {
	const paths: Hop[][] = [];
	const walk = (token: ZapToken, path: Hop[], visited: Set<string>) => {
		if (same(token, tokenOut)) return void paths.push(path);
		if (path.length >= MAX_HOPS) return;
		for (const hop of hopsFrom(registry.edges, token)) {
			if (visited.has(hop.to.address.toLowerCase())) continue;
			walk(hop.to, [...path, hop], new Set([...visited, hop.to.address.toLowerCase()]));
		}
	};
	walk(tokenIn, [], new Set([tokenIn.address.toLowerCase()]));
	return paths;
}

function quoteModule(
	edge: ModuleEdge,
	from: ZapToken,
	amountIn: bigint
): Pick<RouteStep, 'amountOut' | 'feePpm' | 'available' | 'reason' | 'direction'> {
	const mint = same(from, edge.coin);
	if (mint) {
		const stable = (amountIn * 10n ** 18n) / 10n ** BigInt(edge.coin.decimals);
		const fee = (stable * BigInt(edge.swapInFeePPM)) / 1_000_000n;
		const ok = stable <= edge.mintable;
		return {
			direction: 'in',
			amountOut: stable - fee,
			feePpm: edge.swapInFeePPM,
			available: ok,
			reason: ok ? undefined : `Only ${edge.mintable / 10n ** 18n} ${edge.stable.symbol} mint capacity left`,
		};
	}
	const fee = (amountIn * BigInt(edge.swapOutFeePPM)) / 1_000_000n;
	const ok = amountIn <= edge.totalMinted;
	return {
		direction: 'out',
		amountOut: ((amountIn - fee) * 10n ** BigInt(edge.coin.decimals)) / 10n ** 18n,
		feePpm: edge.swapOutFeePPM,
		available: ok,
		reason: ok ? undefined : `Only ${edge.totalMinted / 10n ** 18n} ${edge.stable.symbol} can be redeemed here`,
	};
}

async function quoteVault(edge: VaultEdge, from: ZapToken, amountIn: bigint) {
	const deposit = same(from, edge.asset);
	try {
		const out = (await client.readContract({
			address: edge.vault,
			abi: StreamerVaultV1_ABI,
			functionName: deposit ? 'previewDeposit' : 'previewRedeem',
			args: [amountIn],
		})) as bigint;
		return {
			direction: deposit ? ('in' as const) : ('out' as const),
			amountOut: out,
			available: out > 0n,
			reason: out > 0n ? undefined : 'Vault cannot quote this amount',
		};
	} catch {
		return {
			direction: deposit ? ('in' as const) : ('out' as const),
			amountOut: 0n,
			available: false,
			reason: 'Vault cannot quote this amount',
		};
	}
}

async function quoteCurve(edge: CurveEdge, from: ZapToken, amountIn: bigint) {
	const i = same(from, edge.tokens[0]) ? 0 : 1;
	const j = 1 - i;
	try {
		const out = (await client.readContract({
			address: edge.pool,
			abi: curveAbi(edge.poolKind),
			functionName: 'get_dy',
			args: [BigInt(i), BigInt(j), amountIn],
		} as never)) as bigint;
		return { i, j, amountOut: out, available: out > 0n, reason: out > 0n ? undefined : 'Pool has no liquidity for this swap' };
	} catch {
		return { i, j, amountOut: 0n, available: false, reason: 'Pool cannot quote this swap' };
	}
}

/** Quotes every candidate path for the amount, best output first (unavailable routes last). */
export async function quoteRoutes(registry: ZapRegistry, tokenIn: ZapToken, tokenOut: ZapToken, amountIn: bigint): Promise<Route[]> {
	const routes = await Promise.all(
		findPaths(registry, tokenIn, tokenOut).map(async (path): Promise<Route> => {
			const steps: RouteStep[] = [];
			let amount = amountIn;
			for (const { edge, from, to } of path) {
				const base = { label: edge.label, tokenIn: from, tokenOut: to, amountIn: amount };
				if (edge.kind === 'module') {
					const q = quoteModule(edge, from, amount);
					steps.push({ kind: 'module', spender: edge.router, module: edge.module, ...base, ...q });
					amount = q.amountOut;
				} else if (edge.kind === 'vault') {
					const q = await quoteVault(edge, from, amount);
					steps.push({ kind: 'vault', spender: edge.vault, feePpm: 0, ...base, ...q });
					amount = q.amountOut;
				} else {
					const q = await quoteCurve(edge, from, amount);
					steps.push({ kind: 'curve', spender: edge.pool, poolKind: edge.poolKind, feePpm: 0, ...base, ...q });
					amount = q.amountOut;
				}
				if (amount === 0n) break;
			}
			return buildRoute(path.map((h) => h.edge.key).join('>'), steps, steps.length === path.length);
		})
	);
	return routes.sort(
		(a, b) => Number(b.available) - Number(a.available) || (a.amountOut < b.amountOut ? 1 : a.amountOut > b.amountOut ? -1 : 0)
	);
}

/** BigInt-safe JSON shape for API responses. */
export const serialize = (value: unknown): unknown =>
	JSON.parse(JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
