import { useQuery, gql } from '@apollo/client';
import { mainnet } from 'viem/chains';
import { APP_REFETCH } from '@/lib/constants';

// Daily vault snapshots written by the indexer's block handler
const GET_ERC4626_DAILY = gql`
	query GetERC4626Daily($chainId: Int!, $vault: String!) {
		eRC4626Dailys(where: { chainId: $chainId, vault: $vault }, orderBy: "day", orderDirection: "asc", limit: 365) {
			items {
				day
				totalAssets
				totalSupply
				price
			}
		}
	}
`;

export interface VaultDailyPoint {
	day: number; // utc midnight, seconds
	tvl: number; // totalAssets
	price: number; // asset per share
	supply: number; // shares outstanding
}

export interface VaultDailyData {
	logs: VaultDailyPoint[];
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch the indexed daily snapshots of a StreamerVaultV1, oldest first
 * @param vault - Vault address
 */
export function useStreamerVaultDaily(vault: string | undefined): VaultDailyData {
	const { data, loading, error } = useQuery(GET_ERC4626_DAILY, {
		variables: { chainId: mainnet.id, vault: vault?.toLowerCase() },
		skip: !vault,
		pollInterval: APP_REFETCH,
	});

	const items: { day: string; totalAssets: string; totalSupply: string; price: string }[] = data?.eRC4626Dailys?.items ?? [];

	const logs = items.map((d) => ({
		day: Number(d.day),
		tvl: Number(d.totalAssets) / 1e18,
		price: Number(d.price) / 1e18,
		supply: Number(d.totalSupply) / 1e18,
	}));

	return {
		logs,
		isLoading: loading && !data,
		error: error?.message ?? null,
	};
}
