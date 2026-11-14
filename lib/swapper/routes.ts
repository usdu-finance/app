import { encodeFunctionData, parseAbi, type Address } from 'viem';
import { ISwapRouterV1_ABI } from '@usdu-finance/usdu-core';
import type { SwapModule } from '@/hooks/useSwapModules';
import { TOKENS } from '@/lib/tokens/config';

/** A foreign token the DAO may hold. */
export interface ForeignToken {
	symbol: string;
	address: Address;
	decimals: number;
}

// Circle EURC on Ethereum mainnet
const EURC_ADDRESS: Address = '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c';
// svDEURO, the ERC-4626 share of dEURO savings
export const SV_DEURO_ADDRESS: Address = '0x1F0e1d27b3D7F8A73D03a10D3078C32933297e90';

/** The swapper has no way to list its routes, so the app asks for each of these. */
export const FOREIGN_TOKENS: ForeignToken[] = [
	{ symbol: 'USDC', address: TOKENS.USDC.address as Address, decimals: 6 },
	{ symbol: 'USDT', address: TOKENS.USDT.address as Address, decimals: 6 },
	{ symbol: 'ZCHF', address: TOKENS.ZCHF.address as Address, decimals: 18 },
	{ symbol: 'EURC', address: EURC_ADDRESS, decimals: 6 },
	{ symbol: 'dEURO', address: TOKENS.dEURO.address as Address, decimals: 18 },
	{ symbol: 'svDEURO', address: SV_DEURO_ADDRESS, decimals: 18 },
];

export const ERC4626_ABI = parseAbi([
	'function asset() view returns (address)',
	'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
	'function convertToAssets(uint256 shares) view returns (uint256)',
]);

/** A token along the path. */
export interface PathToken {
	address: Address;
	symbol: string;
	decimals: number;
}

/**
 * A step as picked in the UI:
 * - `unwrap`: redeem the ERC-4626 foreign token on its own address, only possible as the first step
 * - `in:<moduleKey>`: swap the bridge's coin into its stablecoin through the Stable Bridge's router
 * - `out:<moduleKey>`: swap the bridge's stablecoin back into its coin
 */
export type StepChoice = 'unwrap' | `in:${string}` | `out:${string}`;

export interface PathContext {
	modules: SwapModule[];
	swapper: Address;
	/** Underlying asset of the foreign token, if it is an ERC-4626 vault. */
	asset?: PathToken;
	/** Assets per share of the vault, in whole tokens. */
	sharePrice?: number;
}

export interface ResolvedPath {
	steps: {
		target: Address;
		tokenIn: Address;
		tokenOut: Address;
		patchAmount: boolean;
		amountOffset: number;
		data: `0x${string}`;
	}[];
	hops: { label: string; from: PathToken; to: PathToken }[];
	/** Where the path ends up, the foreign token itself for an empty path. */
	end: PathToken;
	/** Suggested minimum rate in whole tokens (end token per foreign token): par after fees and the vault share price. */
	suggestedRate: number;
	error?: string;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Builds the swapper's steps out of the picked ones. The amount word of each call is patched in by the swapper with
 * its balance of the step's token, so a placeholder 0 goes into the calldata: `redeem(shares, ..)` has it at
 * offset 4, `swapIn(module, amount)` and `swapOut(module, amount)` at 36.
 */
export function resolvePath(token: ForeignToken, choices: StepChoice[], ctx: PathContext): ResolvedPath {
	const out: ResolvedPath = { steps: [], hops: [], end: token, suggestedRate: 1 };
	let current: PathToken = token;

	for (const [i, choice] of choices.entries()) {
		let next: PathToken;
		let label: string;
		let step: ResolvedPath['steps'][number];

		if (choice === 'unwrap') {
			if (i !== 0 || !ctx.asset) return { ...out, error: 'Only a vault token can be unwrapped, as the first step' };
			next = ctx.asset;
			label = `Unwrap · ${current.symbol} → ${next.symbol}`;
			out.suggestedRate *= ctx.sharePrice ?? 1;
			step = {
				target: token.address,
				tokenIn: token.address,
				tokenOut: next.address,
				patchAmount: true,
				amountOffset: 4,
				data: encodeFunctionData({ abi: ERC4626_ABI, functionName: 'redeem', args: [0n, ctx.swapper, ctx.swapper] }),
			};
		} else {
			const [dir, key] = choice.split(':') as ['in' | 'out', string];
			const m = ctx.modules.find((x) => x.key === key);
			if (!m) return { ...out, error: 'Stable Bridge not found' };

			if (dir === 'in') {
				if (!same(current.address, m.coinAddress)) return { ...out, error: `${current.symbol} is not the coin of that Stable Bridge` };
				next = { address: m.targetAddress, symbol: m.currency, decimals: 18 };
				out.suggestedRate *= 1 - m.swapInFeePPM / 1_000_000;
			} else {
				if (!same(current.address, m.targetAddress))
					return { ...out, error: `${current.symbol} is not the stablecoin of that Stable Bridge` };
				next = { address: m.coinAddress, symbol: m.coinSymbol, decimals: m.coinDecimals };
				out.suggestedRate *= 1 - m.swapOutFeePPM / 1_000_000;
			}
			label = `Stable Bridge · ${current.symbol} → ${next.symbol}`;
			step = {
				target: m.routerAddress,
				tokenIn: current.address,
				tokenOut: next.address,
				patchAmount: true,
				amountOffset: 36,
				data: encodeFunctionData({
					abi: ISwapRouterV1_ABI,
					functionName: dir === 'in' ? 'swapIn' : 'swapOut',
					args: [m.moduleAddress, 0n],
				}),
			};
		}

		out.steps.push(step);
		out.hops.push({ label, from: current, to: next });
		current = next;
		out.end = next;
	}

	if (choices.length > 0 && same(out.end.address, token.address)) out.error = 'The path ends in the token it starts with';
	return out;
}

/** Steps that may follow the given path: the unwrap first, and every active module that takes the current token. */
export function nextChoices(
	token: ForeignToken,
	path: ResolvedPath,
	ctx: PathContext,
	now: number
): { value: StepChoice; label: string }[] {
	const options: { value: StepChoice; label: string }[] = [];
	if (path.steps.length === 0 && ctx.asset) options.push({ value: 'unwrap', label: `Unwrap · ${token.symbol} → ${ctx.asset.symbol}` });

	for (const m of ctx.modules) {
		if (Number(m.expiresAt) <= now) continue; // module role expired
		const via = m.vaultName || m.label;
		if (same(path.end.address, m.coinAddress))
			options.push({ value: `in:${m.key}`, label: `Stable Bridge · ${m.coinSymbol} → ${m.currency} (${via})` });
		if (same(path.end.address, m.targetAddress))
			options.push({ value: `out:${m.key}`, label: `Stable Bridge · ${m.currency} → ${m.coinSymbol} (${via})` });
	}
	return options;
}
