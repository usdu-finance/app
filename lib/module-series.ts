import type { ModuleSnapshot, ModuleSwapDay } from '@/hooks/useModuleDaily';

export interface SeriesPoint {
	t: number; // unix seconds
	v: number;
}

const DAY = 86_400;

/**
 * Daily snapshots with the live on-chain value as the latest point. A snapshot already taken today is
 * replaced by the live value, because it is newer.
 */
export function withLive(snapshots: ModuleSnapshot[], live: { totalMinted: number; totalRevenue: number }): ModuleSnapshot[] {
	const today = Math.floor(Date.now() / 1000 / DAY) * DAY;
	const past = snapshots.filter((s) => s.day < today);
	return [...past, { day: today, ...live }];
}

/** Stablecoin minted against the module (the module's TVL) per day. */
export function tvlSeries(points: ModuleSnapshot[]): SeriesPoint[] {
	return points.map((p) => ({ t: p.day, v: p.totalMinted }));
}

/** Revenue accrued per day, from the change of the cumulative total. Fees and strategy yield are both included. */
export function revenueSeries(points: ModuleSnapshot[]): SeriesPoint[] {
	return points.slice(1).map((p, i) => ({ t: p.day, v: Math.max(p.totalRevenue - points[i]!.totalRevenue, 0) }));
}

/** Swap volume (in + out) per day. Days without swaps are zero; the days follow the snapshot days. */
export function volumeSeries(points: ModuleSnapshot[], swapDays: ModuleSwapDay[]): SeriesPoint[] {
	const byDay = new Map(swapDays.map((d) => [d.day, d.volume]));
	return points.map((p) => ({ t: p.day, v: byDay.get(p.day) ?? 0 }));
}
