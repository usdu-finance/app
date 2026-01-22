// App constants
export const APP_NAME = 'USDU Finance';
export const APP_DESCRIPTION = 'A decentralized finance application for USDU protocol';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usdu.finance';
export const APP_REFETCH = parseInt(process.env.NEXT_PUBLIC_APP_REFETCH || '60000');

// Project information
export const PROJECT = {
	name: 'USDU Finance',
	blockchains: ['Ethereum'],
	tagline: 'Low-Cost Stable Funding for On-Chain Credit',
	description:
		'Protocol-issued, non-algorithmic stablecoin offering fixed-term funding for structured finance and credit markets. Fully convertible to USDC on-chain.',
	logo: '/assets/usdu-full-text-1024x346.png',
};

// Social links
export const SOCIAL = {
	Github_user: 'https://github.com/usdu-finance',
	Twitter: 'https://x.com/USDUfinance',
	Telegram: 'https://t.me/usdufinance',
	Defillama: 'https://defillama.com/stablecoin/usdu-finance',
	Coingecko: 'https://www.coingecko.com/en/coins/usdu-finance',
	Aragon: 'https://app.aragon.org/dao/ethereum-mainnet/usdu.dao.eth/dashboard',
	Etherscan: 'https://etherscan.io/token/0xdde3eC717f220Fc6A29D6a4Be73F91DA5b718e55',
};

// Environment variables
export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL;

// Local storage keys
export const STORAGE_KEYS = {
	WALLET_CONNECT: 'walletconnect',
	AUTH_TOKEN: 'auth_token',
	USER_PREFERENCES: 'user_preferences',
} as const;

// SEO metadata
export const SEO = {
	home: {
		title: `${APP_NAME} - Institutional-Grade Stablecoin for Credit Markets`,
		description: `${PROJECT.description} Offering 4-6% fixed-term funding rates with DAO governance.`,
		openGraph: {
			title: `${APP_NAME} - Institutional-Grade Stablecoin`,
			description:
				'Non-algorithmic stablecoin for structured finance and credit markets. Fully convertible to USDC with transparent governance.',
			type: 'website' as const,
			url: APP_URL,
		},
		twitter: {
			cardType: 'summary_large_image' as const,
			site: '@usdufinance',
		},
	},
	modules: {
		title: `Protocol Modules & Governance - ${APP_NAME}`,
		description:
			'Manage USDU protocol modules through expiration-based governance. Review active adapters, pending proposals, and module history with secure timelock controls.',
		openGraph: {
			title: `Protocol Modules & Governance - ${APP_NAME}`,
			description:
				'Transparent governance of USDU protocol modules with expiration-based proposals and secure timelock controls.',
			type: 'website' as const,
			url: `${APP_URL}/modules`,
		},
	},
	maturities: {
		title: `Fixed-Term Funding Maturities - ${APP_NAME}`,
		description:
			'Explore USDU fixed-term funding options with competitive rates from 30 days to 1 year. Institutional-grade structured finance solutions with predictable fixed-rate funding.',
		openGraph: {
			title: `Fixed-Term Funding Maturities - ${APP_NAME}`,
			description:
				'Predictable, fixed-rate funding options designed for institutional borrowers with terms ranging from 30 days to 1 year.',
			type: 'website' as const,
			url: `${APP_URL}/maturities`,
		},
	},
	transparency: {
		title: `Transparency & Risk Management - ${APP_NAME}`,
		description:
			'Real-time transparency into USDU protocol metrics, risk controls, audit reports, and governance activities. Full institutional-grade disclosure and accountability.',
		openGraph: {
			title: `Transparency & Risk Management - ${APP_NAME}`,
			description:
				'Real-time protocol metrics, comprehensive audit reports, and transparent governance ensuring institutional-grade accountability.',
			type: 'website' as const,
			url: `${APP_URL}/transparency`,
		},
	},
} as const;
