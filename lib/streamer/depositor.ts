import type { Address } from 'viem';
import { ADDRESS } from '@usdu-finance/usdu-core';

// TODO: temporary, remove once @usdu-finance/usdu-core with StreamerDepositorV1 is published and deployed: import
// StreamerDepositorV1_ABI and ADDRESS[1].streamerDepositorV1 from the package instead of the local copy below.
// ABI copied from usdu-core (feat/streamer-depositor).

/** TODO: replace with ADDRESS[1].streamerDepositorV1, the zero address until the depositor is deployed. */
export const STREAMER_DEPOSITOR: Address = '0x0000000000000000000000000000000000000000';

export const STREAMER_DEPOSITOR_DEPLOYED = STREAMER_DEPOSITOR !== '0x0000000000000000000000000000000000000000';

/** The native stablecoins the depositor streams into their reward vaults. */
export const STREAMER_FLOWS: { symbol: 'USDU' | 'EURU' | 'CHFU'; token: Address; vault: Address }[] = [
	{ symbol: 'USDU', token: ADDRESS[1].usduStable, vault: ADDRESS[1].usduStreamerVaultV1 },
	{ symbol: 'EURU', token: ADDRESS[1].euruStable, vault: ADDRESS[1].euruStreamerVaultV1 },
	{ symbol: 'CHFU', token: ADDRESS[1].chfuStable, vault: ADDRESS[1].chfuStreamerVaultV1 },
];

export const StreamerDepositorV1_ABI = [
	{
		inputs: [{ internalType: 'contract IStablecoinMetadata', name: '_stable', type: 'address' }],
		stateMutability: 'nonpayable',
		type: 'constructor',
	},
	{ inputs: [], name: 'BadFlow', type: 'error' },
	{ inputs: [{ internalType: 'uint256', name: 'validAt', type: 'uint256' }], name: 'CooldownActive', type: 'error' },
	{ inputs: [{ internalType: 'address', name: 'token', type: 'address' }], name: 'FlowNotEnabled', type: 'error' },
	{ inputs: [], name: 'NothingToDeposit', type: 'error' },
	{ inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
	{ inputs: [{ internalType: 'address', name: 'token', type: 'address' }], name: 'SafeERC20FailedOperation', type: 'error' },
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'token', type: 'address' },
			{ indexed: true, internalType: 'address', name: 'to', type: 'address' },
			{ indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
			{ indexed: false, internalType: 'uint256', name: 'totalExpense', type: 'uint256' },
			{ indexed: false, internalType: 'uint256', name: 'totalFunds', type: 'uint256' },
		],
		name: 'Expense',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [{ indexed: true, internalType: 'address', name: 'token', type: 'address' }],
		name: 'FlowDisabled',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'address', name: 'token', type: 'address' },
			{ indexed: true, internalType: 'address', name: 'vault', type: 'address' },
			{ indexed: false, internalType: 'uint16', name: 'bps', type: 'uint16' },
			{ indexed: false, internalType: 'uint64', name: 'cooldown', type: 'uint64' },
			{ indexed: false, internalType: 'uint256', name: 'flowCap', type: 'uint256' },
		],
		name: 'FlowSet',
		type: 'event',
	},
	{
		inputs: [],
		name: 'BPS_SCALE',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
		name: 'deposit',
		outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
		name: 'depositable',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
		name: 'disableFlow',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
		name: 'getFlow',
		outputs: [
			{
				components: [
					{ internalType: 'bool', name: 'enabled', type: 'bool' },
					{ internalType: 'address', name: 'vault', type: 'address' },
					{ internalType: 'uint16', name: 'bps', type: 'uint16' },
					{ internalType: 'uint64', name: 'cooldown', type: 'uint64' },
					{ internalType: 'uint256', name: 'flowCap', type: 'uint256' },
					{ internalType: 'uint64', name: 'lastDeposit', type: 'uint64' },
					{ internalType: 'uint256', name: 'totalDeposited', type: 'uint256' },
				],
				internalType: 'struct IStreamerDepositorV1.Flow',
				name: '',
				type: 'tuple',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
		name: 'nextDepositAt',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{ internalType: 'address', name: 'token', type: 'address' },
			{ internalType: 'address', name: 'vault', type: 'address' },
			{ internalType: 'uint16', name: 'bps', type: 'uint16' },
			{ internalType: 'uint64', name: 'cooldown', type: 'uint64' },
			{ internalType: 'uint256', name: 'flowCap', type: 'uint256' },
		],
		name: 'setFlow',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'stable',
		outputs: [{ internalType: 'contract IStablecoinMetadata', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function',
	},
] as const;
