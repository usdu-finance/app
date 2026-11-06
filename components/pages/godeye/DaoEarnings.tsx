import { useMemo, useRef } from 'react';
import { useGodEyeJourneys } from '@/hooks/useGodEye';
import { SWAP_BRIDGES, useSwapOutFees } from '@/hooks/useSwapOutFees';
import { CONTRIBUTION, CONTRIBUTIONS } from '@/lib/dao-contributions';
import { dateStr, shortAddr } from './godeye.format';
import { GodEyeTokenInfo } from './godeye.types';
import { Glass, Seg, StatCard } from './GodEyeUi';
import {
	Amount,
	buildSeries,
	DAO,
	explorerAddress,
	FlowMonth,
	FlowRow,
	FlowTable,
	quarterLabel,
	quarterOf,
	QuarterChart,
	SECTION,
} from './daoFlow';

// The table lists the biggest earners; modules under the threshold (and anything past the row limit) share one row
const MIN_ROW_INCOME = 0.1;
const MAX_ROWS = 8;
// Only modules and minters count: pools and vaults that pay the DAO are pass-throughs for a strategy's own position
const SOURCE_KIND = 'minter' as const;

// Modules grouped by the strategy they run, matched on the indexer's label (e.g. "Curve Adapter V1.1 USDC #2 (deprecated)")
const FAMILIES = [
	{ key: 'curve', name: 'Curve', color: '#0d9488', match: /curve/i },
	{ key: 'morpho', name: 'Morpho', color: '#2563eb', match: /morpho/i },
	{ key: 'termmax', name: 'TermMax', color: '#f16325', match: /termmax/i },
	{ key: 'bridge', name: 'Swap bridges', color: '#9333ea', match: /bridge/i },
	{ key: 'other', name: 'Other', color: '#94a3b8', match: /./ },
];
const familyOf = (label: string | null) => FAMILIES.find((f) => f.match.test(label ?? '')) ?? FAMILIES[FAMILIES.length - 1];
// Contributions (the initial funding and any later transfer from an unknown wallet) are a category of their own
const CONTRIBUTION_FAMILY = { key: 'contribution', name: CONTRIBUTION.name, color: CONTRIBUTION.color };

/**
 * What modules and minters paid the DAO, per quarter and per module, read from the same indexed transfer history as
 * GodEye plus the swap-out fees the bridges pay in their backing coin, and contributions from unknown wallets.
 */
export default function DaoEarnings({
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
}: {
	/** the currency switch, shared by both sections so they always show the same currency */
	token: string | null;
	currencyOptions: { value: string; label: string }[];
	onToken: (token: string) => void;
	/** the stablecoins to add up: one, or all three for the combined view */
	currencies: GodEyeTokenInfo[];
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
}) {
	const {
		data: journeys,
		loading,
		error,
	} = useGodEyeJourneys(
		currencies.map((c) => c.key),
		DAO
	);
	// Swap-out fees reach the DAO in the bridge's backing coin (USDC, EURC, ZCHF, ...), so the stablecoin ledger never sees them
	const { fees, loading: feesLoading, error: feesError } = useSwapOutFees();

	const model = useMemo(() => {
		if (!currencies.length || !currencies.every((c) => journeys[c.key])) return null;
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
		// what each module paid, overall (key -1) and per quarter, so the table can be filtered to one quarter
		const stats = new Map<number, Map<string, Stat>>();
		// everything that came in, contributions included
		let total = 0;
		let lastIn = 0;
		const earnedByQuarter = new Map<number, number>();
		const record = (
			key: string,
			label: string,
			address: string,
			coin: string | null,
			t: number,
			amount: number,
			count: number,
			family: Stat['family'] = familyOf(label)
		) => {
			const quarter = quarterOf(t);
			for (const q of [-1, quarter]) {
				const byKey = stats.get(q) ?? new Map<string, Stat>();
				stats.set(q, byKey);
				const st = byKey.get(key) ?? { key, label, address, family, coin, in: 0, count: 0, last: 0 };
				st.in += amount;
				st.count += count;
				st.last = Math.max(st.last, t);
				byKey.set(key, st);
			}
			const m = months.get(quarter) ?? { total: 0, byGroup: new Map<string, number>(), txs: 0 };
			m.total += amount;
			m.byGroup.set(family.key, (m.byGroup.get(family.key) ?? 0) + amount);
			m.txs += count;
			months.set(quarter, m);
			total += amount;
			lastIn = Math.max(lastIn, t);
			earnedByQuarter.set(quarter, (earnedByQuarter.get(quarter) ?? 0) + amount);
		};

		for (const c of currencies) {
			const journey = journeys[c.key];
			// the combined view values every payment in dollars at the rate of the day it was paid
			const conv = (t: number, amount: number) => (usd ? amount * rateOf(c.symbol, t) : amount);

			for (const d of journey.days) {
				for (const p of d.peers) {
					const peer = journey.peers[p.i];
					if (p.in <= 0) continue;
					// an address the indexer knows nothing about (a plain wallet) sending funds in is a contribution
					if (peer.kind === 'wallet') {
						record(
							usd ? `wallet|${peer.address}` : `wallet|${peer.address}|`,
							shortAddr(peer.address),
							peer.address,
							null,
							d.t,
							conv(d.t, p.in),
							p.count,
							CONTRIBUTION_FAMILY
						);
						continue;
					}
					if (peer.kind !== SOURCE_KIND) continue;
					// in one currency a module is a row per coin it was paid in; combined, a module is one row
					record(
						usd ? peer.address : `${peer.address}|`,
						peer.label ?? shortAddr(peer.address),
						peer.address,
						null,
						d.t,
						conv(d.t, p.in),
						p.count
					);
				}
			}

			// Each foreign coin counts one-to-one in its stablecoin's currency, but is listed on its own row in the coin it was paid in
			const bridges = SWAP_BRIDGES.filter((b) => b.stable === c.symbol);
			for (const f of fees) {
				const b = bridges.find((x) => x.module === f.module);
				if (!b || f.amount <= 0) continue;
				record(usd ? b.module : `${b.module}|${b.coin}`, b.label, b.module, usd ? null : b.coin, f.t, conv(f.t, f.amount), 1);
			}

			// the initial contributions, one row for the lot (a row per coin in a single currency)
			for (const k of CONTRIBUTIONS.filter((x) => x.currency === c.symbol)) {
				const t = Math.floor(Date.parse(k.at) / 1000);
				record(
					usd ? 'contribution' : `contribution|${k.coin}`,
					CONTRIBUTION.name,
					'',
					usd ? null : k.coin,
					t,
					conv(t, k.amount),
					1,
					CONTRIBUTION_FAMILY
				);
			}
		}

		/** the table's rows for one quarter (or all time): the biggest earners, with the small ones merged into "Other" */
		const rowsFor = (quarter: number | null): FlowRow[] => {
			const sources = [...(stats.get(quarter ?? -1)?.values() ?? [])].sort((a, b) => b.in - a.in);
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
				href: s.address ? explorerAddress(s.address) : null,
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
			thisQuarter: earnedByQuarter.get(built.now) ?? 0,
			symbol,
		};
	}, [journeys, currencies, fees, usd, rateOf, symbol]);

	// Keep showing the previous numbers while a new currency loads, so toggling does not flash a loading state
	const lastModel = useRef<typeof model>(null);
	if (model) lastModel.current = model;
	const shown = model ?? lastModel.current;
	const stale = !model || loading || feesLoading || (usd && !fxReady);

	const selectedQuarter = selected !== null ? shown?.series.find((m) => m.q === selected) : undefined;

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
				<Seg value={token ?? ''} options={currencyOptions} onChange={onToken} />
			</div>

			{error && <Glass className="p-4 text-sm text-rose-600">Could not load the earnings: {error}</Glass>}
			{usd && fxError && (
				<Glass className="p-4 text-sm text-rose-600">Could not load exchange rates, so the combined view is unavailable.</Glass>
			)}
			{feesError && (
				<p className="text-xs text-rose-600">Swap-out fees could not be loaded, so income paid in foreign coins is missing.</p>
			)}
			{!error && !(usd && fxError) && !shown && <Glass className="p-6 text-center text-sm text-text-muted">Loading transfers…</Glass>}

			{!error && !(usd && fxError) && shown && (
				<div className={`space-y-3 transition-opacity ${stale ? 'opacity-60' : ''}`}>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						<StatCard label="Total income" value={<Amount value={shown.total} coin={shown.symbol} />} />
						<StatCard
							label={`This quarter (${quarterLabel(shown.now)})`}
							value={<Amount value={shown.thisQuarter} coin={shown.symbol} />}
						/>
						<StatCard label="Modules" value={shown.modules} />
						<StatCard label="Last transfer" value={shown.lastIn ? dateStr(shown.lastIn) : '–'} />
					</div>

					<QuarterChart
						title="Received per quarter"
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
						selected={selectedQuarter}
						onClear={() => onSelect(null)}
					/>
				</div>
			)}
		</div>
	);
}
