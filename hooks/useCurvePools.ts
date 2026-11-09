import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { useQuery } from '@tanstack/react-query';
import { fetchCurvePoolsData, type CurvePoolConfig, type CurvePoolData } from '@/lib/onchain/curve';
import { PERSISTED_KEY } from '@/lib/query/persist';
import { USDC_MAINNET } from '@/lib/whitelisted-tokens';
import { normalizeAddress } from '@/lib/utils';
import { APP_REFETCH } from '@/lib/constants';

export interface CurveToken {
	symbol: string;
	address: `0x${string}`;
	decimals: number;
}

export interface CurvePool extends CurvePoolConfig, CurvePoolData {
	label: string;
	tokens: [CurveToken, CurveToken];
}

/** Pools that pair with USDC redeem out of the ecosystem; every other pool is an FX pool inside it. */
export function isRedeemPool(pool: CurvePool): boolean {
	return pool.tokens.some((t) => normalizeAddress(t.address) === normalizeAddress(USDC_MAINNET));
}

export interface CurvePoolsData {
	pools: CurvePool[];
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch every Curve pool the swap pages support (stable and twocrypto), normalised to the
 * same two-token shape so the list and detail pages stay pool-agnostic.
 * @param chainId - Chain ID to query (defaults to mainnet)
 * @returns Available Curve pools with balances, LP supply and composition
 */
export function useCurvePools(chainId: number = mainnet.id): CurvePoolsData {
	const addresses = chainId === mainnet.id ? ADDRESS[mainnet.id] : undefined;

	const registry = useMemo(() => {
		if (!addresses) return [];

		const usdc: CurveToken = { symbol: 'USDC', address: USDC_MAINNET, decimals: 6 };
		const usdu: CurveToken = { symbol: 'USDU', address: addresses.usduStable as `0x${string}`, decimals: 18 };
		const euru: CurveToken = { symbol: 'EURU', address: addresses.euruStable as `0x${string}`, decimals: 18 };
		const chfu: CurveToken = { symbol: 'CHFU', address: addresses.chfuStable as `0x${string}`, decimals: 18 };

		const pool = (key: string, kind: CurvePoolConfig['kind'], poolAddress: string, tokens: [CurveToken, CurveToken]) => ({
			key,
			kind,
			poolAddress: poolAddress as `0x${string}`,
			decimals: [tokens[0].decimals, tokens[1].decimals] as [number, number],
			label: `${tokens[0].symbol} / ${tokens[1].symbol}`,
			tokens,
		});

		return [
			pool('usdc-usdu', 'stable', addresses.curveStableSwapNG_USDCUSDU, [usdc, usdu]),
			pool('usdu-euru', 'twocrypto', addresses.curveTwocryptoNG_USDUEURU, [usdu, euru]),
			pool('usdu-chfu', 'twocrypto', addresses.curveTwocryptoNG_USDUCHFU, [usdu, chfu]),
		];
	}, [addresses]);

	const configs = useMemo<CurvePoolConfig[]>(
		() => registry.map(({ key, kind, poolAddress, decimals }) => ({ key, kind, poolAddress, decimals })),
		[registry]
	);

	const {
		data: poolsData,
		isLoading,
		error,
	} = useQuery({
		queryKey: [PERSISTED_KEY, 'curve-pools', configs],
		queryFn: () => fetchCurvePoolsData(configs),
		enabled: configs.length > 0,
		refetchInterval: APP_REFETCH,
		staleTime: 30_000,
	});

	return useMemo(() => {
		if (error) {
			return { pools: [], isLoading: false, error: error.message || 'Failed to fetch pool data' };
		}

		if (!poolsData) {
			return { pools: [], isLoading, error: null };
		}

		const pools: CurvePool[] = registry
			.filter((entry) => poolsData[entry.key])
			.map((entry) => {
				const data = poolsData[entry.key];
				// Cache persisted before `price` existed lacks it; fall back to the price scale until the refetch lands
				return { ...entry, ...data, price: data.price ?? parseFloat(formatUnits(data.priceScale, 18)) };
			});

		return { pools, isLoading: false, error: null };
	}, [poolsData, isLoading, error, registry]);
}
