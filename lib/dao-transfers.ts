import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { TOKENS } from '@/lib/tokens/config';

/**
 * Shared by the /api/dao/transfers route and the DAO finance sections: which coins count as DAO money, and the shape of
 * one transfer the route serves.
 */

const A = ADDRESS[mainnet.id];

export type DaoCurrency = 'USDU' | 'EURU' | 'CHFU';

/**
 * The coins that count, by lowercase address (a symbol alone could be spoofed by anyone sending the DAO a token), each
 * as one unit of the currency it stands for: USDC and USDT for USDU, EURC and dEURO for EURU, ZCHF for CHFU. This is the
 * same one-to-one assumption the swap modules make. Every other token in the wallet (airdrops, vault shares) is ignored.
 */
export const DAO_COINS: Record<string, { symbol: string; currency: DaoCurrency }> = {
	[A.usduStable.toLowerCase()]: { symbol: 'USDU', currency: 'USDU' },
	[A.euruStable.toLowerCase()]: { symbol: 'EURU', currency: 'EURU' },
	[A.chfuStable.toLowerCase()]: { symbol: 'CHFU', currency: 'CHFU' },
	[TOKENS.USDC.address.toLowerCase()]: { symbol: 'USDC', currency: 'USDU' },
	[TOKENS.USDT.address.toLowerCase()]: { symbol: 'USDT', currency: 'USDU' },
	'0x1abaea1f7c830bd89acc67ec4af516284b1bc33c': { symbol: 'EURC', currency: 'EURU' },
	[TOKENS.dEURO.address.toLowerCase()]: { symbol: 'dEURO', currency: 'EURU' },
	[TOKENS.ZCHF.address.toLowerCase()]: { symbol: 'ZCHF', currency: 'CHFU' },
};

/**
 * The swap bridges, found by name in usdu-core's addresses (`<stable>SwapBridgeMorphoV1_<coin vault>_module`), so a
 * bridge added there is picked up without a change. The stablecoin is the prefix and the backing coin the suffix, e.g.
 * `euruSwapBridgeMorphoV1_steakEURC_module` is EURU / steakEURC. Swapping out pays the bridge's fee to the DAO in that
 * backing coin, which shows up as an ordinary transfer from the bridge.
 */
export const SWAP_BRIDGES = Object.entries(A).flatMap(([key, address]) => {
	const m = key.match(/^(usdu|euru|chfu)SwapBridgeMorphoV1_(.+)_module$/);
	if (!m) return [];
	return [{ module: String(address).toLowerCase(), label: `${m[1].toUpperCase()} Bridge ${m[2]}` }];
});

/** Who is on the other side of a transfer: a protocol module or minter, a plain wallet, or any other known contract (pools, vaults, the multisig...) */
export type DaoPeerKind = 'module' | 'wallet' | 'other';

export interface DaoTransfer {
	txHash: string;
	/** unix seconds */
	t: number;
	/** `in` reached the DAO wallet, `out` left it */
	dir: 'in' | 'out';
	/** the other side's lowercase address */
	peer: string;
	kind: DaoPeerKind;
	/** the module's name, when it is one */
	label: string | null;
	/** the coin's symbol */
	coin: string;
	/** the currency the coin counts in */
	currency: DaoCurrency;
	amount: number;
}

export interface DaoTransfers {
	transfers: DaoTransfer[];
	/** transfers in coins that are not counted (airdrops, vault shares), so the page can say they exist */
	ignored: number;
	/** unix seconds the server last read the chain */
	updated: number;
}
