import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { erc20Abi } from 'viem';
import { mainnet } from 'viem/chains';
import { StreamerVaultV1_ABI } from '@usdu-finance/usdu-core';
import { APP_REFETCH } from '@/lib/constants';

export interface StreamerVaultPosition {
	assetBalanceRaw: bigint; // wallet balance of the staked stablecoin
	allowanceRaw: bigint; // stablecoin allowance to the vault
	sharesRaw: bigint; // wallet balance of vault shares (rUSDU, ...)
	stakedRaw: bigint; // current value of the shares in stablecoin
	priceRaw: bigint; // stablecoin per 1e18 shares
	previewShares: bigint; // shares minted for `depositRaw`
	previewAssets: bigint; // stablecoin returned for `redeemRaw`
	isLoading: boolean;
	refetch: () => void;
}

/**
 * Reads a wallet's position in a StreamerVaultV1 plus deposit/redeem previews
 * @param vault - StreamerVaultV1 address
 * @param asset - Stablecoin staked in the vault
 * @param owner - Connected wallet address
 * @param depositRaw - Stablecoin amount to preview a deposit for
 * @param redeemRaw - Share amount to preview a redeem for
 */
export function useStreamerVaultPosition(
	vault: `0x${string}` | undefined,
	asset: `0x${string}` | undefined,
	owner: `0x${string}` | undefined,
	depositRaw: bigint = 0n,
	redeemRaw: bigint = 0n
): StreamerVaultPosition {
	const contracts = useMemo(() => {
		if (!vault || !asset || !owner) return [];
		return [
			{ chainId: mainnet.id, address: asset, abi: erc20Abi, functionName: 'balanceOf' as const, args: [owner] },
			{ chainId: mainnet.id, address: asset, abi: erc20Abi, functionName: 'allowance' as const, args: [owner, vault] },
			{ chainId: mainnet.id, address: vault, abi: StreamerVaultV1_ABI, functionName: 'balanceOf' as const, args: [owner] },
			{ chainId: mainnet.id, address: vault, abi: StreamerVaultV1_ABI, functionName: 'price' as const },
		];
	}, [vault, asset, owner]);

	const { data, isLoading, refetch } = useReadContracts({
		contracts,
		query: { enabled: contracts.length > 0, refetchInterval: APP_REFETCH },
	});

	const shares = (data?.[2]?.result as bigint | undefined) ?? 0n;

	const { data: stakedData, refetch: refetchStaked } = useReadContract({
		chainId: mainnet.id,
		address: vault,
		abi: StreamerVaultV1_ABI,
		functionName: 'convertToAssets',
		args: [shares],
		query: { enabled: !!vault && shares > 0n, refetchInterval: APP_REFETCH },
	});

	const { data: previewShares } = useReadContract({
		chainId: mainnet.id,
		address: vault,
		abi: StreamerVaultV1_ABI,
		functionName: 'previewDeposit',
		args: [depositRaw],
		query: { enabled: !!vault && depositRaw > 0n },
	});

	const { data: previewAssets } = useReadContract({
		chainId: mainnet.id,
		address: vault,
		abi: StreamerVaultV1_ABI,
		functionName: 'previewRedeem',
		args: [redeemRaw],
		query: { enabled: !!vault && redeemRaw > 0n },
	});

	return {
		assetBalanceRaw: (data?.[0]?.result as bigint | undefined) ?? 0n,
		allowanceRaw: (data?.[1]?.result as bigint | undefined) ?? 0n,
		sharesRaw: shares,
		stakedRaw: shares > 0n ? ((stakedData as bigint | undefined) ?? 0n) : 0n,
		priceRaw: (data?.[3]?.result as bigint | undefined) ?? 10n ** 18n,
		previewShares: depositRaw > 0n ? ((previewShares as bigint | undefined) ?? 0n) : 0n,
		previewAssets: redeemRaw > 0n ? ((previewAssets as bigint | undefined) ?? 0n) : 0n,
		isLoading,
		refetch: () => {
			refetch();
			refetchStaked();
		},
	};
}
