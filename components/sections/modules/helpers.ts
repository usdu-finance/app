import { mainnet } from 'viem/chains';
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
	morpho: { name: 'Morpho / vault adapter', color: '#2563eb' },
	bridge: { name: 'Swap bridge', color: '#db2777' },
	streamer: { name: 'Streamer / savings', color: '#16a34a' },
	other: { name: 'Other', color: '#64748b' },
};

/** Derives the module type from its free-text message (same heuristics as the indexer's godeye labels). */
export function getModuleType(message: string | undefined): ModuleType {
	const m = message ?? '';
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
			syntheticModules.push({
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
			});
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

/**
 * Determines module status from the latest history entry of this module on this stablecoin:
 * expired wins, then Set = active, Proposed = pending, Revoked = revoked.
 */
export function getModuleStatus(
	module: StablecoinModule,
	historyByModule: Record<string, StablecoinModuleHistoryItem[]>
) {
	const latestKind = historyByModule[moduleKey(module.stablecoin, module.module)]?.[0]?.kind;

	let status: ModuleStatusKey = 'unknown';
	if (module.isExpired) status = 'expired';
	else if (latestKind === 'Set') status = 'active';
	else if (latestKind === 'Proposed') status = 'pending';
	else if (latestKind === 'Revoked') status = 'revoked';

	return { status, ...STATUS_STYLE[status] };
}
