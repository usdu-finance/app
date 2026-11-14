import { useMemo, useRef } from 'react';
import { dateStr, shortAddr } from './godeye.format';
import { Glass, StatCard } from './GodEyeUi';
import {
	Amount,
	buildSeries,
	DAO,
	DaoSectionProps,
	explorerAddress,
	FlowMonth,
	FlowRow,
	FlowTable,
	monthLabel,
	monthOf,
	MonthChart,
	SECTION,
} from './daoFlow';

// The table lists the biggest earners; modules under the threshold (and anything past the row limit) share one row
const MIN_ROW_INCOME = 0.1;
const MAX_ROWS = 8;

// Modules grouped by the strategy they run, matched on the indexer's label (e.g. "Curve Adapter V1.1 USDC #2 (retired)")
const FAMILIES = [
	{ key: 'curve', name: 'Curve', color: '#0d9488', match: /curve/i },
	{ key: 'morpho', name: 'Morpho', color: '#2563eb', match: /morpho/i },
	{ key: 'termmax', name: 'TermMax', color: '#f16325', match: /termmax/i },
	{ key: 'bridge', name: 'Swap bridges', color: '#9333ea', match: /bridge/i },
	{ key: 'other', name: 'Other', color: '#94a3b8', match: /./ },
];
const familyOf = (label: string | null) => FAMILIES.find((f) => f.match.test(label ?? '')) ?? FAMILIES[FAMILIES.length - 1];
// Contributions (the initial funding and any later transfer from a plain wallet) are a category of their own
const CONTRIBUTION = { name: 'Contribution', caption: 'Funds sent in by other wallets', color: '#0ea5e9' };
const CONTRIBUTION_FAMILY = { key: 'contribution', name: CONTRIBUTION.name, color: CONTRIBUTION.color };

/**
 * What modules and minters paid the DAO, per month and per module, read from the DAO wallet's own transfers (the
 * stablecoins and the coins backing them, so the swap-out fees the bridges pay in USDC, EURC... are in), plus
 * contributions from plain wallets.
 */
export default function DaoEarnings({
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
		if (!data) return null;
		const months = new Map<number, FlowMonth>();
		type Stat = {
			key: string;
			label: string;
			address: string;
			family: { key: string; name: string; color: string };
			coin: string | null;
			in: number;
			count: number;
			last: number;
		};
		// what each module paid, overall (key -1) and per month, so the table can be filtered to one month
		const stats = new Map<number, Map<string, Stat>>();
		// everything that came in, contributions included
		let total = 0;
		let lastIn = 0;
		const earnedByMonth = new Map<number, number>();
		const record = (
			key: string,
			label: string,
			address: string,
			coin: string | null,
			t: number,
			amount: number,
			family: Stat['family'] = familyOf(label)
		) => {
			const month = monthOf(t);
			for (const q of [-1, month]) {
				const byKey = stats.get(q) ?? new Map<string, Stat>();
				stats.set(q, byKey);
				const st = byKey.get(key) ?? { key, label, address, family, coin, in: 0, count: 0, last: 0 };
				st.in += amount;
				st.count += 1;
				st.last = Math.max(st.last, t);
				byKey.set(key, st);
			}
			const m = months.get(month) ?? { total: 0, byGroup: new Map<string, number>(), txs: 0 };
			m.total += amount;
			m.byGroup.set(family.key, (m.byGroup.get(family.key) ?? 0) + amount);
			m.txs += 1;
			months.set(month, m);
			total += amount;
			lastIn = Math.max(lastIn, t);
			earnedByMonth.set(month, (earnedByMonth.get(month) ?? 0) + amount);
		};

		for (const tr of data.transfers) {
			// Only what came in from a module or minter, or from a plain wallet (a contribution). Pools, vaults and other
			// contracts that pay the DAO are pass-throughs for a strategy's own position.
			if (tr.dir !== 'in' || !currencies.includes(tr.currency) || tr.kind === 'other') continue;
			// the combined view values every payment in dollars at the rate of the day it was paid
			const amount = usd ? tr.amount * rateOf(tr.currency, tr.t) : tr.amount;
			// in one currency a source is a row per coin it paid in, with a foreign coin counted one-to-one in the currency; combined, a source is one row
			const coinKey = usd ? '' : `|${tr.coin}`;
			const coin = usd || tr.coin === symbol ? null : tr.coin;
			if (tr.kind === 'wallet') record(`contribution${coinKey}`, CONTRIBUTION.name, '', coin, tr.t, amount, CONTRIBUTION_FAMILY);
			else record(`${tr.peer}${coinKey}`, tr.label ?? shortAddr(tr.peer), tr.peer, coin, tr.t, amount);
		}

		/** the table's rows for one month (or all time): the biggest earners, with the small ones merged into "Other" */
		const rowsFor = (month: number | null): FlowRow[] => {
			const sources = [...(stats.get(month ?? -1)?.values() ?? [])].sort((a, b) => b.in - a.in);
			const big = sources.filter((s) => s.in >= MIN_ROW_INCOME);
			const small = sources.filter((s) => s.in < MIN_ROW_INCOME);
			// the "other" row takes a slot of its own, so it only exists when something is left over
			const cut = big.length + (small.length ? 1 : 0) <= MAX_ROWS ? big.length : MAX_ROWS - 1;
			const rest = [...big.slice(cut), ...small];
			const toRow = (s: Stat): FlowRow => ({
				key: s.key,
				label: s.label,
				caption: s.family.key === CONTRIBUTION_FAMILY.key ? CONTRIBUTION.caption : s.family.name,
				color: s.family.color,
				// a swap bridge opens its page in the swap dashboard; anything else goes to the explorer
				href: !s.address
					? null
					: s.family.key === 'bridge'
						? `/dashboard/swap/${s.address}/stable`
						: explorerAddress(s.address),
				internal: s.family.key === 'bridge',
				in: s.in,
				count: s.count,
				last: s.last,
				coin: s.coin,
			});
			const rows = big.slice(0, cut).map(toRow);
			if (rest.length === 1) rows.push(toRow(rest[0]));
			else if (rest.length > 1)
				rows.push({
					key: 'other',
					label: `Other (${rest.length} modules)`,
					caption: 'Smaller modules',
					color: FAMILIES[FAMILIES.length - 1].color,
					href: null,
					in: rest.reduce((a, s) => a + s.in, 0),
					count: rest.reduce((a, s) => a + s.count, 0),
					last: Math.max(...rest.map((s) => s.last)),
					coin: null,
				});
			return rows;
		};

		const all = [...(stats.get(-1)?.values() ?? [])];
		const built = buildSeries(months);
		return {
			total,
			lastIn,
			rowsFor,
			modules: new Set(all.filter((s) => s.family.key !== CONTRIBUTION_FAMILY.key).map((s) => s.address)).size,
			groups: [
				...(all.some((s) => s.family.key === CONTRIBUTION_FAMILY.key) ? [CONTRIBUTION_FAMILY] : []),
				...FAMILIES.filter((f) => all.some((s) => s.family.key === f.key)),
			],
			...built,
			thisMonth: earnedByMonth.get(built.now) ?? 0,
			symbol,
		};
	}, [data, currencies, usd, rateOf, symbol]);

	// Keep showing the previous numbers while a new currency loads, so toggling does not flash a loading state
	const lastModel = useRef<typeof model>(null);
	if (model) lastModel.current = model;
	const shown = model ?? lastModel.current;
	const stale = !model || loading || (usd && !fxReady);

	const selectedMonth = selected !== null ? shown?.series.find((m) => m.month === selected) : undefined;

	return (
		<div className={SECTION}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">DAO earnings</h2>
					<p className="text-xs text-text-muted">
						Revenue that modules and minters paid to the DAO curator{' '}
						<a
							href={explorerAddress(DAO)}
							target="_blank"
							rel="noreferrer"
							className="underline decoration-dotted hover:text-usdu-black"
						>
							{shortAddr(DAO)}
						</a>
						{usd
							? ', across USDU, EURU and CHFU, converted to USD at the exchange rate of the day it was paid.'
							: `, in ${symbol} or the bridge's backing coin (counted 1:1).`}{' '}
						Contributions (funds sent in by other wallets) count as income too.
					</p>
				</div>
			</div>

			{error && !shown && <Glass className="p-4 text-sm text-rose-600">Could not load the earnings: {error}</Glass>}
			{usd && fxError && (
				<Glass className="p-4 text-sm text-rose-600">Could not load exchange rates, so the combined view is unavailable.</Glass>
			)}
			{!error && !(usd && fxError) && !shown && <Glass className="p-6 text-center text-sm text-text-muted">Loading transfers…</Glass>}

			{!(usd && fxError) && shown && (
				<div className={`space-y-3 transition-opacity ${stale ? 'opacity-60' : ''}`}>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						<StatCard label="Total income" value={<Amount value={shown.total} coin={shown.symbol} />} />
						<StatCard
							label={selectedMonth ? `Selected month (${selectedMonth.key})` : `This month (${monthLabel(shown.now)})`}
							value={<Amount value={selectedMonth ? selectedMonth.total : shown.thisMonth} coin={shown.symbol} />}
						/>
						<StatCard label="Modules" value={shown.modules} />
						<StatCard label="Last transfer" value={shown.lastIn ? dateStr(shown.lastIn) : '–'} />
					</div>

					<MonthChart
						title="Received per month"
						series={shown.series}
						groups={shown.groups}
						symbol={shown.symbol}
						selected={selected}
						onSelect={onSelect}
					/>

					<FlowTable
						title="Sources"
						headers={{ name: 'Source', amount: 'Received', count: 'Transfers' }}
						rows={shown.rowsFor(selected)}
						empty={`No module or minter has paid the DAO any ${shown.symbol} yet.`}
						total={shown.total}
						symbol={shown.symbol}
						selected={selectedMonth}
						onClear={() => onSelect(null)}
					/>
				</div>
			)}
		</div>
	);
}
