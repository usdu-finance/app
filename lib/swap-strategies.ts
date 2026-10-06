import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { normalizeAddress } from '@/lib/utils';

/**
 * Metadata for the swap strategies behind the swap modules, keyed by module address.
 * A swap strategy swaps 1:1 and moves the funds into a vault strategy (ERC4626); this links it to the
 * provider's own page. Modules not listed here have no link.
 */
export interface SwapStrategyMeta {
	provider: 'Morpho' | 'Frankencoin';
	/** Official page of the module's strategy vault on the provider's app */
	url: string;
}

const addresses = ADDRESS[mainnet.id];

const FRANKENCOIN_SAVINGS_VAULT_URL = 'https://app.frankencoin.com/savings/vault';

type SwapStrategyResolver = (vaultAddress: string) => SwapStrategyMeta;

const morpho: SwapStrategyResolver = (vaultAddress) => ({
	provider: 'Morpho',
	url: `https://app.morpho.org/ethereum/vault/${vaultAddress}`,
});

const frankencoin: SwapStrategyResolver = () => ({ provider: 'Frankencoin', url: FRANKENCOIN_SAVINGS_VAULT_URL });

// Keyed by normalized (lowercase) module address; always go through getSwapSwapStrategyMeta to look one up.
const STRATEGIES: Record<string, SwapStrategyResolver> = {
	[normalizeAddress(addresses.usduSwapBridgeMorphoV1_steakUSDC_module)]: morpho,
	[normalizeAddress(addresses.usduSwapBridgeMorphoV1_steakUSDT_module)]: morpho,
	[normalizeAddress(addresses.euruSwapBridgeMorphoV1_steakEURC_module)]: morpho,
	[normalizeAddress(addresses.chfuSwapBridgeMorphoV1_ZCHF_module)]: frankencoin,
};

/**
 * Returns the provider metadata for a swap module's strategy, or undefined if the module isn't known.
 * @param moduleAddress - The swap module (bridge) address
 * @param vaultAddress - The ERC4626 vault the module deposits into, used for providers that link per vault
 */
export function getSwapSwapStrategyMeta(moduleAddress: string, vaultAddress: string): SwapStrategyMeta | undefined {
	return STRATEGIES[normalizeAddress(moduleAddress)]?.(vaultAddress);
}
