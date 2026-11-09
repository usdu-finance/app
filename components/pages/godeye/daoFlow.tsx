import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { TokenLogo } from '@/components/ui/logo';
import { TOKENS } from '@/lib/tokens/config';
import { fetchCowTokenList } from '@/lib/tokens/cow-service';
import { EXPLORER } from './godeye.constants';
import type { DaoCurrency, DaoTransfers } from '@/lib/dao-transfers';
import { dateStr, fmt } from './godeye.format';
import { Dot, Glass, SectionTitle } from './GodEyeUi';

/** Shared by DaoEarnings and DaoExpenses: the same quarter axis, chart, table and amounts, with different data behind them. */

/** The DAO's curator address: what the earnings are paid to and the expenses are paid from */
export const DAO = ADDRESS[mainnet.id].curator.toLowerCase();

/** The frame of one section of the page */
export const SECTION = 'relative min-h-[420px] rounded-lg border border-usdu-surface bg-usdu-bg p-4 md:p-6 space-y-4 text-usdu-black';

/** What DaoFinances hands to both sections, which share the currency switch, the selected quarter and one transfer feed */
export type DaoSectionProps = {
	/** the currency switch, shared by both sections so they always show the same currency */
	token: string | null;
	currencyOptions: { value: string; label: string }[];
	onToken: (token: string) => void;
	/** the currencies to add up: one, or all three for the combined view */
	currencies: DaoCurrency[];
	/** combined view: every amount is converted to USD at the rate of the day it was paid */
	usd: boolean;
	rateOf: (symbol: string, t: number) => number;
	fxReady: boolean;
	fxError: string | null;
	/** what amounts are shown in: the currency's symbol, or USD for the combined view */
	symbol: string;
	/** the quarter the table is filtered to, as an index into the series; null shows all time */
	selected: number | null;
	onSelect: (q: number | null) => void;
	transfers: { data: DaoTransfers | null; loading: boolean; error: string | null };
};

// The chart always spans at least two years of quarters, so it keeps its shape while there is little (or nothing) to show
const MIN_QUARTERS = 8;

export const quarterOf = (t: number) => {
	const d = new Date(t * 1000);
	return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3);
};
export const quarterLabel = (q: number) => `${String(Math.floor(q / 4)).slice(2)}Q${(q % 4) + 1}`;

export type FlowMonth = { total: number; byGroup: Map<string, number>; txs: number };
export type FlowSeries = FlowMonth & { q: number; key: string };
export type FlowGroup = { key: string; name: string; color: string };
export type FlowRow = {
	key: string;
	label: string;
	caption: string;
	color: string;
	/** where the label links to, if anywhere */
	href: string | null;
	/** the href is a page of this app (opened in place) rather than an external link */
	internal?: boolean;
	in: number;
	count: number;
	last: number;
	/** set when the row is paid in a coin other than the section's currency */
	coin: string | null;
};

/** Every quarter up to the current one, back to whichever is earlier: the first entry or the minimum span */
export function buildSeries(months: Map<number, FlowMonth>) {
	const now = quarterOf(Date.now() / 1000);
	const first = Math.min(now - (MIN_QUARTERS - 1), ...months.keys());
	const last = Math.max(now, ...months.keys());
	const series: FlowSeries[] = [];
	for (let q = first; q <= last; q++) {
		series.push({ q, key: quarterLabel(q), ...(months.get(q) ?? { total: 0, byGroup: new Map(), txs: 0 }) });
	}
	return { series, now, thisQuarter: months.get(now)?.total ?? 0 };
}

// Last resort for coins neither the protocol's registry nor the CoW list has a logo for
const LOCAL_LOGOS: Record<string, string> = { EURC: '/coin/eurc.png' };

/** An amount followed by a tiny logo of its token instead of the symbol */
export function Amount({ value, coin }: { value: number; coin: string }) {
	// same query as the zap card, so the CoW list is fetched once for the whole app
	const { data: cow } = useQuery({ queryKey: ['cow-token-list'], queryFn: fetchCowTokenList, staleTime: 60 * 60 * 1000 });
	// the protocol's own list wins (the CoW list may carry another token with the same symbol), then CoW, then local files
	const logo =
		TOKENS[coin]?.logoURI ??
		cow?.find((t) => t.chainId === 1 && t.symbol.toLowerCase() === coin.toLowerCase())?.logoURI ??
		LOCAL_LOGOS[coin];
	// the combined view is valued in dollars, which has no token logo
	if (coin === 'USD') return <span title="USD">${fmt(value, 2)}</span>;
	return (
		<span className="inline-flex items-center gap-1" title={coin}>
			{fmt(value, 2)}
			<TokenLogo currency={coin} logoURI={logo} size={4} />
		</span>
	);
}

/**
 * One bar per quarter, stacked by group. A quarter with entries can be clicked to select it (clicking it again clears
 * the selection), which the parent uses to filter the tables.
 */
export function QuarterChart({
	title,
	series,
	groups,
	symbol,
	selected,
	onSelect,
}: {
	title: string;
	series: FlowSeries[];
	groups: FlowGroup[];
	symbol: string;
	selected: number | null;
	onSelect: (q: number | null) => void;
}) {
	const [hover, setHover] = useState<string | null>(null);
	const active = hover ? series.find((m) => m.key === hover) : undefined;
	const max = Math.max(...series.map((m) => m.total), 0);

	return (
		<Glass className="p-4">
			<SectionTitle
				right={
					active ? (
						<span className="inline-flex items-center gap-1.5">
							{active.key} · <Amount value={active.total} coin={symbol} /> · {active.txs} {active.txs === 1 ? 'tx' : 'txs'}
						</span>
					) : undefined
				}
			>
				{title}
			</SectionTitle>
			<div className="flex h-48 items-end gap-1" onMouseLeave={() => setHover(null)}>
				{series.map((m) => {
					const isSelected = selected === m.q;
					const dimmed = (hover !== null && hover !== m.key) || (selected !== null && !isSelected);
					return (
						<button
							type="button"
							key={m.key}
							disabled={m.total <= 0}
							aria-pressed={isSelected}
							aria-label={`${m.key}: ${fmt(m.total, 2)} ${symbol}`}
							onClick={() => onSelect(isSelected ? null : m.q)}
							onMouseEnter={() => setHover(m.key)}
							className={`group flex h-full min-w-0 flex-1 flex-col justify-end rounded-t bg-black/[0.04] transition-shadow enabled:cursor-pointer enabled:hover:bg-black/[0.07] focus-visible:outline-none ${isSelected ? 'bg-black/[0.07]' : ''}`}
							style={
								isSelected ? { boxShadow: '0 0 0 1px rgba(245,158,11,0.9), 0 0 18px 3px rgba(241,99,37,0.5)' } : undefined
							}
						>
							<div
								className={`flex w-full flex-col-reverse overflow-hidden rounded-t transition-opacity ${dimmed ? 'opacity-40' : ''}`}
								style={{ height: `${max > 0 ? (m.total / max) * 100 : 0}%` }}
							>
								{groups.map((g) => {
									const v = m.byGroup.get(g.key) ?? 0;
									return v > 0 ? (
										<div key={g.key} style={{ height: `${(v / m.total) * 100}%`, background: g.color }} />
									) : null;
								})}
							</div>
						</button>
					);
				})}
			</div>
			<div className="mt-1 flex gap-1 text-[10px] text-text-muted">
				{series.map((m, i) => (
					// past a year of bars the labels get tight, so every other one is dropped
					<span key={m.key} className="min-w-0 flex-1 text-center">
						{series.length > 12 && (series.length - 1 - i) % 2 ? '' : m.key}
					</span>
				))}
			</div>
			<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
				{groups.map((g) => (
					<span key={g.key} className="inline-flex items-center gap-1.5">
						<Dot color={g.color} size={8} />
						{g.name}
					</span>
				))}
			</div>
		</Glass>
	);
}

/** The rows behind the chart, for the selected quarter or all time */
export function FlowTable({
	title,
	headers,
	rows,
	empty,
	total,
	symbol,
	selected,
	onClear,
}: {
	title: string;
	headers: { name: string; amount: string; count: string };
	rows: FlowRow[];
	/** shown in place of the rows when there are none yet */
	empty: string;
	/** all-time total, the share base when no quarter is selected */
	total: number;
	symbol: string;
	selected?: FlowSeries;
	onClear: () => void;
}) {
	return (
		<Glass className="p-4">
			<SectionTitle
				right={
					selected ? (
						<span className="inline-flex items-center gap-2">
							<Amount value={selected.total} coin={symbol} />
							<button
								type="button"
								onClick={onClear}
								className="rounded-md border border-black/10 bg-black/5 px-1.5 py-0.5 text-[10px] hover:bg-black/10"
							>
								Show all time ✕
							</button>
						</span>
					) : undefined
				}
			>
				{title} · {selected ? selected.key : 'all time'}
			</SectionTitle>
			{/* the padding gives the dots' glow room inside the scroll box, the negative margin keeps the table where it was */}
			<div className="-mx-3 overflow-x-auto px-3">
				<table className="w-full text-sm">
					<thead className="text-left text-[10px] uppercase tracking-wider text-text-muted">
						<tr>
							<th className="py-1 pr-3 font-medium">{headers.name}</th>
							<th className="py-1 pr-3 text-right font-medium">{headers.amount}</th>
							<th className="py-1 pr-3 text-right font-medium">Share</th>
							<th className="py-1 pr-3 text-right font-medium">{headers.count}</th>
							<th className="py-1 text-right font-medium">Last</th>
						</tr>
					</thead>
					<tbody>
						{rows.length === 0 && (
							<tr className="border-t border-black/5">
								<td colSpan={5} className="py-4 text-center text-text-muted">
									{empty}
								</td>
							</tr>
						)}
						{rows.map((r) => {
							const name = (
								<>
									<Dot color={r.color} size={8} />
									{/* on a narrow screen the caption sits under the name instead of squeezing beside it */}
									<span className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
										<span className="font-medium">{r.label}</span>
										<span className="text-xs text-text-muted">{r.caption}</span>
									</span>
								</>
							);
							return (
								<tr key={r.key} className="border-t border-black/5">
									<td className="min-w-[11rem] py-1.5 pr-3 sm:min-w-0">
										{r.href && r.internal ? (
											<Link href={r.href} className="inline-flex items-center gap-2 hover:underline">
												{name}
											</Link>
										) : r.href ? (
											<a
												href={r.href}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-2 hover:underline"
											>
												{name}
											</a>
										) : (
											<span className="inline-flex items-center gap-2">{name}</span>
										)}
									</td>
									<td className="py-1.5 pr-3 text-right tabular-nums">
										<Amount value={r.in} coin={r.coin ?? symbol} />
									</td>
									<td className="py-1.5 pr-3 text-right tabular-nums">
										{((r.in / (selected?.total ?? total)) * 100).toFixed(1)}%
									</td>
									<td className="py-1.5 pr-3 text-right tabular-nums">{r.count}</td>
									<td className="py-1.5 text-right tabular-nums text-text-muted">{dateStr(r.last)}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</Glass>
	);
}

export const explorerAddress = (address: string) => `${EXPLORER[1]}/address/${address}`;
