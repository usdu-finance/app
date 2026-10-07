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
		'Protocol-issued, non-algorithmic stablecoins — USDU (USD), EURU (EUR), and CHFU (CHF) — offering fixed-term funding for structured finance and credit markets, with USDU as the base currency and USDC on-chain convertibility.',
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

// Official Curve page of a pool on Ethereum
export const getCurvePoolUrl = (poolAddress: string) => `https://www.curve.finance/dex/ethereum/pools/${poolAddress}`;

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
const pageSeo = (title: string, description: string, path: string) => ({
	title: `${title} - ${APP_NAME}`,
	description,
	openGraph: {
		title: `${title} - ${APP_NAME}`,
		description,
		type: 'website' as const,
		url: `${APP_URL}${path}`,
	},
});

export const SEO = {
	dashboard: pageSeo('Dashboard', 'Your USDU Finance dashboard: protocol overview, wallet status and quick actions.', '/dashboard'),
	swap: pageSeo(
		'Swap',
		'Mint or redeem USDU, EURU and CHFU through the swap router, or swap directly against Curve pools backing USDU.',
		'/dashboard/swap'
	),
	swapModule: pageSeo(
		'Swap Module',
		'Mint or redeem a USDU stablecoin against its backing asset through a swap module, with live fees and capacity.',
		'/dashboard/swap'
	),
	swapPool: pageSeo(
		'Swap on Curve',
		'Swap directly against a Curve pool backing USDU with live pricing, pool composition and slippage protection.',
		'/dashboard/swap'
	),
	liquidity: pageSeo(
		'Liquidity',
		'Provide or remove liquidity from the Curve pools backing USDU and review TVL, balances and LP supply.',
		'/dashboard/liquidity'
	),
	liquidityPool: pageSeo(
		'Curve Pool Liquidity',
		'Add or remove liquidity in a Curve pool backing USDU and review its composition and LP position.',
		'/dashboard/liquidity'
	),
	borrow: pageSeo(
		'Borrow',
		'Select a collateral and maturity to borrow USDU at a fixed term, or create a custom order.',
		'/dashboard/borrow'
	),
	borrowOffer: pageSeo(
		'Borrow Offer',
		'Review the terms of a fixed-term borrow offer, including collateral, maturity, rate and availability.',
		'/dashboard/borrow'
	),
	obligation: pageSeo(
		'Obligations',
		'Track your open borrow obligations, their health and upcoming maturities.',
		'/dashboard/obligation'
	),
	obligationDetail: pageSeo(
		'Obligation Details',
		'Details on an obligation, including outstanding debt, health and maturity.',
		'/dashboard/obligation'
	),
	strategy: pageSeo(
		'Strategies',
		'Compare the strategy vaults backing each swap module, including total value locked and yield.',
		'/dashboard/strategy'
	),
	strategyDetail: pageSeo(
		'Strategy Details',
		'Details on a strategy vault backing a swap module, including total value locked and yield.',
		'/dashboard/strategy'
	),
	home: {
		title: `${APP_NAME} - Institutional-Grade Stablecoin for Credit Markets`,
		description: `${PROJECT.description} Offering 4-6% fixed-term funding rates with DAO governance.`,
		openGraph: {
			title: `${APP_NAME} - Institutional-Grade Stablecoin`,
			description:
				'Non-algorithmic USD, EUR, and CHF stablecoins for structured finance and credit markets. Fully convertible to USDC with transparent governance.',
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
			description: 'Transparent governance of USDU protocol modules with expiration-based proposals and secure timelock controls.',
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
