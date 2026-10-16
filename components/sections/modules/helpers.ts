import { mainnet } from 'viem/chains';
import { formatUnits } from 'viem';
import { formatCurrency, FormatType, formatTimestampLocale } from '@/lib/utils';
import { ADDRESS } from '@usdu-finance/usdu-core';
import type { StablecoinModule, StablecoinModuleHistoryItem } from '@/hooks/useModulesData';

const addresses = ADDRESS[mainnet.id];

/** Currencies a module can be registered on, with the stablecoin address of each. */
export const MODULE_CURRENCIES = [
	{ currency: 'USDU', stablecoin: addresses.usduStable },
	{ currency: 'EURU', stablecoin: addresses.euruStable },
	{ currency: 'CHFU', stablecoin: addresses.chfuStable },
] as const;

/** Returns the currency symbol for a stablecoin address, or undefined if it isn't a known stablecoin. */
export function getModuleCurrency(stablecoin: string | undefined): string | undefined {
	return MODULE_CURRENCIES.find((c) => c.stablecoin.toLowerCase() === stablecoin?.toLowerCase())?.currency;
}

/** Key of one module on one stablecoin. A module can be registered on several stablecoins, each with its own flow. */
export function moduleKey(stablecoin: string, module: string): string {
	return `${stablecoin}:${module}`.toLowerCase();
}

export type ModuleType = 'curve' | 'morpho' | 'bridge' | 'streamer' | 'other';

export const MODULE_TYPES: Record<ModuleType, { name: string; color: string }> = {
	curve: { name: 'Curve adapter', color: '#0d9488' },
	morpho: { name: 'Vault adapter', color: '#2563eb' },
	bridge: { name: 'Swap bridge', color: '#db2777' },
	streamer: { name: 'Streamer / savings', color: '#16a34a' },
	other: { name: 'Other', color: '#64748b' },
};

/** Derives the module type from its free-text message (same heuristics as the indexer's godeye labels). */
export function getModuleType(message: string | undefined): ModuleType {
	const m = message ?? '';
	if (/swap ?bridge/i.test(m)) return 'bridge';
	if (/saving|streamer|reward/i.test(m)) return 'streamer';
	if (/curve|pool|uniswap/i.test(m)) return 'curve';
	if (/morpho|vault|termmax/i.test(m)) return 'morpho';
	if (/bridge|swap/i.test(m)) return 'bridge';
	return 'other';
}

export type ModuleStatusKey = 'pending' | 'active' | 'revoked' | 'expired' | 'unknown';

export const STATUS_ORDER: Record<ModuleStatusKey, number> = { pending: 0, active: 1, revoked: 2, expired: 3, unknown: 4 };

/**
 * Groups history items by stablecoin + module (see moduleKey), newest first
 */
export function groupHistoryByModule(history: StablecoinModuleHistoryItem[]) {
	const grouped: Record<string, StablecoinModuleHistoryItem[]> = {};
	history.forEach((item) => {
		const key = moduleKey(item.stablecoin, item.module);
		if (!grouped[key]) {
			grouped[key] = [];
		}
		grouped[key].push(item);
	});
	Object.values(grouped).forEach((items) =>
		items.sort((a, b) =>
			a.createdAt === b.createdAt ? b.logIndex - a.logIndex : a.createdAt < b.createdAt ? 1 : -1
		)
	);
	return grouped;
}

/**
 * Creates synthetic modules from pending proposals that don't have a mapping yet
 */
/** modules created from a pending proposal only (no mapping on chain yet) */
const SYNTHETIC = new WeakSet<StablecoinModule>();

export function createAllModules(
	modules: StablecoinModule[],
	historyByModule: Record<string, StablecoinModuleHistoryItem[]>
) {
	const mapped = new Set(modules.map((m) => moduleKey(m.stablecoin, m.module)));
	const syntheticModules: StablecoinModule[] = [];

	// Find pending proposals without a module mapping (on that stablecoin) and create synthetic modules
	Object.entries(historyByModule).forEach(([key, items]) => {
		if (mapped.has(key)) return;

		const latestItem = items[0];

		// Only create synthetic module if latest status is "Proposed" (pending)
		if (latestItem.kind === 'Proposed') {
			const now = BigInt(Math.floor(Date.now() / 1000));
			const synthetic: StablecoinModule = {
				chainId: latestItem.chainId,
				stablecoin: latestItem.stablecoin,
				module: latestItem.module,
				message: latestItem.message,
				messageUpdated: null,
				createdAt: latestItem.createdAt,
				updatedAt: latestItem.createdAt,
				expiredAt: latestItem.expiredAt || BigInt(0),
				txHash: latestItem.txHash,
				logIndex: latestItem.logIndex,
				blockheight: latestItem.blockheight,
				caller: latestItem.caller,
				isExpired: latestItem.expiredAt ? latestItem.expiredAt < now : false,
			};
			SYNTHETIC.add(synthetic);
			syntheticModules.push(synthetic);
		}
	});

	return [...modules, ...syntheticModules];
}

const STATUS_STYLE = {
	expired: { label: 'Expired', color: 'text-gray-500', bgColor: 'bg-gray-100' },
	active: { label: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' },
	pending: { label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
	revoked: { label: 'Revoked', color: 'text-red-600', bgColor: 'bg-red-100' },
	unknown: { label: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100' },
} as const;

/** An open proposal (SubmitModule not yet accepted or revoked) for a module on one stablecoin. */
export interface PendingProposal {
	message: string;
	/** expiry the module gets once the proposal is accepted */
	expiredAt: bigint | null;
	timelock: bigint | null;
	createdAt: bigint;
	/** unix seconds when acceptModule becomes callable (createdAt + timelock) */
	readyAt: number | null;
	/** timelock elapsed: anyone can call acceptModule, until then it can still be revoked */
	ready: boolean;
}

/** Expiry label; maxUint256-like values mean "never". */
export function expiryText(v: bigint | null | undefined): string {
	if (v === null || v === undefined) return '—';
	return v >= BigInt(10) ** BigInt(12) ? 'Never' : formatTimestampLocale(v);
}

/** "ready to apply" or "applies in 3d 4h" */
export function proposalTiming(p: PendingProposal): string {
	if (p.readyAt === null) return 'timelock unknown';
	if (p.ready) return 'ready to apply';
	const r = p.readyAt - Math.floor(Date.now() / 1000);
	const d = Math.floor(r / 86400);
	const h = Math.floor((r % 86400) / 3600);
	return `applies in ${d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((r % 3600) / 60)}m`}`;
}

/**
 * Two independent facts per (stablecoin, module):
 * - base status, from the on-chain mapping: active until its expiry, then expired. A module that only exists as a
 *   proposal (no mapping yet) is "pending". (A 'Revoked' history item revokes a pending PROPOSAL, never the module.)
 * - pending proposal: the newest history item when it is a 'Proposed' (a later Set or Revoked closes it), e.g. an active
 *   module with a proposal that changes its expiry. Per Stablecoin.sol the proposal becomes acceptable after
 *   createdAt + timelock (acceptModule is permissionless) and stays open until accepted or revoked.
 */
export function getModuleStatus(
	module: StablecoinModule,
	historyByModule: Record<string, StablecoinModuleHistoryItem[]>
) {
	const latest = historyByModule[moduleKey(module.stablecoin, module.module)]?.[0];

	let status: ModuleStatusKey = 'unknown';
	if (SYNTHETIC.has(module)) status = 'pending';
	else if (module.isExpired) status = 'expired';
	else if (module.expiredAt > BigInt(0)) status = 'active';

	let pending: PendingProposal | null = null;
	if (latest?.kind === 'Proposed') {
		const readyAt = latest.timelock !== null ? Number(BigInt(latest.createdAt) + BigInt(latest.timelock)) : null;
		pending = {
			message: latest.message,
			expiredAt: latest.expiredAt,
			timelock: latest.timelock,
			createdAt: latest.createdAt,
			readyAt,
			ready: readyAt !== null && Math.floor(Date.now() / 1000) >= readyAt,
		};
	}

	return { status, pending, ...STATUS_STYLE[status] };
}

/** Status filter / tab match: a module with an open proposal matches "pending" in addition to its base status. */
export function matchesStatus(s: { status: ModuleStatusKey; pending: PendingProposal | null }, filter: 'all' | ModuleStatusKey) {
	return filter === 'all' || s.status === filter || (filter === 'pending' && !!s.pending);
}

/** "12.3k CHFU" style figure from an 18-decimals amount; null when the module did not report it. */
export function formatFigure(raw: bigint | undefined, symbol?: string): string | null {
	if (raw === undefined) return null;
	const n = Number(formatUnits(raw, 18));
	const s = n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}k` : (formatCurrency(n, 0, 2, FormatType.us) ?? '0');
	return symbol ? `${s} ${symbol}` : s;
}

export interface FigureRow {
	label: 'Debt' | 'Funds' | 'Claimable' | 'Revenue';
	value: string;
	/** negative claimable = deficit, rendered red */
	negative?: boolean;
	title?: string;
}

/** Debt (totalMinted), Funds (totalAssets), Claimable (assets - debt, unrealized), Revenue (totalRevenue, realized). Missing values are omitted. */
export function figureRows(f: { debt?: bigint; funds?: bigint; revenue?: bigint } | undefined, symbol?: string): FigureRow[] {
	if (!f) return [];
	const rows: FigureRow[] = [];
	const add = (label: FigureRow['label'], v: string | null, extra?: Partial<FigureRow>) => v && rows.push({ label, value: v, ...extra });
	add('Debt', formatFigure(f.debt, symbol), { title: 'totalMinted' });
	add('Funds', formatFigure(f.funds, symbol), { title: 'totalAssets' });
	if (f.debt !== undefined && f.funds !== undefined) {
		const d = f.funds - f.debt;
		add('Claimable', d < 0n ? `−${formatFigure(-d, symbol)}` : formatFigure(d, symbol), {
			negative: d < 0n,
			title: d < 0n ? 'Deficit: assets are below debt' : 'Unrealized: assets minus debt',
		});
	}
	add('Revenue', formatFigure(f.revenue, symbol), { title: 'Realized: totalRevenue' });
	return rows;
}
