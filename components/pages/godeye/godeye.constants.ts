import { GodEyeKind } from './godeye.types';

export const KIND_META: Record<GodEyeKind, { color: string; name: string }> = {
	mint: { color: '#e11d48', name: 'Mint / Burn' },
	wallet: { color: '#2563eb', name: 'Wallets' },
	position: { color: '#d97706', name: 'Vaults' },
	minter: { color: '#9333ea', name: 'Modules & minters' },
	savings: { color: '#16a34a', name: 'Savings' },
	equity: { color: '#f16325', name: 'Reserve & staking' },
	bridge: { color: '#db2777', name: 'Bridges' },
	dex: { color: '#0d9488', name: 'DEX pools' },
	contract: { color: '#64748b', name: 'Contracts' },
	others: { color: '#94a3b8', name: 'Rest of network' },
};

export const KIND_ORDER = Object.keys(KIND_META) as GodEyeKind[];

export const EXPLORER: Record<number, string> = {
	1: 'https://etherscan.io',
};

export const WINDOWS = [
	{ label: 'All time', value: 0 },
	{ label: '7 days', value: 604800 },
	{ label: '30 days', value: 2592000 },
	{ label: '90 days', value: 7776000 },
	{ label: '1 year', value: 31536000 },
];

export const SPEEDS = [
	{ label: '1 day / s', value: 86400 },
	{ label: '1 week / s', value: 604800 },
	{ label: '1 month / s', value: 2592000 },
	{ label: '3 months / s', value: 7776000 },
];
