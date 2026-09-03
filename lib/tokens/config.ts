// Token configuration - supports both static TOKENS and CoW token list

export interface TokenConfig {
	address: string;
	symbol: string;
	name: string;
	decimals: number;
	chainId: number;
	logoURI?: string;
	tags?: string[];
}

// Static token registry (for TokenSelector)
export const TOKENS: Record<string, TokenConfig> = {
	// Stablecoins
	USDC: {
		address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
		symbol: 'USDC',
		name: 'USD Coin',
		decimals: 6,
		chainId: 1,
		logoURI: '/coin/usdc.svg',
	},
	USDT: {
		address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
		symbol: 'USDT',
		name: 'Tether USD',
		decimals: 6,
		chainId: 1,
		logoURI: '/coin/usdt.svg',
	},
	DAI: {
		address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
		symbol: 'DAI',
		name: 'Dai Stablecoin',
		decimals: 18,
		chainId: 1,
		logoURI: '/coin/dai.svg',
	},
	ZCHF: {
		address: '0xB58E61C3098d85632Df34EecfB899A1Ed80921cB',
		symbol: 'ZCHF',
		name: 'Frankencoin',
		decimals: 18,
		chainId: 1,
		logoURI: '/coin/zchf.svg',
	},
	USDU: {
		address: '0xdde3eC717f220Fc6A29D6a4Be73F91DA5b718e55',
		symbol: 'USDU',
		name: 'USDU',
		decimals: 18,
		chainId: 1,
		logoURI: '/coin/usdu.png',
	},
	EURU: {
		address: '0x6e30d56cb23068dE5A084D4A4f2A909823424F06',
		symbol: 'EURU',
		name: 'EURU',
		decimals: 18,
		chainId: 1,
		logoURI: '/coin/euru.png',
	},
	CHFU: {
		address: '0x4B43F48A665E2F15C4913a76CF67509672396146',
		symbol: 'CHFU',
		name: 'CHFU',
		decimals: 18,
		chainId: 1,
		logoURI: '/coin/chfu.png',
	},

	// Crypto
	ETH: {
		address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
		symbol: 'ETH',
		name: 'Ether',
		decimals: 18,
		chainId: 1,
		logoURI: '/coin/eth.svg',
	},
	WETH: {
		address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
		symbol: 'WETH',
		name: 'Wrapped Ether',
		decimals: 18,
		chainId: 1,
		logoURI: '/coin/weth.png',
	},
	WBTC: {
		address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
		symbol: 'WBTC',
		name: 'Wrapped BTC',
		decimals: 8,
		chainId: 1,
		logoURI: '/coin/wbtc.svg',
	},
	FPS: {
		address: '0x1bA26788dfDe592fec8bcB0Eaff472a42BE341B2',
		symbol: 'FPS',
		name: 'Frankencoin Pool Share',
		decimals: 18,
		chainId: 1,
		logoURI: '/coin/fps.png',
	},
};

// Custom tokens for CoW list (tokens not on CoW or needing overrides)
export const CUSTOM_TOKENS: TokenConfig[] = [TOKENS.ZCHF, TOKENS.USDU, TOKENS.EURU, TOKENS.CHFU, TOKENS.FPS];

export const getTokenBySymbol = (symbol: string): TokenConfig | undefined => {
	return TOKENS[symbol];
};
