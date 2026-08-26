import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS, ERC20_ABI } from '@usdu-finance/usdu-core';
import { APP_REFETCH } from '@/lib/constants';
import { USDC_MAINNET } from '@/lib/whitelisted-tokens';

export interface TokenBalance {
	token: string;
	address: string;
	balance: number;
	balanceRaw: bigint;
	decimals: number;
}

export interface CuratorBalancesData {
	usdu: TokenBalance;
	usdc: TokenBalance;
	totalBalance: number;
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch token balances (USDU and USDC) from the DAO curator address
 * @param chainId - Chain ID to query (defaults to mainnet)
 * @returns Token balances for USDU and USDC held by the curator/DAO
 */
export function useCuratorBalances(chainId: number = mainnet.id): CuratorBalancesData {
	// Only mainnet has curator and usduStable addresses; USDC is the same on every chain
	const mainnetAddresses = chainId === mainnet.id ? ADDRESS[mainnet.id] : undefined;
	const curatorAddress = mainnetAddresses?.curator;
	const usduAddress = mainnetAddresses?.usduStable;
	const usdcAddress = mainnetAddresses ? USDC_MAINNET : undefined;

	// Build contract calls for balanceOf
	const contracts = [
		{
			address: usduAddress as `0x${string}`,
			abi: ERC20_ABI,
			functionName: 'balanceOf' as const,
			args: [curatorAddress as `0x${string}`],
		},
		{
			address: usdcAddress as `0x${string}`,
			abi: ERC20_ABI,
			functionName: 'balanceOf' as const,
			args: [curatorAddress as `0x${string}`],
		},
	];

	// Fetch all data in parallel
	const { data, error, isLoading } = useReadContracts({
		contracts,
		query: {
			enabled: !!curatorAddress && !!usduAddress && !!usdcAddress,
			refetchInterval: APP_REFETCH,
		},
	});

	// Handle errors
	if (error) {
		return {
			usdu: {
				token: 'USDU',
				address: usduAddress || '',
				balance: 0,
				balanceRaw: 0n,
				decimals: 18,
			},
			usdc: {
				token: 'USDC',
				address: usdcAddress || '',
				balance: 0,
				balanceRaw: 0n,
				decimals: 6,
			},
			totalBalance: 0,
			isLoading: false,
			error: error.message,
		};
	}

	// Handle loading state
	if (!data || isLoading) {
		return {
			usdu: {
				token: 'USDU',
				address: usduAddress || '',
				balance: 0,
				balanceRaw: 0n,
				decimals: 18,
			},
			usdc: {
				token: 'USDC',
				address: usdcAddress || '',
				balance: 0,
				balanceRaw: 0n,
				decimals: 6,
			},
			totalBalance: 0,
			isLoading,
			error: null,
		};
	}

	try {
		// Extract results
		const usduBalanceResult = data[0];
		const usdcBalanceResult = data[1];

		const usduBalanceRaw = usduBalanceResult?.result ? (usduBalanceResult.result as bigint) : 0n;
		const usdcBalanceRaw = usdcBalanceResult?.result ? (usdcBalanceResult.result as bigint) : 0n;

		// Format balances as numbers (USDU has 18 decimals, USDC has 6 decimals)
		const usduBalance = parseFloat(formatUnits(usduBalanceRaw, 18));
		const usdcBalance = parseFloat(formatUnits(usdcBalanceRaw, 6));

		// Scale USDC to 18 decimals (multiply by 1e12) and calculate total in 18 decimal precision
		const usdcBalanceScaled = usdcBalanceRaw * BigInt(1e12);
		const totalRaw = usduBalanceRaw + usdcBalanceScaled;
		const totalBalance = parseFloat(formatUnits(totalRaw, 18));

		return {
			usdu: {
				token: 'USDU',
				address: usduAddress || '',
				balance: usduBalance,
				balanceRaw: usduBalanceRaw,
				decimals: 18,
			},
			usdc: {
				token: 'USDC',
				address: usdcAddress || '',
				balance: usdcBalance,
				balanceRaw: usdcBalanceRaw,
				decimals: 6,
			},
			totalBalance,
			isLoading: false,
			error: null,
		};
	} catch (err) {
		return {
			usdu: {
				token: 'USDU',
				address: usduAddress || '',
				balance: 0,
				balanceRaw: 0n,
				decimals: 18,
			},
			usdc: {
				token: 'USDC',
				address: usdcAddress || '',
				balance: 0,
				balanceRaw: 0n,
				decimals: 6,
			},
			totalBalance: 0,
			isLoading: false,
			error: `Error processing balances: ${err instanceof Error ? err.message : 'Unknown error'}`,
		};
	}
}
