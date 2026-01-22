import { cookieStorage, createStorage, http } from '@wagmi/core';
import { injected, safe } from '@wagmi/connectors';
import { mainnet, AppKitNetwork } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { APP_DESCRIPTION, APP_NAME } from '../constants';

// Configuration from environment variables
const CONFIG = {
	wagmiId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
	rpc: process.env.NEXT_PUBLIC_RPC_URL,
};

if (!CONFIG.wagmiId) {
	throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not set');
}

if (!CONFIG.rpc) {
	throw new Error('NEXT_PUBLIC_RPC_URL is not set');
}

// Chain configuration
export const WAGMI_CHAIN = mainnet;
export const WAGMI_CHAINS = [mainnet] as const;

// Helper functions for chain operations
export const getChainById = (chainId: number) => {
	return WAGMI_CHAINS.find((chain) => chain.id === chainId) || mainnet;
};

export const getBlockExplorerUrl = (path: string, chainId?: number) => {
	const chain = chainId ? getChainById(chainId) : mainnet;
	const baseUrl = chain.blockExplorers?.default?.url;

	if (!baseUrl) {
		// Fallback to etherscan if no block explorer is configured
		return `https://etherscan.io/${path}`;
	}

	// Ensure the path doesn't start with a slash if baseUrl ends with one
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;
	return `${baseUrl}/${cleanPath}`;
};

// Metadata for wallets
export const WAGMI_METADATA = {
	name: APP_NAME,
	description: APP_DESCRIPTION,
	url: process.env.NEXT_PUBLIC_APP_URL || 'https://usdu-finance.io',
	icons: ['/favicon.ico'],
};

export const WAGMI_ADAPTER = new WagmiAdapter({
	networks: WAGMI_CHAINS as unknown as AppKitNetwork[],
	transports: {
		[mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${CONFIG.rpc}`),
		// [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${CONFIG.rpc}`),
	},
	batch: {
		multicall: {
			wait: 200,
		},
	},
	connectors: [
		safe({
			allowedDomains: [/gnosis-safe.io$/, /app.safe.global$/, /dhedge.org$/],
		}),
		injected({ shimDisconnect: true }),
	],
	ssr: true,
	storage: createStorage({
		storage: cookieStorage,
	}),
	projectId: CONFIG.wagmiId,
});

export const WAGMI_CONFIG = WAGMI_ADAPTER.wagmiConfig;
