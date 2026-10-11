import type { VaultDailyPoint } from '@/hooks/useStreamerVaultDaily';

export interface SeriesPoint {
	t: number; // unix seconds
	v: number;
}

const DAY = 86_400;
const APR_WINDOW_DAYS = 7;

/**
 * Rewards that accrued to stakers between two consecutive snapshots, in the vault's asset.
 * The share price only rises through rewards, and the previous snapshot's shares earned them.
 */
export function yieldSeries(points: VaultDailyPoint[]): SeriesPoint[] {
	return points.slice(1).map((p, i) => {
		const prev = points[i]!;
		return { t: p.day, v: Math.max((p.price - prev.price) * prev.supply, 0) };
	});
}

/**
 * Realized APR in percent: share price growth over a rolling window of up to 7 days, annualized.
 * The window grows from one day, so the series starts as soon as there are two snapshots.
 */
export function aprSeries(points: VaultDailyPoint[]): SeriesPoint[] {
	const result: SeriesPoint[] = [];
	points.forEach((p, i) => {
		const base = points.slice(0, i).find((b) => b.day >= p.day - APR_WINDOW_DAYS * DAY);
		const days = base ? (p.day - base.day) / DAY : 0;
		if (!base || days < 1 || base.price <= 0) return;
		result.push({ t: p.day, v: Math.max((p.price / base.price - 1) * (365 / days) * 100, 0) });
	});
	return result;
}
