import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS, StreamerVaultV1_ABI } from '@usdu-finance/usdu-core';
import { useCurvePools } from '@/hooks/useCurvePools';
import { useSwapModules } from '@/hooks/useSwapModules';
import { APP_REFETCH } from '@/lib/constants';

/** Peg group of a stablecoin: USD (USDU), EUR (EURU) or CHF (CHFU) */
export type StablecoinGroup = 'USD' | 'EUR' | 'CHF';

// The USDU stablecoin each group is bridged into at par by the swap modules
const GROUP_CURRENCY: Record<StablecoinGroup, string> = { USD: 'USDU', EUR: 'EURU', CHF: 'CHFU' };
const CURRENCY_GROUP: Record<string, StablecoinGroup> = { USDU: 'USD', EURU: 'EUR', CHFU: 'CHF' };

export interface WalletAsset {
	key: string;
	symbol: string;
	name: string;
	logoURI?: string;
	address: `0x${string}`;
	/** Set for pure stablecoins (the U-stables and every bridge/pool coin), unset for vault shares and LP tokens */
	group?: StablecoinGroup;
	balance: number;
	price: number; // in USDU
	value: number; // in USDU
}

export interface WalletAssetsData {
	assets: WalletAsset[];
	totalValue: number; // in USDU
	isLoading: boolean;
	error: string | null;
}

interface AssetDef {
	key: string;
	symbol: string;
	name: string;
	logoURI?: string;
	address: `0x${string}`;
	decimals: number;
	group?: StablecoinGroup;
	/** Vault share tokens are priced as `vault.price() * underlying price` */
	vaultOf?: string;
}

/**
 * Hook to fetch every protocol-recognized token in a wallet (stablecoins incl. bridged coins, reward-vault shares and Curve LP tokens, zero balances included),
 * priced in USDU purely from on-chain data: USDU is the unit, EURU/CHFU come from the Curve FX pools, vault shares
 * from the vault's share price and LP tokens from pool TVL / LP supply.
 * @param owner - Connected wallet address
 */
export function useWalletAssets(owner: `0x${string}` | undefined): WalletAssetsData {
	const addresses = ADDRESS[mainnet.id];
	const { pools, isLoading: isLoadingPools, error: poolError } = useCurvePools();
	const { modules, isLoading: isLoadingModules, error: modulesError } = useSwapModules();

	const defs = useMemo<AssetDef[]>(() => {
		const token = (
			key: string,
			name: string,
			logoURI: string | undefined,
			address: string,
			extra: Partial<AssetDef> = {}
		): AssetDef => ({ key, symbol: key, name, logoURI, address: address as `0x${string}`, decimals: 18, ...extra });

		const stables = [
			token('USDU', 'USDU', '/coin/usdu.png', addresses.usduStable, { group: 'USD' }),
			token('EURU', 'EURU', '/coin/euru.png', addresses.euruStable, { group: 'EUR' }),
			token('CHFU', 'CHFU', '/coin/chfu.png', addresses.chfuStable, { group: 'CHF' }),
		];

		// Coins the swap modules bridge into a U-stable (USDC, USDT, EURC, dEURO, ZCHF, ...), deduplicated by address
		const bridged = new Map<string, AssetDef>();
		for (const m of modules) {
			const group = CURRENCY_GROUP[m.currency];
			if (!group || !m.coinAddress || bridged.has(m.coinAddress.toLowerCase())) continue;
			bridged.set(
				m.coinAddress.toLowerCase(),
				token(m.coinSymbol, m.coinSymbol, undefined, m.coinAddress, { decimals: m.coinDecimals, group })
			);
		}

		return [
			...stables,
			...bridged.values(),
			token('rUSDU', 'Staked USDU', '/coin/rusdu.png', addresses.usduStreamerVaultV1, { vaultOf: 'USDU' }),
			token('rEURU', 'Staked EURU', '/coin/reuru.png', addresses.euruStreamerVaultV1, { vaultOf: 'EURU' }),
			token('rCHFU', 'Staked CHFU', '/coin/rchfu.png', addresses.chfuStreamerVaultV1, { vaultOf: 'CHFU' }),
			...pools.map((p) => token(`LP-${p.key}`, `${p.label} LP`, '/coin/lp.svg', p.poolAddress, { symbol: 'LP' })),
		];
	}, [addresses, pools, modules]);

	const vaultDefs = useMemo(() => defs.filter((d) => d.vaultOf), [defs]);

	const contracts = useMemo(() => {
		if (!owner) return [];
		return [
			...defs.map((d) => ({
				chainId: mainnet.id,
				address: d.address,
				abi: erc20Abi,
				functionName: 'balanceOf' as const,
				args: [owner] as const,
			})),
			...vaultDefs.map((d) => ({
				chainId: mainnet.id,
				address: d.address,
				abi: StreamerVaultV1_ABI,
				functionName: 'price' as const,
			})),
		];
	}, [owner, defs, vaultDefs]);

	const { data, isLoading, error } = useReadContracts({
		contracts,
		query: { enabled: contracts.length > 0, refetchInterval: APP_REFETCH },
	});

	return useMemo(() => {
		const loading = isLoadingPools || isLoadingModules || (!!owner && isLoading);
		const err = error?.message ?? poolError ?? modulesError;
		if (!owner || !data) return { assets: [], totalValue: 0, isLoading: loading, error: err };

		// Stablecoin prices in USDU: pool.price is 1 coin1 in coin0 (USDU)
		const prices: Record<string, number> = { USDU: 1 };
		for (const symbol of ['EURU', 'CHFU']) {
			const pool = pools.find((p) => p.tokens[1].symbol === symbol && p.tokens[0].symbol === 'USDU');
			if (pool) prices[symbol] = pool.price;
		}

		const assets = defs.map((d, i): WalletAsset => {
			const raw = (data[i]?.result as bigint | undefined) ?? 0n;
			// Bridged coins are minted/redeemed at par, so they're valued at the U-stable of their peg group
			let price = d.group ? (prices[GROUP_CURRENCY[d.group]] ?? 0) : 0;

			if (d.vaultOf) {
				const vaultPrice = data[defs.length + vaultDefs.indexOf(d)]?.result as bigint | undefined;
				price = parseFloat(formatUnits(vaultPrice ?? 10n ** 18n, 18)) * (prices[d.vaultOf] ?? 0);
			} else if (d.key.startsWith('LP-')) {
				const pool = pools.find((p) => p.poolAddress === d.address);
				const supply = pool ? parseFloat(formatUnits(pool.totalSupply, 18)) : 0;
				price = pool && supply > 0 ? pool.totalValue / supply : 0;
			}

			const balance = parseFloat(formatUnits(raw, d.decimals));
			return {
				key: d.key,
				symbol: d.symbol,
				name: d.name,
				logoURI: d.logoURI,
				address: d.address,
				group: d.group,
				balance,
				price,
				value: balance * price,
			};
		});

		return { assets, totalValue: assets.reduce((sum, a) => sum + a.value, 0), isLoading: loading, error: err };
	}, [owner, data, defs, vaultDefs, pools, isLoading, isLoadingPools, isLoadingModules, error, poolError, modulesError]);
}
