import type { WalletAsset } from '@/hooks/useWalletAssets';

/**
 * Balances for the dashboard preview shown to visitors without a connected wallet, so they see a lived-in
 * dashboard instead of an empty one. Only the balances are made up: addresses, names and prices still come
 * from the live hooks, so values follow the market and every Swap / Stake link works.
 * Keyed by asset key (stablecoins, reward vault shares) or symbol (crypto).
 */
export const DEMO_BALANCES: Record<string, number> = {
	// USD
	USDU: 4820.5,
	USDC: 12500,
	USDT: 3150.25,
	// EUR
	EURU: 2310.8,
	EURC: 1800,
	dEURO: 640.4,
	// CHF
	CHFU: 915.2,
	ZCHF: 420,
	// reward vault shares
	rUSDU: 6200,
	rEURU: 1450.5,
	rCHFU: 380,
	// crypto
	ETH: 3.42,
	WETH: 1.15,
	wstETH: 0.84,
	WBTC: 0.062,
	cbBTC: 0.118,
	LINK: 215,
	UNI: 140,
	AAVE: 6.5,
};

/** The assets with demo balances applied; values are recomputed from the live price. */
export const withDemoBalances = (assets: WalletAsset[]): WalletAsset[] =>
	assets.map((a) => {
		const balance = DEMO_BALANCES[a.key] ?? 0;
		return { ...a, balance, value: balance * a.price };
	});
