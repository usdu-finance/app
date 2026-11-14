import { erc20Abi } from 'viem';
import {
	ICurveStableSwapNG_ABI,
	ISwapBridgeMorphoV1_ABI,
	ISwapRouterV1_ABI,
	ITwocrypto_ABI,
	Stablecoin_ABI,
	StreamerVaultV1_ABI,
	ZapperSwapEnsoV1_ABI,
} from '@usdu-finance/usdu-core';
import type { CurvePoolKind } from '@/lib/onchain/curve';
import { ZAPPER_SWAP_ADDRESS } from '@/lib/constants';
import type { TxCall } from './types';

type Address = `0x${string}`;

/** Fee of a public module proposal, paid in the stablecoin to its curator (ConstantsLib.PUBLIC_FEE). */
export const PUBLIC_PROPOSAL_FEE = 10_000n * 10n ** 18n;

/** Builders for the calls of a batch. They only describe a call, `useTx().submit` sends them. */

export const approveCall = (token: Address, spender: Address, amount: bigint, symbol: string): TxCall => ({
	address: token,
	abi: erc20Abi,
	functionName: 'approve',
	args: [spender, amount],
	label: `Approve ${symbol}`,
});

export const swapInCall = (router: Address, module: Address, amount: bigint): TxCall => ({
	address: router,
	abi: ISwapRouterV1_ABI,
	functionName: 'swapIn',
	args: [module, amount],
	label: 'Swap',
});

export const swapOutCall = (router: Address, module: Address, amount: bigint): TxCall => ({
	address: router,
	abi: ISwapRouterV1_ABI,
	functionName: 'swapOut',
	args: [module, amount],
	label: 'Swap',
});

// StableSwapNG takes int128 indices, Twocrypto uint256; both accept bigint here
const curveAbi = (kind: CurvePoolKind) => (kind === 'stable' ? ICurveStableSwapNG_ABI : ITwocrypto_ABI);

export const curveExchangeCall = (kind: CurvePoolKind, pool: Address, i: bigint, j: bigint, dx: bigint, minDy: bigint): TxCall => ({
	address: pool,
	abi: curveAbi(kind),
	functionName: 'exchange',
	args: [i, j, dx, minDy],
	label: 'Swap',
});

export const addLiquidityCall = (kind: CurvePoolKind, pool: Address, amounts: readonly [bigint, bigint], minMint: bigint): TxCall => ({
	address: pool,
	abi: curveAbi(kind),
	functionName: 'add_liquidity',
	args: [kind === 'stable' ? [...amounts] : amounts, minMint],
	label: 'Deposit',
});

export const removeLiquidityCall = (
	kind: CurvePoolKind,
	pool: Address,
	amount: bigint,
	minAmounts: readonly [bigint, bigint]
): TxCall => ({
	address: pool,
	abi: curveAbi(kind),
	functionName: 'remove_liquidity',
	args: [amount, kind === 'stable' ? [...minAmounts] : minAmounts],
	label: 'Withdraw',
});

export const stakeCall = (vault: Address, assets: bigint, receiver: Address): TxCall => ({
	address: vault,
	abi: StreamerVaultV1_ABI,
	functionName: 'deposit',
	args: [assets, receiver],
	label: 'Stake',
});

export const unstakeCall = (vault: Address, shares: bigint, receiver: Address): TxCall => ({
	address: vault,
	abi: StreamerVaultV1_ABI,
	functionName: 'redeem',
	args: [shares, receiver, receiver],
	label: 'Unstake',
});

/** A step in ZapperSwapEnsoV1's encoding, as returned by /api/zap/quote (numbers arrive as strings over JSON). */
export interface ZapperSwapStepJson {
	kind: number;
	target: Address;
	module: Address;
	tokenIn: Address;
	tokenOut: Address;
	amountIn: string;
	minOut: string;
	i: number;
	j: number;
	value: string;
	data: `0x${string}`;
}

export const zapCall = (args: {
	tokenIn: Address;
	amountIn: bigint;
	steps: ZapperSwapStepJson[];
	tokenOut: Address;
	minAmountOut: bigint;
	recipient: Address;
	/** ETH to send along; only for a native-ETH input, where it must equal amountIn. */
	value?: bigint;
}): TxCall => ({
	address: ZAPPER_SWAP_ADDRESS,
	abi: ZapperSwapEnsoV1_ABI,
	functionName: 'zap',
	args: [
		args.tokenIn,
		args.amountIn,
		args.steps.map((s) => ({ ...s, amountIn: BigInt(s.amountIn), minOut: BigInt(s.minOut), value: BigInt(s.value) })),
		args.tokenOut,
		args.minAmountOut,
		args.recipient,
	],
	value: args.value,
	label: 'Zap',
});

/** Proposes `module` on `stablecoin` until `expiredAt` (unix seconds). The stablecoin moves the fee itself, no approval needed. */
export const proposeModuleCall = (stablecoin: Address, module: Address, expiredAt: bigint, message: string): TxCall => ({
	address: stablecoin,
	abi: Stablecoin_ABI,
	functionName: 'setModulePublic',
	args: [module, expiredAt, message, PUBLIC_PROPOSAL_FEE],
	label: 'Propose module',
});

/** Recognizes the module's accrued yield as revenue. Permissionless, but only once per stablecoin timelock. */
export const reconcileCall = (module: Address): TxCall => ({
	address: module,
	abi: ISwapBridgeMorphoV1_ABI,
	functionName: 'reconcile',
	args: [],
	label: 'Claim revenue',
});
