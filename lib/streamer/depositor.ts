import type { Address } from 'viem';
import { ADDRESS } from '@usdu-finance/usdu-core';

/** The native stablecoins the depositor streams into their reward vaults. */
export const STREAMER_FLOWS: { symbol: 'USDU' | 'EURU' | 'CHFU'; token: Address; vault: Address }[] = [
	{ symbol: 'USDU', token: ADDRESS[1].usduStable, vault: ADDRESS[1].usduStreamerVaultV1 },
	{ symbol: 'EURU', token: ADDRESS[1].euruStable, vault: ADDRESS[1].euruStreamerVaultV1 },
	{ symbol: 'CHFU', token: ADDRESS[1].chfuStable, vault: ADDRESS[1].chfuStreamerVaultV1 },
];
