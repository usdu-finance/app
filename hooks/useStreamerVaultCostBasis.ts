import { useQuery, gql } from '@apollo/client';
import { mainnet } from 'viem/chains';
import { APP_REFETCH } from '@/lib/constants';

// Cumulative deposits and withdrawals of one account in one vault, from the indexer's ERC4626Position
const GET_ERC4626_POSITION = gql`
	query GetERC4626Position($chainId: Int!, $vault: String!, $account: String!) {
		eRC4626Positions(where: { chainId: $chainId, vault: $vault, account: $account }) {
			items {
				deposited
				withdrawn
			}
		}
	}
`;

export interface VaultCostBasis {
	deposited: bigint; // cumulative assets deposited
	withdrawn: bigint; // cumulative assets withdrawn
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch an account's cumulative deposits and withdrawals in a vault.
 * Earnings = current value of the shares + withdrawn - deposited.
 * Shares moved between wallets by plain transfer are not part of the cost basis.
 * @param vault - Vault address
 * @param account - Share owner
 */
export function useStreamerVaultCostBasis(vault: string | undefined, account: string | undefined): VaultCostBasis {
	const { data, loading, error } = useQuery(GET_ERC4626_POSITION, {
		variables: { chainId: mainnet.id, vault: vault?.toLowerCase(), account: account?.toLowerCase() },
		skip: !vault || !account,
		pollInterval: APP_REFETCH,
	});

	const position = data?.eRC4626Positions?.items?.[0];

	return {
		deposited: BigInt(position?.deposited ?? 0),
		withdrawn: BigInt(position?.withdrawn ?? 0),
		isLoading: loading && !data,
		error: error?.message ?? null,
	};
}
