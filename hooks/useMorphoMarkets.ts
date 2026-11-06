import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { APP_REFETCH } from '@/lib/constants';

const MORPHO_API = 'https://api.morpho.org/graphql';

// Markets with less borrowable liquidity than this are dust and not worth listing
const MIN_LIQUIDITY_USD = 10_000;

const QUERY = `{
	markets(first: 1000, where: { chainId_in: [1], listed: true }) {
		items {
			marketId
			lltv
			loanAsset { symbol address decimals logoURI price { usd } }
			collateralAsset { symbol address decimals logoURI price { usd } }
			state { borrowApy netBorrowApy utilization fee liquidityAssetsUsd supplyAssetsUsd borrowAssetsUsd }
		}
	}
}`;

interface ApiAsset {
	symbol: string;
	address: string;
	decimals: number;
	logoURI: string | null;
	price: { usd: number | null } | null;
}

interface ApiMarket {
	marketId: string;
	lltv: string;
	loanAsset: ApiAsset;
	collateralAsset: ApiAsset | null; // null for idle markets, which cannot be borrowed against
	state: {
		borrowApy: number | null;
		netBorrowApy: number | null;
		utilization: number | null;
		fee: number | null;
		liquidityAssetsUsd: number | null;
		supplyAssetsUsd: number | null;
		borrowAssetsUsd: number | null;
	} | null;
}

export interface MorphoMarket {
	key: string;
	loanSymbol: string;
	loanAddress: string;
	loanLogoURI?: string;
	collateralSymbol: string;
	collateralAddress: string;
	collateralLogoURI?: string;
	/** Loan to value at which a position gets liquidated, 0..1 */
	lltv: number;
	/** Borrow rate, annualised without compounding, 0..1 (net of rewards) */
	borrowApr: number;
	utilization: number;
	/** Share of the interest taken by Morpho, 0..1 */
	protocolFee: number;
	/** Total supplied to the market, in USD */
	sizeUsd: number;
	/** The most that can be borrowed right now (the market's free liquidity), in loan asset and USD */
	maxBorrow: number;
	maxBorrowUsd: number;
	/** Collateral to post to borrow `maxBorrow` when borrowing right up to the LLTV, in collateral asset and USD */
	collateralNeeded: number;
	collateralNeededUsd: number;
	/** Interest on `maxBorrow` over one year, in loan asset and USD */
	yearlyCost: number;
	yearlyCostUsd: number;
}

function toMarket(m: ApiMarket): MorphoMarket | null {
	const { loanAsset, collateralAsset, state } = m;
	const loanPrice = loanAsset.price?.usd;
	const collateralPrice = collateralAsset?.price?.usd;
	if (!collateralAsset || !state || !loanPrice || !collateralPrice) return null;

	const lltv = Number(m.lltv) / 1e18;
	const liquidityUsd = state.liquidityAssetsUsd ?? 0;
	if (!lltv || liquidityUsd < MIN_LIQUIDITY_USD) return null;

	// The API reports an APY (compounded), convert to the APR users compare lending rates against
	const apy = state.netBorrowApy ?? state.borrowApy ?? 0;
	const borrowApr = Math.log1p(apy);

	const maxBorrow = liquidityUsd / loanPrice;
	const collateralNeededUsd = liquidityUsd / lltv;
	const yearlyCostUsd = liquidityUsd * borrowApr;

	return {
		key: m.marketId,
		loanSymbol: loanAsset.symbol,
		loanAddress: loanAsset.address,
		loanLogoURI: loanAsset.logoURI ?? undefined,
		collateralSymbol: collateralAsset.symbol,
		collateralAddress: collateralAsset.address,
		collateralLogoURI: collateralAsset.logoURI ?? undefined,
		lltv,
		borrowApr,
		utilization: state.utilization ?? 0,
		protocolFee: state.fee ?? 0,
		sizeUsd: state.supplyAssetsUsd ?? 0,
		maxBorrow,
		maxBorrowUsd: liquidityUsd,
		collateralNeeded: collateralNeededUsd / collateralPrice,
		collateralNeededUsd,
		yearlyCost: yearlyCostUsd / loanPrice,
		yearlyCostUsd,
	};
}

/**
 * Every borrowable Morpho Blue market on Ethereum (a collateral / loan asset pair), read from Morpho's public API.
 * Idle markets and dust markets are dropped.
 */
export function useMorphoMarkets() {
	const { data, isLoading, error } = useQuery({
		queryKey: ['morpho-markets'],
		queryFn: async () => {
			const res = await fetch(MORPHO_API, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: QUERY }),
			});
			if (!res.ok) throw new Error(`Morpho API responded with ${res.status}`);
			const json = await res.json();
			if (json.errors?.length) throw new Error(json.errors[0].message);
			return json.data.markets.items as ApiMarket[];
		},
		staleTime: APP_REFETCH,
		refetchInterval: APP_REFETCH,
	});

	const markets = useMemo(() => (data ?? []).map(toMarket).filter((m): m is MorphoMarket => m !== null), [data]);

	return { markets, isLoading, error: error ? (error as Error).message : null };
}
