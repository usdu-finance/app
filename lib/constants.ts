// App constants
export const APP_NAME = 'USDU Finance';
export const APP_DESCRIPTION =
	'A decentralized finance application for USDU protocol';
export const APP_URL =
	process.env.NEXT_PUBLIC_APP_URL || 'https://usdu.finance';

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

// API endpoints
export const API_ENDPOINTS = {
	AUTH: '/api/auth',
	USER: '/api/user',
	TRANSACTIONS: '/api/transactions',
} as const;
