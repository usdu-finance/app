import { useQuery, gql } from '@apollo/client';
import { mainnet } from 'viem/chains';
import { APP_REFETCH } from '@/lib/constants';

// Deposit/Withdraw history of a vault's shares, optionally scoped to one share owner
const GET_ERC4626_HISTORY = gql`
	query GetERC4626History($chainId: Int!, $vault: String!, $owner: String) {
		eRC4626Historys(where: { chainId: $chainId, vault: $vault, owner: $owner }, orderBy: "created", orderDirection: "desc", limit: 50) {
			items {
				chainId
				vault
				count
				txHash
				created
				blockheight
				kind
				sender
				owner
				receiver
				assets
				shares
			}
		}
	}
`;

export interface VaultHistoryEntry {
	chainId: number;
	vault: string;
	count: string;
	txHash: string;
	created: string;
	blockheight: string;
	kind: 'Deposit' | 'Withdraw';
	sender: string;
	owner: string;
	receiver: string;
	assets: string;
	shares: string;
}

export interface VaultHistoryData {
	entries: VaultHistoryEntry[];
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch the indexed deposit/withdraw history of a StreamerVaultV1
 * @param vault - Vault address
 * @param owner - Only entries of this share owner; all entries when omitted
 */
export function useStreamerVaultHistory(vault: string | undefined, owner?: string): VaultHistoryData {
	const { data, loading, error } = useQuery(GET_ERC4626_HISTORY, {
		variables: { chainId: mainnet.id, vault: vault?.toLowerCase(), owner: owner?.toLowerCase() },
		skip: !vault,
		pollInterval: APP_REFETCH,
	});

	return {
		entries: data?.eRC4626Historys?.items ?? [],
		isLoading: loading && !data,
		error: error?.message ?? null,
	};
}
