import type { StablecoinModule, StablecoinModuleHistoryItem } from '@/hooks/useModulesData';

/**
 * Groups history items by module address
 */
export function groupHistoryByModule(history: StablecoinModuleHistoryItem[]) {
	const grouped: Record<string, StablecoinModuleHistoryItem[]> = {};
	history.forEach((item) => {
		const moduleAddress = item.module.toLowerCase();
		if (!grouped[moduleAddress]) {
			grouped[moduleAddress] = [];
		}
		grouped[moduleAddress].push(item);
	});
	return grouped;
}

/**
 * Creates synthetic modules from pending proposals that don't have a mapping yet
 */
export function createAllModules(
	modules: StablecoinModule[],
	historyByModule: Record<string, StablecoinModuleHistoryItem[]>
) {
	const moduleAddresses = new Set(modules.map((m) => m.module.toLowerCase()));
	const syntheticModules: StablecoinModule[] = [];

	// Find pending proposals without a module mapping and create synthetic modules
	Object.entries(historyByModule).forEach(([moduleAddress, items]) => {
		if (moduleAddresses.has(moduleAddress)) return;

		const latestItem = items[0];

		// Only create synthetic module if latest status is "Proposed" (pending)
		if (latestItem.kind === 'Proposed') {
			const now = BigInt(Math.floor(Date.now() / 1000));
			const syntheticModule: StablecoinModule = {
				chainId: latestItem.chainId,
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
			syntheticModules.push(syntheticModule);
		}
	});

	return [...modules, ...syntheticModules];
}

/**
 * Determines module status based on latest history
 */
export function getModuleStatus(
	module: StablecoinModule,
	historyByModule: Record<string, StablecoinModuleHistoryItem[]>
) {
	const moduleHistory = historyByModule[module.module.toLowerCase()] || [];
	const latestHistory = moduleHistory[0];

	if (module.isExpired) {
		return { status: 'expired', label: 'Expired', color: 'text-gray-500', bgColor: 'bg-gray-100' };
	}

	if ((!module.isExpired && latestHistory?.kind === 'Revoked') || latestHistory?.kind === 'Set') {
		return { status: 'active', label: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
	}

	if (latestHistory?.kind === 'Proposed') {
		return { status: 'pending', label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
	}

	if (latestHistory?.kind === 'Revoked') {
		return { status: 'revoked', label: 'Revoked', color: 'text-red-600', bgColor: 'bg-red-100' };
	}

	return { status: 'unknown', label: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100' };
}

/**
 * Sorts modules by status: pending first, then active, then revoked, then expired
 */
export function sortModules(
	allModules: StablecoinModule[],
	historyByModule: Record<string, StablecoinModuleHistoryItem[]>
) {
	return [...allModules].sort((a, b) => {
		const statusA = getModuleStatus(a, historyByModule);
		const statusB = getModuleStatus(b, historyByModule);

		const statusOrder = { pending: 0, active: 1, revoked: 3, expired: 4, unknown: 5 };
		return (
			statusOrder[statusA.status as keyof typeof statusOrder] -
			statusOrder[statusB.status as keyof typeof statusOrder]
		);
	});
}
