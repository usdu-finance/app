import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { IModuleRevenueV1_ABI } from '@usdu-finance/usdu-core';
import { parseUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { APP_REFETCH } from '@/lib/constants';
import { USDU_CURVE_ADAPTER_V1_1_USDC_2 } from '@/lib/whitelisted-tokens';
import { usePoolData } from './usePoolData';
import { useCurveSeedAdapter, type SeedAdapterLeg } from './useCurveSeedAdapter';

/** Raw on-chain figures of a module (18 decimals). Missing when the module does not implement or reverts the call. */
export interface ModuleFigures {
	debt?: bigint; // totalMinted
	funds?: bigint; // totalAssets
	revenue?: bigint; // totalRevenue
	/** modules registered on several stablecoins that report per stablecoin (CurveSeedAdapterV1), keyed by symbol */
	byCurrency?: Record<string, SeedAdapterLeg>;
}

const FNS = ['totalMinted', 'totalAssets', 'totalRevenue'] as const;

/**
 * Reads totalMinted / totalAssets / totalRevenue (IModuleRevenueV1) for the given module addresses.
 * These are properties of the module contract itself, not per stablecoin, so the map is keyed by module address (lowercase).
 * Failed calls are simply left out.
 */
export function useModuleFigures(addresses: string[]): Map<string, ModuleFigures> {
	const { virtualPrice, adapterLPBalance } = usePoolData();
	const seedAdapter = useCurveSeedAdapter();
	const unique = useMemo(() => [...new Set(addresses.map((a) => a.toLowerCase()))].sort(), [addresses]);

	const contracts = useMemo(
		() =>
			unique.flatMap((a) =>
				FNS.map((functionName) => ({ chainId: mainnet.id, address: a as `0x${string}`, abi: IModuleRevenueV1_ABI, functionName }))
			),
		[unique]
	);

	const { data } = useReadContracts({
		contracts,
		allowFailure: true,
		query: { enabled: unique.length > 0, refetchInterval: APP_REFETCH },
	});

	return useMemo(() => {
		const out = new Map<string, ModuleFigures>();
		if (!data) return out;
		unique.forEach((a, i) => {
			const pick = (k: number) => {
				const r = data[i * FNS.length + k];
				return r?.status === 'success' && typeof r.result === 'bigint' ? r.result : undefined;
			};
			const f: ModuleFigures = { debt: pick(0), funds: pick(1), revenue: pick(2) };
			// same override as useModulesFinancials: the Curve adapter holds LP tokens
			if (a === USDU_CURVE_ADAPTER_V1_1_USDC_2.toLowerCase() && virtualPrice && adapterLPBalance)
				f.funds = (virtualPrice * adapterLPBalance) / parseUnits('1', 18);
			// the seed adapter is no IModuleRevenueV1: debt and funds come from its debts mapping and LP holdings
			if (seedAdapter && a === seedAdapter.address.toLowerCase()) f.byCurrency = seedAdapter.byCurrency;
			out.set(a, f);
		});
		return out;
	}, [data, unique, virtualPrice, adapterLPBalance, seedAdapter]);
}
