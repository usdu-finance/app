import { useMemo, useRef } from 'react';
import { categoryOf, EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/dao-expenses';
import { dateStr, shortAddr } from './godeye.format';
import { Glass, Seg, StatCard } from './GodEyeUi';
import {
	Amount,
	buildSeries,
	DAO,
	DaoSectionProps,
	explorerAddress,
	FlowMonth,
	FlowRow,
	FlowTable,
	quarterLabel,
	quarterOf,
	QuarterChart,
	SECTION,
} from './daoFlow';

/**
 * What the DAO curator paid out, per quarter and per category. The chain only shows transfers, so the category of each
 * payout comes from the ledger in lib/dao-expenses.ts; payouts that are not listed there show as uncategorised.
 */
export default function DaoExpenses({
	token,
	currencyOptions,
	onToken,
	currencies,
	usd,
	rateOf,
	fxReady,
	fxError,
	symbol,
	selected,
	onSelect,
	transfers: { data, loading, error },
}: DaoSectionProps) {
	const model = useMemo(() => {
		type Stat = { category: ExpenseCategory; in: number; txs: Set<string>; last: number };
		const months = new Map<number, FlowMonth>();
		const monthTxs = new Map<number, Set<string>>();
		// what each category paid, overall (key -1) and per quarter
		const stats = new Map<number, Map<ExpenseCategory, Stat>>();
		const allTxs = new Set<string>();
		let total = 0;
		let lastOut = 0;

		for (const r of data?.transfers ?? []) {
			// Only what went to a wallet is paid out. Funds the DAO sends to a module or any other contract are an allocation, not a cost.
			if (r.dir !== 'out' || r.kind !== 'wallet' || !currencies.includes(r.currency)) continue;
			// the combined view values every payout in dollars at the rate of the day it was paid
			const amount = usd ? r.amount * rateOf(r.currency, r.t) : r.amount;
			const category = categoryOf(r.txHash, r.coin);
			const quarter = quarterOf(r.t);
			for (const q of [-1, quarter]) {
				const byCategory = stats.get(q) ?? new Map<ExpenseCategory, Stat>();
				stats.set(q, byCategory);
				const st = byCategory.get(category) ?? { category, in: 0, txs: new Set<string>(), last: 0 };
				st.in += amount;
				st.txs.add(r.txHash);
				st.last = Math.max(st.last, r.t);
				byCategory.set(category, st);
			}
			const txs = monthTxs.get(quarter) ?? new Set<string>();
			txs.add(r.txHash);
			monthTxs.set(quarter, txs);
			const m = months.get(quarter) ?? { total: 0, byGroup: new Map<string, number>(), txs: 0 };
			m.total += amount;
			m.byGroup.set(category, (m.byGroup.get(category) ?? 0) + amount);
			m.txs = txs.size;
			months.set(quarter, m);
			allTxs.add(r.txHash);
			total += amount;
			lastOut = Math.max(lastOut, r.t);
		}

		const rowsFor = (quarter: number | null): FlowRow[] =>
			[...(stats.get(quarter ?? -1)?.values() ?? [])]
				.sort((a, b) => b.in - a.in)
				.map((s) => ({
					key: s.category,
					label: EXPENSE_CATEGORIES[s.category].name,
					caption: EXPENSE_CATEGORIES[s.category].caption,
					color: EXPENSE_CATEGORIES[s.category].color,
					href: null,
					in: s.in,
					count: s.txs.size,
					last: s.last,
					coin: null,
				}));

		const present = new Set(stats.get(-1)?.keys());
		return {
			total,
			payouts: allTxs.size,
			lastOut,
			rowsFor,
			groups: (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[])
				.filter((c) => present.has(c))
				.map((c) => ({ key: c, name: EXPENSE_CATEGORIES[c].name, color: EXPENSE_CATEGORIES[c].color })),
			...buildSeries(months),
			symbol,
		};
	}, [data, currencies, usd, rateOf, symbol]);

	// the combined view cannot be valued until the exchange rates are in, and not at all if they failed
	const ready = !!data && !loading && !(usd && (fxError || !fxReady));
	// Keep showing the previous numbers while a new currency loads, so toggling does not flash a loading state
	const lastModel = useRef<typeof model | null>(null);
	if (ready) lastModel.current = model;
	const shown = lastModel.current;
	const stale = !ready;
	const selectedQuarter = selected !== null ? shown?.series.find((m) => m.q === selected) : undefined;

	return (
		<div className={SECTION}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">DAO expenses</h2>
					<p className="text-xs text-text-muted">
						What the DAO curator{' '}
						<a
							href={explorerAddress(DAO)}
							target="_blank"
							rel="noreferrer"
							className="underline decoration-dotted hover:text-usdu-black"
						>
							{shortAddr(DAO)}
						</a>{' '}
						paid out {usd ? 'across USDU, EURU and CHFU, converted to USD at the exchange rate of the day' : `in ${symbol}`} for
						running the protocol, by category. Payouts without a category yet show as uncategorised.
					</p>
				</div>
				<Seg value={token ?? ''} options={currencyOptions} onChange={onToken} />
			</div>

			{error && !shown && <Glass className="p-4 text-sm text-rose-600">Could not load the expenses: {error}</Glass>}
			{usd && fxError && (
				<Glass className="p-4 text-sm text-rose-600">Could not load exchange rates, so the combined view is unavailable.</Glass>
			)}
			{!error && !shown && !(usd && fxError) && <Glass className="p-6 text-center text-sm text-text-muted">Loading transfers…</Glass>}
			{!(usd && fxError) && shown && (
				<div className={`space-y-3 transition-opacity ${stale ? 'opacity-60' : ''}`}>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						<StatCard label="Total spent" value={<Amount value={shown.total} coin={shown.symbol} />} />
						<StatCard
							label={`This quarter (${quarterLabel(shown.now)})`}
							value={<Amount value={shown.thisQuarter} coin={shown.symbol} />}
						/>
						<StatCard label="Payouts" value={shown.payouts} />
						<StatCard label="Last payout" value={shown.lastOut ? dateStr(shown.lastOut) : '–'} />
					</div>

					<QuarterChart
						title="Spent per quarter"
						series={shown.series}
						groups={shown.groups}
						symbol={shown.symbol}
						selected={selected}
						onSelect={onSelect}
					/>

					<FlowTable
						title="Categories"
						headers={{ name: 'Category', amount: 'Paid', count: 'Payouts' }}
						rows={shown.rowsFor(selected)}
						empty={`The DAO has not paid out any ${shown.symbol} yet.`}
						total={shown.total}
						symbol={shown.symbol}
						selected={selectedQuarter}
						onClear={() => onSelect(null)}
					/>
				</div>
			)}
		</div>
	);
}
