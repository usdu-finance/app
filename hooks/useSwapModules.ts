import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { erc20Abi } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS, ISwapBridgeMorphoV1_ABI, Stablecoin_ABI, type ChainAddressMainnet } from '@usdu-finance/usdu-core';
import { APP_REFETCH } from '@/lib/constants';

// coin, swapInFeePPM, swapOutFeePPM, mintCap, totalMinted, totalRevenue, vault, expiresAt
const CALLS_PER_MODULE = 8;

interface CurrencyModuleConfig {
	key: string;
	label: string;
	moduleAddressKey: keyof ChainAddressMainnet;
}

interface CurrencyConfig {
	currency: string;
	stableKey: keyof ChainAddressMainnet;
	routerKey: keyof ChainAddressMainnet;
	modules: CurrencyModuleConfig[];
}

// Each stablecoin (USDU, EURU, CHFU, ...) runs its own swap router and its own set of
// bridge modules, but they're all instances of the same router/module contracts.
const CURRENCIES: CurrencyConfig[] = [
	{
		currency: 'USDU',
		stableKey: 'usduStable',
		routerKey: 'usduSwapRouterV1',
		modules: [
			{ key: 'usdu-steakUSDC', label: 'USDC', moduleAddressKey: 'usduSwapBridgeMorphoV1_steakUSDC_module' },
			{ key: 'usdu-steakUSDT', label: 'USDT', moduleAddressKey: 'usduSwapBridgeMorphoV1_steakUSDT_module' },
		],
	},
	{
		currency: 'EURU',
		stableKey: 'euruStable',
		routerKey: 'euruSwapRouterV1',
		modules: [{ key: 'euru-steakEURC', label: 'EURC', moduleAddressKey: 'euruSwapBridgeMorphoV1_steakEURC_module' }],
	},
	{
		currency: 'CHFU',
		stableKey: 'chfuStable',
		routerKey: 'chfuSwapRouterV1',
		modules: [{ key: 'chfu-ZCHF', label: 'ZCHF', moduleAddressKey: 'chfuSwapBridgeMorphoV1_ZCHF_module' }],
	},
];

export interface SwapModule {
	key: string;
	label: string;
	/** Symbol of the stablecoin this module mints/redeems (USDU, EURU, CHFU, ...). */
	currency: string;
	/** The currency's swap router, used for approvals and swapIn/swapOut calls. */
	routerAddress: `0x${string}`;
	/** The currency's stablecoin contract, minted/burned by this module. */
	targetAddress: `0x${string}`;
	moduleAddress: `0x${string}`;
	coinAddress: `0x${string}`;
	coinSymbol: string;
	coinDecimals: number;
	swapInFeePPM: number;
	swapOutFeePPM: number;
	/** Maximum stablecoin (18 decimals) this module may mint against new deposits. */
	mintCap: bigint;
	/** Stablecoin (18 decimals) currently minted/outstanding against this module. */
	totalMinted: bigint;
	/** Lifetime protocol revenue accrued by this module, in the target stablecoin (18 decimals). */
	totalRevenue: bigint;
	/** Remaining swap-in capacity, i.e. max(mintCap - totalMinted, 0). */
	mintable: bigint;
	/** The ERC4626 vault this module deposits the coin into (the underlying yield strategy). */
	vaultAddress: `0x${string}`;
	/** The vault's ERC20 name, shown as the module's strategy. */
	vaultName: string;
	/** Unix timestamp (seconds) at which the stablecoin contract's module role expires. */
	expiresAt: bigint;
}

export interface SwapModulesData {
	modules: SwapModule[];
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch every currency's registered bridge modules (coin, decimals, symbol, fees)
 * @param chainId - Chain ID to query (defaults to mainnet)
 * @returns Available swap modules, across all currencies, with their coin metadata and fee rates
 */
export function useSwapModules(chainId: number = mainnet.id): SwapModulesData {
	const addresses = chainId === mainnet.id ? ADDRESS[mainnet.id] : undefined;

	const moduleConfigs = useMemo(
		() =>
			addresses
				? CURRENCIES.flatMap((currency) =>
						currency.modules.map((m) => ({
							key: m.key,
							label: m.label,
							currency: currency.currency,
							moduleAddress: addresses[m.moduleAddressKey] as `0x${string}`,
							routerAddress: addresses[currency.routerKey] as `0x${string}`,
							targetAddress: addresses[currency.stableKey] as `0x${string}`,
						}))
					)
				: [],
		[addresses]
	);

	const moduleContracts = useMemo(
		() =>
			moduleConfigs.flatMap((m) => [
				{ address: m.moduleAddress, abi: ISwapBridgeMorphoV1_ABI, functionName: 'coin' as const },
				{
					address: m.moduleAddress,
					abi: ISwapBridgeMorphoV1_ABI,
					functionName: 'swapInFeePPM' as const,
				},
				{
					address: m.moduleAddress,
					abi: ISwapBridgeMorphoV1_ABI,
					functionName: 'swapOutFeePPM' as const,
				},
				{ address: m.moduleAddress, abi: ISwapBridgeMorphoV1_ABI, functionName: 'mintCap' as const },
				{
					address: m.moduleAddress,
					abi: ISwapBridgeMorphoV1_ABI,
					functionName: 'totalMinted' as const,
				},
				{
					address: m.moduleAddress,
					abi: ISwapBridgeMorphoV1_ABI,
					functionName: 'totalRevenue' as const,
				},
				{ address: m.moduleAddress, abi: ISwapBridgeMorphoV1_ABI, functionName: 'vault' as const },
				{
					address: m.targetAddress,
					abi: Stablecoin_ABI,
					functionName: 'modules' as const,
					args: [m.moduleAddress],
				},
			]),
		[moduleConfigs]
	);

	const {
		data: moduleData,
		isLoading: isLoadingModules,
		error: moduleError,
	} = useReadContracts({
		contracts: moduleContracts,
		query: {
			enabled: moduleContracts.length > 0,
			refetchInterval: APP_REFETCH,
		},
	});

	const coinAddresses = useMemo(
		() => moduleConfigs.map((_, index) => moduleData?.[index * CALLS_PER_MODULE]?.result as `0x${string}` | undefined),
		[moduleData, moduleConfigs]
	);

	const coinContracts = useMemo(
		() =>
			coinAddresses
				.filter((addr): addr is `0x${string}` => !!addr)
				.flatMap((addr) => [
					{ address: addr, abi: erc20Abi, functionName: 'decimals' as const },
					{ address: addr, abi: erc20Abi, functionName: 'symbol' as const },
				]),
		[coinAddresses]
	);

	const {
		data: coinData,
		isLoading: isLoadingCoins,
		error: coinError,
	} = useReadContracts({
		contracts: coinContracts,
		query: {
			enabled: coinContracts.length > 0,
		},
	});

	const vaultAddresses = useMemo(
		() => moduleConfigs.map((_, index) => moduleData?.[index * CALLS_PER_MODULE + 6]?.result as `0x${string}` | undefined),
		[moduleData, moduleConfigs]
	);

	const vaultContracts = useMemo(
		() =>
			vaultAddresses
				.filter((addr): addr is `0x${string}` => !!addr)
				.map((addr) => ({ address: addr, abi: erc20Abi, functionName: 'name' as const })),
		[vaultAddresses]
	);

	const {
		data: vaultData,
		isLoading: isLoadingVaults,
		error: vaultError,
	} = useReadContracts({
		contracts: vaultContracts,
		query: {
			enabled: vaultContracts.length > 0,
		},
	});

	return useMemo(() => {
		if (moduleError) {
			return { modules: [], isLoading: false, error: moduleError.message };
		}

		if (coinError) {
			return { modules: [], isLoading: false, error: coinError.message };
		}

		if (vaultError) {
			return { modules: [], isLoading: false, error: vaultError.message };
		}

		const waitingOnCoins = coinContracts.length > 0 && (!coinData || isLoadingCoins);
		const waitingOnVaults = vaultContracts.length > 0 && (!vaultData || isLoadingVaults);
		if (!moduleData || isLoadingModules || waitingOnCoins || waitingOnVaults) {
			return { modules: [], isLoading: true, error: null };
		}

		try {
			const modules: SwapModule[] = moduleConfigs.map((config, index) => {
				const base = index * CALLS_PER_MODULE;
				const coinAddress = moduleData[base]?.result as `0x${string}`;
				const swapInFeePPM = Number(moduleData[base + 1]?.result ?? 0n);
				const swapOutFeePPM = Number(moduleData[base + 2]?.result ?? 0n);
				const mintCap = (moduleData[base + 3]?.result as bigint) ?? 0n;
				const totalMinted = (moduleData[base + 4]?.result as bigint) ?? 0n;
				const totalRevenue = (moduleData[base + 5]?.result as bigint) ?? 0n;
				const mintable = mintCap > totalMinted ? mintCap - totalMinted : 0n;
				const vaultAddress = moduleData[base + 6]?.result as `0x${string}`;
				const expiresAt = (moduleData[base + 7]?.result as bigint) ?? 0n;

				const coinIndex = coinAddresses.findIndex((addr) => addr === coinAddress);
				const coinDecimals = coinIndex >= 0 ? Number(coinData?.[coinIndex * 2]?.result ?? 6) : 6;
				const coinSymbol = coinIndex >= 0 ? ((coinData?.[coinIndex * 2 + 1]?.result as string) ?? config.label) : config.label;

				const vaultIndex = vaultAddresses.findIndex((addr) => addr === vaultAddress);
				const vaultName = vaultIndex >= 0 ? ((vaultData?.[vaultIndex]?.result as string) ?? '') : '';

				return {
					key: config.key,
					label: config.label,
					currency: config.currency,
					routerAddress: config.routerAddress,
					targetAddress: config.targetAddress,
					moduleAddress: config.moduleAddress,
					coinAddress,
					coinSymbol,
					coinDecimals,
					swapInFeePPM,
					swapOutFeePPM,
					mintCap,
					totalMinted,
					totalRevenue,
					mintable,
					vaultAddress,
					vaultName,
					expiresAt,
				};
			});

			return { modules, isLoading: false, error: null };
		} catch (err) {
			return {
				modules: [],
				isLoading: false,
				error: `Error processing swap modules: ${err instanceof Error ? err.message : 'Unknown error'}`,
			};
		}
	}, [
		moduleData,
		coinData,
		vaultData,
		moduleError,
		coinError,
		vaultError,
		isLoadingModules,
		isLoadingCoins,
		isLoadingVaults,
		moduleConfigs,
		coinAddresses,
		coinContracts.length,
		vaultAddresses,
		vaultContracts.length,
	]);
}
