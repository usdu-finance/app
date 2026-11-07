import type { NextApiRequest, NextApiResponse } from 'next';
import { formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { cachedSwr, sendError, sendJson } from '@/lib/zap/api';
import { DAO_COINS, SWAP_BRIDGES, type DaoPeerKind, type DaoTransfer, type DaoTransfers } from '@/lib/dao-transfers';

const A = ADDRESS[mainnet.id];
const DAO = A.curator.toLowerCase();
const ZERO = '0x0000000000000000000000000000000000000000';
const ALCHEMY = `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_RPC_URL}`;
const INDEXER = (process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer.usdu.finance').replace(/\/$/, '');

// Nobody asking means no reads. When somebody does, the state is at most this old (and a reload runs behind their back)
const TTL = 3 * 60 * 1000;
// Blocks re-read on every refresh, so a reorg near the tip cannot leave a transfer behind that no longer exists
const REORG_MARGIN = 32;

interface Raw {
	uniqueId: string;
	blockNum: string;
	hash: string;
	from: string;
	to: string;
	rawContract: { value: string | null; address: string | null; decimal: string | null };
	metadata: { blockTimestamp: string };
}

// The wallet's whole ERC20 history, read once and then only from the last block on
const history = { raw: new Map<string, Raw>(), block: 0 };

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
	const r = await fetch(ALCHEMY, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
	});
	if (!r.ok) throw new Error(`alchemy ${r.status}`);
	const j = (await r.json()) as { result?: T; error?: { message: string } };
	if (j.error || !j.result) throw new Error(j.error?.message ?? 'alchemy: empty result');
	return j.result;
}

/** All ERC20 transfers to or from the DAO since a block, oldest first (Alchemy pages them, 1000 at a time) */
async function transfersSince(fromBlock: number): Promise<Raw[]> {
	const out: Raw[] = [];
	for (const side of ['toAddress', 'fromAddress'] as const) {
		let pageKey: string | undefined;
		do {
			const r = await rpc<{ transfers: Raw[]; pageKey?: string }>('alchemy_getAssetTransfers', [
				{
					fromBlock: `0x${fromBlock.toString(16)}`,
					toBlock: 'latest',
					[side]: DAO,
					category: ['erc20'],
					withMetadata: true,
					excludeZeroValue: true,
					maxCount: '0x3e8',
					order: 'asc',
					pageKey,
				},
			]);
			out.push(...r.transfers);
			pageKey = r.pageKey;
		} while (pageKey);
	}
	return out;
}

async function refreshHistory() {
	const head = Number(await rpc<string>('eth_blockNumber', []));
	const from = Math.max(0, history.block - REORG_MARGIN);
	const fresh = await transfersSince(from);
	// whatever sat in the re-read range is replaced by what the chain says now
	for (const [id, t] of history.raw) if (Number(t.blockNum) >= from) history.raw.delete(id);
	for (const t of fresh) history.raw.set(t.uniqueId, t);
	history.block = head;
}

// ---------------------------------------------------------------- who is on the other side

const humanize = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');

/** Protocol addresses that are modules or minters by name, the same rule the indexer's GodEye labels use */
const STATIC_MODULES = new Map<string, string>();
const STATIC_OTHER = new Set<string>();
for (const [key, value] of Object.entries(A)) {
	if (typeof value !== 'string') continue;
	const a = value.toLowerCase();
	if (!/streamer|saving/i.test(key) && /adapter|module|deployer/i.test(key)) STATIC_MODULES.set(a, humanize(key));
	else STATIC_OTHER.add(a);
}
const BRIDGES = new Map(SWAP_BRIDGES.map((b) => [b.module, b.label]));
// a bridge counts in its own stablecoin's currency, which its label starts with
const BRIDGE_CURRENCY = new Map(SWAP_BRIDGES.map((b) => [b.module, b.label.split(' ')[0]]));

/** Modules authorized on the stablecoins, labelled by the message they were registered with */
async function loadModules(): Promise<Map<string, string>> {
	const r = await fetch(INDEXER, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			query: `{ stablecoinModuleMappings(where: { chainId: ${mainnet.id} }, limit: 1000) { items { module message messageUpdated expiredAt } } }`,
		}),
	});
	if (!r.ok) throw new Error(`indexer ${r.status}`);
	const j = (await r.json()) as {
		data?: {
			stablecoinModuleMappings: { items: { module: string; message: string; messageUpdated: string | null; expiredAt: string }[] };
		};
	};
	if (!j.data) throw new Error('indexer: no module list');
	const now = Date.now() / 1000;
	return new Map(
		j.data.stablecoinModuleMappings.items.map((m) => {
			const msg = String(m.messageUpdated || m.message || '')
				.replace(/\s+/g, ' ')
				.trim()
				.slice(0, 60);
			const expired = BigInt(m.expiredAt) > 0n && Number(m.expiredAt) < now;
			const label = `${msg || `Module ${m.module.slice(0, 8)}`}${expired ? ' (expired)' : ''}`;
			return [m.module.toLowerCase(), label];
		})
	);
}

/**
 * The module of every indexed bridge swap, by transaction. The bridges do not pay the DAO from their own address: the fee
 * arrives from the Morpho vault, as a fresh mint or from another wallet, so what makes it bridge revenue is that it
 * landed in the transaction of a swap.
 */
async function loadSwaps(): Promise<Map<string, string[]>> {
	const out = new Map<string, string[]>();
	for (let after: string | null = null; ; ) {
		const r = await fetch(INDEXER, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				query: `query($after: String) { swapBridgeMorphoV1Swaps(where: { chainId: ${mainnet.id} }, orderBy: "created", orderDirection: "asc", limit: 1000, after: $after) { items { module txHash } pageInfo { hasNextPage endCursor } } }`,
				variables: { after },
			}),
		});
		if (!r.ok) throw new Error(`indexer ${r.status}`);
		const j = (await r.json()) as {
			data?: {
				swapBridgeMorphoV1Swaps: {
					items: { module: string; txHash: string }[];
					pageInfo: { hasNextPage: boolean; endCursor: string | null };
				};
			};
		};
		const page = j.data?.swapBridgeMorphoV1Swaps;
		if (!page) throw new Error('indexer: no swap list');
		for (const x of page.items) {
			const hash = x.txHash.toLowerCase();
			out.set(hash, [...(out.get(hash) ?? []), x.module.toLowerCase()]);
		}
		if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) return out;
		after = page.pageInfo.endCursor;
	}
}

/** The curated address book of the indexer: exchanges, multisigs and the like, so they are not mistaken for wallets */
async function loadBook(): Promise<Map<string, { label: string; kind: string }>> {
	const r = await fetch(`${INDEXER}/godeye/addressbook?chainId=${mainnet.id}`);
	if (!r.ok) throw new Error(`indexer ${r.status}`);
	const rows = (await r.json()) as { address: string; label: string; kind: string }[];
	return new Map(rows.map((e) => [e.address.toLowerCase(), { label: e.label, kind: e.kind }]));
}

async function build(): Promise<DaoTransfers> {
	const [, modules, book, swaps] = await Promise.all([refreshHistory(), loadModules(), loadBook(), loadSwaps()]);

	const peerOf = (a: string): { kind: DaoPeerKind; label: string | null } => {
		if (a === ZERO || a === DAO) return { kind: 'other', label: null };
		const bridge = BRIDGES.get(a);
		if (bridge) return { kind: 'module', label: bridge };
		const entry = book.get(a);
		if (entry)
			return entry.kind === 'minter'
				? { kind: 'module', label: entry.label }
				: { kind: entry.kind === 'wallet' ? 'wallet' : 'other', label: null };
		if (STATIC_MODULES.has(a)) return { kind: 'module', label: STATIC_MODULES.get(a)! };
		if (STATIC_OTHER.has(a)) return { kind: 'other', label: null };
		const registered = modules.get(a);
		return registered ? { kind: 'module', label: registered } : { kind: 'wallet', label: null };
	};

	const transfers: DaoTransfer[] = [];
	let ignored = 0;
	for (const t of history.raw.values()) {
		const coin = DAO_COINS[t.rawContract.address?.toLowerCase() ?? ''];
		if (!coin || !t.rawContract.value || !t.rawContract.decimal) {
			ignored++;
			continue;
		}
		const from = t.from.toLowerCase();
		const dir = from === DAO ? 'out' : 'in';
		// what reaches the DAO in the transaction of a bridge swap is that bridge's fee, whoever sent it. A transaction can
		// pass through two bridges (EURU to CHFU), then the fee belongs to the one of the coin's own currency.
		const mods = dir === 'in' ? swaps.get(t.hash.toLowerCase()) : undefined;
		const bridge = mods && (mods.find((m) => BRIDGE_CURRENCY.get(m) === coin.currency) ?? mods[0]);
		const peer = bridge ?? (dir === 'out' ? t.to.toLowerCase() : from);
		transfers.push({
			txHash: t.hash,
			t: Math.floor(Date.parse(t.metadata.blockTimestamp) / 1000),
			dir,
			peer,
			...(bridge ? { kind: 'module' as const, label: BRIDGES.get(bridge) ?? null } : peerOf(peer)),
			coin: coin.symbol,
			currency: coin.currency,
			amount: Number(formatUnits(BigInt(t.rawContract.value), Number(t.rawContract.decimal))),
		});
	}
	transfers.sort((a, b) => a.t - b.t);
	return { transfers, ignored, updated: Math.floor(Date.now() / 1000) };
}

/**
 * GET /api/dao/transfers: every transfer of a counted coin (the three stablecoins and the coins backing them) into and
 * out of the DAO wallet, each with who was on the other side. The chain is only read when somebody asks and the state is
 * older than a few minutes, and then only from the last block on, so any number of visitors share very few requests.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');
	try {
		sendJson(res, await cachedSwr('dao-transfers', TTL, build), 60);
	} catch (e) {
		console.error('dao transfers', e);
		sendError(res, 502, 'Failed to load the DAO transfers');
	}
}
