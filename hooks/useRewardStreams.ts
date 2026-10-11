import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS, StreamerVaultV1_ABI } from '@usdu-finance/usdu-core';
import { APP_REFETCH } from '@/lib/constants';

export interface RewardStreamItem {
	key: string;
	name: string;
	symbol: string;
	logoURI: string;
	vault: `0x${string}`;
	asset: `0x${string}`; // the stablecoin staked in the vault
	currency: string;
	staked: number; // asset staked in the streamer vault (excludes still-locked rewards)
	locked: number; // rewards funded but not yet streamed (pending)
	unlocked: number; // rewards funded and already streamed to stakers
	price: number; // asset per share
	supply: number; // shares outstanding
	ratePerDay: number; // asset streamed per day
	apr: number; // percent, annualized from the current stream rate
	daysLeft: number; // until the current stream ends
}

const A = ADDRESS[mainnet.id];

const STREAMS = [
	{
		key: 'rusdu',
		name: 'USDU Rewards',
		symbol: 'rUSDU',
		logoURI: '/coin/rusdu.png',
		vault: A.usduStreamerVaultV1,
		asset: A.usduStable,
		currency: 'USDU',
	},
	{
		key: 'reuru',
		name: 'EURU Rewards',
		symbol: 'rEURU',
		logoURI: '/coin/reuru.png',
		vault: A.euruStreamerVaultV1,
		asset: A.euruStable,
		currency: 'EURU',
	},
	{
		key: 'rchfu',
		name: 'CHFU Rewards',
		symbol: 'rCHFU',
		logoURI: '/coin/rchfu.png',
		vault: A.chfuStreamerVaultV1,
		asset: A.chfuStable,
		currency: 'CHFU',
	},
] as const;

const FUNCTIONS = ['totalAssets', 'locked', 'rate', 'streamEnd', 'totalFunded', 'price', 'totalSupply'] as const;
const DAY = 86_400;

/**
 * Reads the StreamerVaultV1 reward streams for USDU, EURU and CHFU from mainnet.
 */
export function useRewardStreams() {
	const { data, isLoading, error } = useReadContracts({
		contracts: STREAMS.flatMap((s) =>
			FUNCTIONS.map((functionName) => ({
				chainId: mainnet.id,
				address: s.vault,
				abi: StreamerVaultV1_ABI,
				functionName,
			}))
		),
		query: { refetchInterval: APP_REFETCH },
	});

	const streams = useMemo<RewardStreamItem[]>(() => {
		if (!data) return [];
		const now = Math.floor(Date.now() / 1000);
		return STREAMS.map((s, i) => {
			const [assets, locked, rate, streamEnd, funded, price, supply] = FUNCTIONS.map(
				(_, j) => data[i * FUNCTIONS.length + j]?.result
			);
			const staked = Number(formatUnits((assets as bigint) ?? 0n, 18));
			const ratePerDay = Number(formatUnits(((rate as bigint) ?? 0n) * BigInt(DAY), 18));
			const secondsLeft = Math.max(Number((streamEnd as bigint) ?? 0n) - now, 0);
			const lockedAmount = (locked as bigint) ?? 0n;
			const fundedAmount = (funded as bigint) ?? 0n;
			return {
				...s,
				staked,
				locked: Number(formatUnits(lockedAmount, 18)),
				unlocked: Number(formatUnits(fundedAmount > lockedAmount ? fundedAmount - lockedAmount : 0n, 18)),
				price: Number(formatUnits((price as bigint) ?? 10n ** 18n, 18)),
				supply: Number(formatUnits((supply as bigint) ?? 0n, 18)),
				ratePerDay,
				apr: staked > 0 ? ((ratePerDay * 365) / staked) * 100 : 0,
				daysLeft: Math.ceil(secondsLeft / DAY),
			};
		});
	}, [data]);

	return { streams, isLoading, error };
}
