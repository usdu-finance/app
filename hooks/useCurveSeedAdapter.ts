import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { erc20Abi } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS, CurveSeedAdapterV1_ABI, ITwocrypto_ABI } from '@usdu-finance/usdu-core';
import { APP_REFETCH } from '@/lib/constants';

/** Debt and funds of the seed adapter in one stablecoin (18 decimals, in that stablecoin's own units). */
export interface SeedAdapterLeg {
	debt: bigint;
	funds: bigint;
}

export interface CurveSeedAdapterData {
	address: `0x${string}`;
	/** keyed by stablecoin symbol (USDU, EURU, CHFU) */
	byCurrency: Record<string, SeedAdapterLeg>;
}

const addresses = ADDRESS[mainnet.id];

const ADAPTER = addresses.curveSeedAdapterV1 as `0x${string}`;

// USDU is coin(0) of every pool, the paired stablecoin is coin(1)
const POOLS = [
	{ pool: addresses.curveTwocryptoNG_USDUEURU as `0x${string}`, other: 'EURU' },
	{ pool: addresses.curveTwocryptoNG_USDUCHFU as `0x${string}`, other: 'CHFU' },
] as const;

const TOKENS = [
	{ currency: 'USDU', address: addresses.usduStable as `0x${string}` },
	{ currency: 'EURU', address: addresses.euruStable as `0x${string}` },
	{ currency: 'CHFU', address: addresses.chfuStable as `0x${string}` },
] as const;

const CALLS_PER_POOL = 4;
const ONE = 10n ** 18n;

/**
 * The CurveSeedAdapterV1 is not an IModuleRevenueV1 module: it keeps a per-pool, per-leg `debts` mapping
 * and holds its assets as LP tokens of the pools it seeded (plus any loose token balance). Both legs of a
 * pool are minted on a different stablecoin, so everything is reported per stablecoin:
 * - debt: sum of `debts(pool)` for that leg over all pools
 * - funds: the LP position valued in USDU as lp * virtual_price * 2 * sqrt(price_scale) (the pool's value at
 *   the rate it was seeded at, moving only with accrued fees; lp_price() follows price_oracle and understates
 *   it while the oracle sits below price_scale), split 50/50 between the two legs (the other half converted
 *   at price_scale), plus the adapter's loose token balance
 * Returns undefined until all reads succeeded.
 */
export function useCurveSeedAdapter(): CurveSeedAdapterData | undefined {
	const contracts = useMemo(
		() => [
			...POOLS.flatMap(({ pool }) => [
				{ chainId: mainnet.id, address: ADAPTER, abi: CurveSeedAdapterV1_ABI, functionName: 'debts', args: [pool] } as const,
				{ chainId: mainnet.id, address: pool, abi: ITwocrypto_ABI, functionName: 'balanceOf', args: [ADAPTER] } as const,
				{ chainId: mainnet.id, address: pool, abi: ITwocrypto_ABI, functionName: 'get_virtual_price' } as const,
				{ chainId: mainnet.id, address: pool, abi: ITwocrypto_ABI, functionName: 'price_scale' } as const,
			]),
			...TOKENS.map(
				({ address }) => ({ chainId: mainnet.id, address, abi: erc20Abi, functionName: 'balanceOf', args: [ADAPTER] }) as const
			),
		],
		[]
	);

	const { data } = useReadContracts({
		contracts,
		allowFailure: true,
		query: { refetchInterval: APP_REFETCH },
	});

	return useMemo(() => {
		if (!data || data.some((r) => r.status !== 'success')) return undefined;
		const byCurrency: Record<string, SeedAdapterLeg> = {};
		TOKENS.forEach((t, i) => {
			// loose balance counted once per token, not once per pool
			byCurrency[t.currency] = { debt: 0n, funds: data[POOLS.length * CALLS_PER_POOL + i].result as bigint };
		});

		POOLS.forEach(({ other }, p) => {
			const r = (k: number) => data[p * CALLS_PER_POOL + k].result;
			const debt = r(0) as readonly [bigint, bigint];
			const lp = r(1) as bigint;
			const virtualPrice = r(2) as bigint; // 1e18, only grows with fees
			const priceScale = r(3) as bigint; // coin1 in USDU, 1e18
			const sqrtScale = BigInt(Math.floor(Math.sqrt(Number(priceScale) / 1e18) * 1e18));

			// the position is valued as a whole and split in half, as it was seeded: the pool's current
			// balance skew (swaps) must not shift value from one leg to the other
			const half = (((lp * virtualPrice) / ONE) * sqrtScale) / ONE;
			byCurrency.USDU.debt += debt[0];
			byCurrency.USDU.funds += half;
			byCurrency[other].debt += debt[1];
			byCurrency[other].funds += priceScale > 0n ? (half * ONE) / priceScale : 0n;
		});

		return { address: ADAPTER, byCurrency };
	}, [data]);
}
