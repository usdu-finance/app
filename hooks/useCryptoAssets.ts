import { useMemo } from 'react';
import { useBalance, useReadContracts } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { useQuery } from '@tanstack/react-query';
import { APP_REFETCH } from '@/lib/constants';
import { TOKENS } from '@/lib/tokens/config';
import { fetchCowTokenList } from '@/lib/tokens/cow-service';
import type { WalletAsset } from '@/hooks/useWalletAssets';

const NATIVE_ETH = TOKENS.ETH.address;

// The largest crypto assets by market cap that trade deeply on Ethereum, shown on the dashboard next to the stablecoins
const CRYPTO: { symbol: string; name: string; address: `0x${string}`; decimals: number; logoURI?: string }[] = [
	{ ...TOKENS.ETH, address: NATIVE_ETH as `0x${string}` },
	{ ...TOKENS.WETH, address: TOKENS.WETH.address as `0x${string}` },
	{
		symbol: 'wstETH',
		name: 'Wrapped stETH',
		address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
		decimals: 18,
		logoURI: '/coins/wsteth.svg',
	},
	{ ...TOKENS.WBTC, address: TOKENS.WBTC.address as `0x${string}` },
	{
		symbol: 'cbBTC',
		name: 'Coinbase Wrapped BTC',
		address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
		decimals: 8,
		logoURI: '/coins/cbbtc.png',
	},
	{ symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
	{ symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
	{ symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18 },
];

/**
 * The wallet's balance of the biggest crypto assets, priced in USDU. USDU tracks the dollar, so the USD price from
 * /api/zap/prices (DefiLlama) is used as the USDU price. Zero balances are included.
 */
export function useCryptoAssets(owner: `0x${string}` | undefined) {
	const erc20s = CRYPTO.filter((t) => t.address.toLowerCase() !== NATIVE_ETH.toLowerCase());

	const { data: balances, isLoading: isLoadingBalances } = useReadContracts({
		contracts: owner
			? erc20s.map((t) => ({
					chainId: mainnet.id,
					address: t.address,
					abi: erc20Abi,
					functionName: 'balanceOf' as const,
					args: [owner] as const,
				}))
			: [],
		query: { enabled: !!owner, refetchInterval: APP_REFETCH },
	});
	const { data: eth } = useBalance({ address: owner, chainId: mainnet.id, query: { enabled: !!owner, refetchInterval: APP_REFETCH } });

	const { data: prices, isLoading: isLoadingPrices } = useQuery({
		queryKey: ['crypto-asset-prices'],
		queryFn: async () => {
			const res = await fetch(`/api/zap/prices?tokens=${CRYPTO.map((t) => t.address).join(',')}`);
			if (!res.ok) throw new Error('Failed to load prices');
			return (await res.json()).prices as Record<string, number>;
		},
		staleTime: 60_000,
	});
	// Logos for the tokens without a local one come from the CoW token list (already cached by the zap card)
	const { data: cowTokens } = useQuery({ queryKey: ['cow-token-list'], queryFn: fetchCowTokenList, staleTime: 60 * 60 * 1000 });

	const assets = useMemo<WalletAsset[]>(() => {
		// Without a wallet every token is still listed and priced, with a 0 balance
		return CRYPTO.map((t) => {
			const isEth = t.address.toLowerCase() === NATIVE_ETH.toLowerCase();
			const raw = !owner ? 0n : isEth ? (eth?.value ?? 0n) : ((balances?.[erc20s.indexOf(t)]?.result as bigint | undefined) ?? 0n);
			const balance = parseFloat(formatUnits(raw, t.decimals));
			const price = prices?.[t.address.toLowerCase()] ?? 0;
			return {
				key: t.symbol,
				symbol: t.symbol,
				name: t.symbol,
				logoURI: t.logoURI ?? cowTokens?.find((c) => c.address.toLowerCase() === t.address.toLowerCase())?.logoURI,
				address: t.address,
				balance,
				price,
				value: balance * price,
			};
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [owner, balances, eth, prices, cowTokens]);

	return { assets, isLoading: (!!owner && isLoadingBalances) || isLoadingPrices };
}
