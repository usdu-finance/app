import { useEffect, useState } from 'react';
import { gql, useApolloClient } from '@apollo/client';
import { formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';

const A = ADDRESS[mainnet.id];

/**
 * The swap bridges, found by name in usdu-core's addresses (`<stable>SwapBridgeMorphoV1_<coin vault>_module`), so a
 * bridge added there is picked up here without a change. The stablecoin is the prefix and the backing coin the
 * suffix without its vault prefix, e.g. `euruSwapBridgeMorphoV1_steakEURC_module` is EURU / EURC.
 *
 * Swapping out pays the bridge's fee to the DAO in that backing coin instead of in the stablecoin, so it never shows
 * up in the stablecoin's own transfer history. Each coin counts as one unit of its stablecoin's currency (USDC and
 * USDT for USD, EURC and dEURO for EUR, ZCHF for CHF), which is the same assumption the swap modules make.
 *
 * The bridge also has to be indexed: the indexer only records swaps for the modules listed in its ponder config.
 */
export const SWAP_BRIDGES = Object.entries(A).flatMap(([key, address]) => {
	const m = key.match(/^(usdu|euru|chfu)SwapBridgeMorphoV1_(.+)_module$/);
	if (!m) return [];
	const stable = m[1].toUpperCase();
	return [{ module: String(address).toLowerCase(), stable, coin: m[2].replace(/^steak/, ''), label: `${stable} Bridge ${m[2]}` }];
});

const PAGE = gql`
	query SwapOutFees($chainId: Int!, $after: String) {
		swapBridgeMorphoV1Swaps(
			where: { chainId: $chainId, kind: "SwapOut" }
			orderBy: "created"
			orderDirection: "asc"
			limit: 1000
			after: $after
		) {
			items {
				module
				created
				fee
			}
			pageInfo {
				hasNextPage
				endCursor
			}
		}
	}
`;

interface PageData {
	swapBridgeMorphoV1Swaps: {
		items: { module: string; created: string; fee: string }[];
		pageInfo: { hasNextPage: boolean; endCursor: string | null };
	};
}

export interface SwapOutFee {
	/** lowercase module address */
	module: string;
	/** unix seconds */
	t: number;
	/** fee in the bridge's backing coin, equal to its currency units */
	amount: number;
}

/** Every swap-out fee the bridges have collected, oldest first (all pages). */
export function useSwapOutFees() {
	const client = useApolloClient();
	const [fees, setFees] = useState<SwapOutFee[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let stop = false;
		(async () => {
			try {
				const out: SwapOutFee[] = [];
				let after: string | null = null;
				for (;;) {
					const res: { data?: PageData } = await client.query({
						query: PAGE,
						variables: { chainId: mainnet.id, after },
						fetchPolicy: 'network-only',
					});
					const page = res.data?.swapBridgeMorphoV1Swaps;
					if (!page) throw new Error('no data');
					for (const s of page.items)
						out.push({ module: s.module.toLowerCase(), t: Number(s.created), amount: Number(formatUnits(BigInt(s.fee), 18)) });
					if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
					after = page.pageInfo.endCursor;
				}
				if (!stop) setFees(out);
			} catch (e) {
				if (!stop) setError(e instanceof Error ? e.message : 'request failed');
			} finally {
				if (!stop) setLoading(false);
			}
		})();
		return () => {
			stop = true;
		};
	}, [client]);

	return { fees, loading, error };
}
