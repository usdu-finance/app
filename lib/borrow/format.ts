import { formatUnits } from 'viem';
import { formatCompactNumber } from '@/lib/utils';
import { CURRENCIES } from './mock';
import { priceToNumber, toNumber } from './math';
import type { BorrowMarket, PositionStatus, ChallengeRisk } from './types';

/** Formatters for the amounts of one stablecoin, e.g. "2.1M USDU". `fmtStable` takes 18-decimal amounts. */
export const stableFormat = (currency: string) => ({
	fmtStable: (value: bigint, round = true) => `${formatCompactNumber(formatUnits(value, 18), 2, '', '', round)} ${currency}`,
	fmtStableNumber: (value: number) => `${formatCompactNumber(value, 2, '')} ${currency}`,
});

export const fmtCollateral = (m: Pick<BorrowMarket, 'collateralDecimals' | 'collateralSymbol'>, value: bigint) =>
	`${formatCompactNumber(formatUnits(value, m.collateralDecimals), 3, '')} ${m.collateralSymbol}`;

/** Contract price ((36 - decimals) decimals) as stablecoin per collateral unit, e.g. "2,400 USDU". */
export const fmtPrice = (m: Pick<BorrowMarket, 'collateralDecimals' | 'currency'>, price: bigint) => {
	const n = priceToNumber(price, m.collateralDecimals);
	return `${n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 4 : n < 100 ? 2 : 0 })} ${m.currency}`;
};

/** 1e18 scaled share as percent, e.g. 0.06e18 -> "6%". */
export const fmtShare = (value: bigint, digits = 2) => `${+(toNumber(value) * 100).toFixed(digits)}%`;

export const fmtPercent = (value: number, digits = 1) => `${+(value * 100).toFixed(digits)}%`;

export function fmtDuration(seconds: number): string {
	const s = Math.max(0, Math.floor(seconds));
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m`;
	return s > 0 ? '<1m' : '0m';
}

export const utilization = (m: Pick<BorrowMarket, 'borrowed' | 'limit'>) => (m.limit === 0n ? 0 : toNumber(m.borrowed) / toNumber(m.limit));

export const STATUS_LABEL: Record<PositionStatus, string> = {
	active: 'Active',
	hot: 'Cooldown',
	challenged: 'Challenged',
	expired: 'Expired',
	closed: 'Closed',
};

/** Badge colors, compatible with the `custom` variant of `Badge`. */
export const STATUS_COLOR: Record<PositionStatus, { customColor: string; customBgColor: string }> = {
	active: { customColor: 'text-success', customBgColor: 'bg-success-bg' },
	hot: { customColor: 'text-yellow-400', customBgColor: 'bg-yellow-400/20' },
	challenged: { customColor: 'text-error', customBgColor: 'bg-error-bg' },
	expired: { customColor: 'text-brand', customBgColor: 'bg-brand/20' },
	closed: { customColor: 'text-text-secondary', customBgColor: 'bg-surface' },
};

export const RISK_LABEL: Record<ChallengeRisk, string> = { low: 'Low', medium: 'Medium', high: 'High' };

/** Cross markets take another native stablecoin as collateral, e.g. EURU against USDU. */
export const isCrossMarket = (m: Pick<BorrowMarket, 'collateralSymbol'>) => (CURRENCIES as readonly string[]).includes(m.collateralSymbol);
