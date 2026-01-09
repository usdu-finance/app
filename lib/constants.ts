// App constants
export const APP_NAME = 'USDU Finance';
export const APP_DESCRIPTION =
	'A decentralized finance application for USDU protocol';
export const APP_URL =
	process.env.NEXT_PUBLIC_APP_URL || 'https://usdu.finance';

// Project information
export const PROJECT = {
	name: 'USDU Finance',
	blockchains: ['Ethereum'],
	tagline: 'Low-Cost Stable Funding for On-Chain Credit',
	description:
		'Protocol-issued, non-algorithmic stablecoin offering ~4-6% fixed-term funding for structured finance and credit markets. Fully convertible to USDC on-chain.',
	logo: '/assets/usdu-full-text-1024x346.png',
};

// Social links
export const SOCIAL = {
	Github_user: 'https://github.com/usdu-finance',
	Twitter: 'https://x.com/USDUfinance',
	Telegram: 'https://t.me/usdu-finance',
	Defillama: 'https://defillama.com/stablecoin/usdu-finance',
	Coingecko: 'https://www.coingecko.com/en/coins/usdu-finance',
	Aragon: 'https://app.aragon.org/dao/ethereum-mainnet/usdu.dao.eth/dashboard',
	Etherscan:
		'https://etherscan.io/token/0xdde3eC717f220Fc6A29D6a4Be73F91DA5b718e55',
};

// Environment variables
export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
export const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL;

// Chain IDs
export const CHAIN_IDS = {
	MAINNET: 1,
	BASE: 8453,
} as const;

// Local storage keys
export const STORAGE_KEYS = {
	WALLET_CONNECT: 'walletconnect',
	AUTH_TOKEN: 'auth_token',
	USER_PREFERENCES: 'user_preferences',
} as const;
