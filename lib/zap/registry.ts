import { createPublicClient, erc20Abi, http, type Address } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS, ISwapBridgeMorphoV1_ABI, ICurveStableSwapNG_ABI, ITwocrypto_ABI } from '@usdu-finance/usdu-core';
import { USDC_MAINNET } from '@/lib/whitelisted-tokens';

/**
 * Server-side registry of every on-chain hop the zap can take without a zapper contract: the Curve pools
 * and the swap-router modules. Fees, caps and coin addresses are read live and cached briefly, so the
 * API routes in pages/api/zap stay cheap under load.
 */

const addresses = ADDRESS[mainnet.id];

export interface ZapToken {
	symbol: string;
	address: Address;
	decimals: number;
}

export interface ModuleEdge {
	kind: 'module';
	key: string;
	label: string;
	router: Address;
	module: Address;
	coin: ZapToken;
	stable: ZapToken;
	swapInFeePPM: number;
	swapOutFeePPM: number;
	/** Remaining swap-in capacity in stablecoin units (18 decimals). */
	mintable: bigint;
	/** Stablecoin (18 decimals) outstanding against the module, i.e. the most that can be swapped out. */
	totalMinted: bigint;
}

export interface CurveEdge {
	kind: 'curve';
	key: string;
	label: string;
	pool: Address;
	poolKind: 'stable' | 'twocrypto';
	tokens: [ZapToken, ZapToken];
}

export interface VaultEdge {
	kind: 'vault';
	key: string;
	label: string;
	vault: Address;
	/** The stablecoin staked into the reward vault. */
	asset: ZapToken;
	share: ZapToken;
}

export type ZapEdge = ModuleEdge | CurveEdge | VaultEdge;

export interface ZapRegistry {
	tokens: ZapToken[];
	edges: ZapEdge[];
	fetchedAt: number;
}

const REGISTRY_TTL_MS = 30_000;

export const client = createPublicClient({
	chain: mainnet,
	transport: http(`https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_RPC_URL}`, { batch: true }),
});

const STABLES: ZapToken[] = [
	{ symbol: 'USDU', address: addresses.usduStable as Address, decimals: 18 },
	{ symbol: 'EURU', address: addresses.euruStable as Address, decimals: 18 },
	{ symbol: 'CHFU', address: addresses.chfuStable as Address, decimals: 18 },
];
const [USDU, EURU, CHFU] = STABLES;
const USDC: ZapToken = { symbol: 'USDC', address: USDC_MAINNET, decimals: 6 };

const SHARES: ZapToken[] = [
	{ symbol: 'rUSDU', address: addresses.usduStreamerVaultV1 as Address, decimals: 18 },
	{ symbol: 'rEURU', address: addresses.euruStreamerVaultV1 as Address, decimals: 18 },
	{ symbol: 'rCHFU', address: addresses.chfuStreamerVaultV1 as Address, decimals: 18 },
];

/** What the zap can end in: the three stablecoins and their reward vault shares. */
export const ZAP_TARGETS = [...STABLES, ...SHARES];

/** Coins that are protocol-native: they are never an Enso entry leg, the native graph handles them. */
export const isProtocolToken = (address: string) => ZAP_TARGETS.some((t) => t.address.toLowerCase() === address.toLowerCase());

const MODULES = [
	{ key: 'usdu-usdc', stable: USDU, router: addresses.usduSwapRouterV1, module: addresses.usduSwapBridgeMorphoV1_steakUSDC_module },
	{ key: 'usdu-usdt', stable: USDU, router: addresses.usduSwapRouterV1, module: addresses.usduSwapBridgeMorphoV1_steakUSDT_module },
	{ key: 'euru-eurc', stable: EURU, router: addresses.euruSwapRouterV1, module: addresses.euruSwapBridgeMorphoV1_steakEURC_module },
	{ key: 'euru-deuro', stable: EURU, router: addresses.euruSwapRouterV1, module: addresses.euruSwapBridgeMorphoV1_dEURO_module },
	{ key: 'chfu-zchf', stable: CHFU, router: addresses.chfuSwapRouterV1, module: addresses.chfuSwapBridgeMorphoV1_ZCHF_module },
] as const;

const POOLS: { key: string; poolKind: 'stable' | 'twocrypto'; pool: Address; tokens: [ZapToken, ZapToken] }[] = [
	{ key: 'usdc-usdu', poolKind: 'stable', pool: addresses.curveStableSwapNG_USDCUSDU as Address, tokens: [USDC, USDU] },
	{ key: 'usdu-euru', poolKind: 'twocrypto', pool: addresses.curveTwocryptoNG_USDUEURU as Address, tokens: [USDU, EURU] },
	{ key: 'usdu-chfu', poolKind: 'twocrypto', pool: addresses.curveTwocryptoNG_USDUCHFU as Address, tokens: [USDU, CHFU] },
];

export const curveAbi = (kind: 'stable' | 'twocrypto') => (kind === 'stable' ? ICurveStableSwapNG_ABI : ITwocrypto_ABI);

let cached: ZapRegistry | undefined;
let inflight: Promise<ZapRegistry> | undefined;

async function load(): Promise<ZapRegistry> {
	const reads = MODULES.flatMap((m) => [
		{ address: m.module, abi: ISwapBridgeMorphoV1_ABI, functionName: 'coin' as const },
		{ address: m.module, abi: ISwapBridgeMorphoV1_ABI, functionName: 'swapInFeePPM' as const },
		{ address: m.module, abi: ISwapBridgeMorphoV1_ABI, functionName: 'swapOutFeePPM' as const },
		{ address: m.module, abi: ISwapBridgeMorphoV1_ABI, functionName: 'mintCap' as const },
		{ address: m.module, abi: ISwapBridgeMorphoV1_ABI, functionName: 'totalMinted' as const },
	]);
	const data = await client.multicall({ contracts: reads, allowFailure: false });

	const coins = MODULES.map((_, i) => data[i * 5] as Address);
	const meta = await client.multicall({
		contracts: coins.flatMap((address) => [
			{ address, abi: erc20Abi, functionName: 'symbol' as const },
			{ address, abi: erc20Abi, functionName: 'decimals' as const },
		]),
		allowFailure: false,
	});

	const edges: ZapEdge[] = MODULES.map((m, i) => {
		const coin: ZapToken = { address: coins[i], symbol: meta[i * 2] as string, decimals: Number(meta[i * 2 + 1]) };
		const mintCap = data[i * 5 + 3] as bigint;
		const totalMinted = data[i * 5 + 4] as bigint;
		return {
			kind: 'module' as const,
			key: m.key,
			label: `${coin.symbol} / ${m.stable.symbol} swap module`,
			router: m.router as Address,
			module: m.module as Address,
			coin,
			stable: m.stable,
			swapInFeePPM: Number(data[i * 5 + 1]),
			swapOutFeePPM: Number(data[i * 5 + 2]),
			mintable: mintCap > totalMinted ? mintCap - totalMinted : 0n,
			totalMinted,
		};
	});

	STABLES.forEach((asset, i) => {
		edges.push({
			kind: 'vault',
			key: `${SHARES[i].symbol.toLowerCase()}-${asset.symbol.toLowerCase()}`,
			label: `${asset.symbol} reward vault`,
			vault: SHARES[i].address,
			asset,
			share: SHARES[i],
		});
	});

	for (const p of POOLS) {
		edges.push({ kind: 'curve', label: `${p.tokens[0].symbol} / ${p.tokens[1].symbol} Curve pool`, ...p });
	}

	const tokens = new Map<string, ZapToken>();
	for (const e of edges) {
		const list = e.kind === 'module' ? [e.coin, e.stable] : e.kind === 'vault' ? [e.asset, e.share] : e.tokens;
		list.forEach((t) => tokens.set(t.address.toLowerCase(), t));
	}

	return { tokens: [...tokens.values()], edges, fetchedAt: Date.now() };
}

/** Registry snapshot, shared across requests for REGISTRY_TTL_MS; concurrent callers share one load. */
export async function getRegistry(): Promise<ZapRegistry> {
	if (cached && Date.now() - cached.fetchedAt < REGISTRY_TTL_MS) return cached;
	inflight ??= load()
		.then((r) => (cached = r))
		.finally(() => (inflight = undefined));
	try {
		return await inflight;
	} catch (err) {
		if (cached) return cached; // serve stale rather than fail the widget on an RPC hiccup
		throw err;
	}
}
