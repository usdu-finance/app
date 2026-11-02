import type { Address } from 'viem';
import { StreamerVaultV1_ABI } from '@usdu-finance/usdu-core';
import { cached } from './api';
import { NATIVE_ETH } from './enso';
import { client, curveAbi, type CurveEdge, type VaultEdge, type ZapRegistry } from './registry';

const LLAMA_URL = 'https://coins.llama.fi/prices/current';
const PRICE_TTL_MS = 60_000;

const key = (a: string) => a.toLowerCase();

/**
 * USD prices of the protocol's own tokens, read on-chain so they match what the routes actually pay:
 * USDU from the USDC/USDU pool (USDC counted as $1), EURU and CHFU from their USDU pools, and each reward
 * share from its vault's redeem value. A token whose pool or vault cannot quote is left out.
 */
async function protocolPrices(registry: ZapRegistry): Promise<Record<string, number>> {
	return cached('prices:protocol', PRICE_TTL_MS, async () => {
		const curve = registry.edges.filter((e): e is CurveEdge => e.kind === 'curve');
		const vaults = registry.edges.filter((e): e is VaultEdge => e.kind === 'vault');
		const usdcPool = curve.find((e) => e.key === 'usdc-usdu');
		const fxPools = curve.filter((e) => e.key !== 'usdc-usdu');
		if (!usdcPool) return {};

		const one = 10n ** 18n;
		const results = (await client.multicall({
			allowFailure: true,
			contracts: [
				{ address: usdcPool.pool, abi: curveAbi(usdcPool.poolKind), functionName: 'get_dy', args: [1n, 0n, one] },
				...fxPools.map((p) => ({ address: p.pool, abi: curveAbi(p.poolKind), functionName: 'get_dy', args: [1n, 0n, one] })),
				...vaults.map((v) => ({ address: v.vault, abi: StreamerVaultV1_ABI, functionName: 'previewRedeem', args: [one] })),
			] as never,
		})) as { status: 'success' | 'failure'; result?: unknown }[];
		const [usduRaw, ...rest] = results;

		const out: Record<string, number> = {};
		if (usduRaw.status !== 'success') return out;
		const usdu = Number(usduRaw.result as bigint) / 1e6; // USDC has 6 decimals
		out[key(usdcPool.tokens[1].address)] = usdu;

		fxPools.forEach((p, i) => {
			const r = rest[i];
			// coin(0) is USDU, coin(1) the FX stablecoin: 1 FX coin quoted in USDU
			if (r.status === 'success') out[key(p.tokens[1].address)] = (Number(r.result as bigint) / 1e18) * usdu;
		});

		vaults.forEach((v, i) => {
			const r = rest[fxPools.length + i];
			const underlying = out[key(v.asset.address)];
			if (r.status === 'success' && underlying !== undefined)
				out[key(v.share.address)] = (Number(r.result as bigint) / 1e18) * underlying;
		});
		return out;
	});
}

// address -> price, `null` meaning "looked up, no price known" so unlisted tokens aren't re-queried every call
const foreign = new Map<string, { at: number; price: number | null }>();

async function foreignPrices(addresses: Address[]): Promise<Record<string, number>> {
	const now = Date.now();
	const stale = addresses.filter((a) => {
		const hit = foreign.get(key(a));
		return !hit || now - hit.at > PRICE_TTL_MS;
	});

	if (stale.length > 0) {
		// DefiLlama knows ETH by its CoinGecko id rather than by the 0xEeee sentinel
		const id = (a: Address) => (key(a) === key(NATIVE_ETH) ? 'coingecko:ethereum' : `ethereum:${a}`);
		try {
			const res = await fetch(`${LLAMA_URL}/${stale.map(id).join(',')}`);
			if (!res.ok) throw new Error(`llama ${res.status}`);
			const { coins } = (await res.json()) as { coins: Record<string, { price: number }> };
			for (const a of stale) foreign.set(key(a), { at: now, price: coins[id(a)]?.price ?? null });
		} catch {
			// leave stale entries alone: a brief outage should not blank the list
		}
	}

	const out: Record<string, number> = {};
	for (const a of addresses) {
		const price = foreign.get(key(a))?.price;
		if (price != null) out[key(a)] = price;
	}
	return out;
}

/** USD prices for the given tokens, keyed by lowercase address; tokens without a known price are omitted. */
export async function getPrices(registry: ZapRegistry, addresses: Address[]): Promise<Record<string, number>> {
	const own = await protocolPrices(registry);
	const rest = addresses.filter((a) => own[key(a)] === undefined);
	return {
		...Object.fromEntries(addresses.flatMap((a) => (own[key(a)] !== undefined ? [[key(a), own[key(a)]]] : []))),
		...(await foreignPrices(rest)),
	};
}
