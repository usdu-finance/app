import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { APP_REFETCH } from '@/lib/constants';
import { useCurvePools } from '@/hooks/useCurvePools';
import { useModuleDataAll } from '@/hooks/useModulesData';
import { createAllModules, getModuleStatus, groupHistoryByModule } from '@/components/sections/modules/helpers';

export type LandingSymbol = 'USDU' | 'EURU' | 'CHFU';

export interface LandingStats {
	/** Circulating supply per stablecoin, null while loading or when the read failed. */
	supply: Record<LandingSymbol, number | null>;
	/** Combined value of the Curve pools, null while loading or on error. */
	curveTvl: number | null;
	/** Modules that are active right now (per stablecoin), null while loading or on error. */
	activeModules: number | null;
	isLoading: boolean;
}

const A = ADDRESS[mainnet.id];
const COINS: { symbol: LandingSymbol; address: `0x${string}` }[] = [
	{ symbol: 'USDU', address: A.usduStable },
	{ symbol: 'EURU', address: A.euruStable },
	{ symbol: 'CHFU', address: A.chfuStable },
];

/**
 * Live figures for the landing page, all read from chain or the indexer: stablecoin supplies,
 * Curve pool liquidity and the number of active modules. Any figure that cannot be loaded stays null
 * so the page can hide it instead of showing a made-up value.
 */
export function useLandingStats(): LandingStats {
	const { data: supplies, isLoading: suppliesLoading } = useReadContracts({
		contracts: COINS.map((c) => ({
			chainId: mainnet.id,
			address: c.address,
			abi: erc20Abi,
			functionName: 'totalSupply' as const,
		})),
		allowFailure: true,
		query: { refetchInterval: APP_REFETCH },
	});

	const { pools, isLoading: poolsLoading, error: poolsError } = useCurvePools();
	const { modules, history, isLoading: modulesLoading, error: modulesError } = useModuleDataAll(mainnet.id);

	const supply = useMemo(() => {
		const out = { USDU: null, EURU: null, CHFU: null } as Record<LandingSymbol, number | null>;
		COINS.forEach((c, i) => {
			const r = supplies?.[i];
			if (r?.status === 'success' && typeof r.result === 'bigint') out[c.symbol] = Number(formatUnits(r.result, 18));
		});
		return out;
	}, [supplies]);

	const curveTvl = useMemo(
		() => (poolsError || pools.length === 0 ? null : pools.reduce((sum, p) => sum + p.totalValue, 0)),
		[pools, poolsError]
	);

	const activeModules = useMemo(() => {
		if (modulesError || modules.length === 0) return null;
		const byModule = groupHistoryByModule(history);
		return createAllModules(modules, byModule).filter((m) => getModuleStatus(m, byModule).status === 'active').length;
	}, [modules, history, modulesError]);

	return { supply, curveTvl, activeModules, isLoading: suppliesLoading || poolsLoading || modulesLoading };
}
