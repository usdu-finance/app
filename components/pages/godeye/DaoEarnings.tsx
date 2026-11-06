import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { useGodEyeBoot, useGodEyeJourney } from '@/hooks/useGodEye';
import { SWAP_BRIDGES, useSwapOutFees } from '@/hooks/useSwapOutFees';
import { EXPLORER } from './godeye.constants';
import { dateStr, fmt, shortAddr } from './godeye.format';
import { TokenLogo } from '@/components/ui/logo';
import { TOKENS } from '@/lib/tokens/config';
import { fetchCowTokenList } from '@/lib/tokens/cow-service';
import GodEyeLoading from './GodEyeLoading';
import { Dot, Glass, SectionTitle, Seg, StatCard } from './GodEyeUi';

// The DAO's curator address: what the governance module will stream into the reward vaults from
const DAO = ADDRESS[mainnet.id].curator.toLowerCase();
const STABLES = ['USDU', 'EURU', 'CHFU'];
// The chart always spans at least two years of quarters, so it keeps its shape while there is little (or nothing) to show
const MIN_QUARTERS = 8;
// Last resort for coins neither the protocol's registry nor the CoW list has a logo for
const LOCAL_LOGOS: Record<string, string> = { EURC: '/coin/eurc.png' };

/** An amount followed by a tiny logo of its token instead of the symbol */
function Amount({ value, coin }: { value: number; coin: string }) {
	// same query as the zap card, so the CoW list is fetched once for the whole app
	const { data: cow } = useQuery({ queryKey: ['cow-token-list'], queryFn: fetchCowTokenList, staleTime: 60 * 60 * 1000 });
	// the protocol's own list wins (the CoW list may carry another token with the same symbol), then CoW, then local files
	const logo =
		TOKENS[coin]?.logoURI ??
		cow?.find((t) => t.chainId === 1 && t.symbol.toLowerCase() === coin.toLowerCase())?.logoURI ??
		LOCAL_LOGOS[coin];
	return (
		<span className="inline-flex items-center gap-1" title={coin}>
			{fmt(value, 2)}
			<TokenLogo currency={coin} logoURI={logo} size={4} />
		</span>
	);
}

// The table lists the biggest earners; modules under the threshold (and anything past the row limit) share one row
const MIN_ROW_INCOME = 0.1;
const MAX_ROWS = 8;
const quarterOf = (t: number) => {
	const d = new Date(t * 1000);
	return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3);
};
const quarterLabel = (q: number) => `${String(Math.floor(q / 4)).slice(2)}Q${(q % 4) + 1}`;
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

/**
 * Funds flowing into the DAO, per month and per source, read from the same indexed transfer history as GodEye.
 * Only incoming transfers are shown: this is the reference for what the DAO has earned and could stream out as rewards.
 */
export default function DaoEarnings() {
	const boot = useGodEyeBoot();
	const [token, setToken] = useState<string | null>(null);
	const [hover, setHover] = useState<string | null>(null);
	// the quarter the table is filtered to, as an index into the series; null shows all time
	const [selected, setSelected] = useState<number | null>(null);

	// default to USDU once the ledgers are ready
	useEffect(() => {
		if (!boot.ready) return;
		setToken((cur) => cur ?? (boot.tokens.find((t) => t.symbol === 'USDU' && t.chainId === 1) ?? boot.tokens[0]).key);
	}, [boot.ready, boot.tokens]);

	const options = useMemo(
		() => boot.tokens.filter((t) => t.chainId === 1 && STABLES.includes(t.symbol)).map((t) => ({ value: t.key, label: t.symbol })),
		[boot.tokens]
	);
	const symbol = boot.tokens.find((t) => t.key === token)?.symbol ?? '';
	// a quarter picked for one currency says nothing about another
	useEffect(() => setSelected(null), [token]);

	const { data: journey, loading, error } = useGodEyeJourney(boot.ready ? token : null, DAO);
	// Swap-out fees reach the DAO in the bridge's backing coin (USDC, EURC, ZCHF, ...), so the stablecoin ledger never sees them
	const { fees, loading: feesLoading, error: feesError } = useSwapOutFees();

	const model = useMemo(() => {
		if (!journey) return null;
		const months = new Map<number, { total: number; byFamily: Map<string, number>; txs: number }>();
		type Peer = (typeof journey.peers)[number] & {
			i: number;
			family: (typeof FAMILIES)[number];
			/** set on rows paid in a bridge's backing coin (USDC, EURC, ...) rather than in the stablecoin */
			coin: string | null;
		};
		type Stat = { peer: Peer; in: number; count: number; last: number };
		const peers: Peer[] = journey.peers.map((p, i) => ({ ...p, i, family: familyOf(p.label), coin: null }));
		// what each module paid, overall (key -1) and per quarter, so the table can be filtered to one quarter
		const stats = new Map<number, Map<Peer, Stat>>();
		let total = 0;
		let lastIn = 0;
		const record = (peer: Peer, t: number, amount: number, count: number) => {
			const quarter = quarterOf(t);
			for (const q of [-1, quarter]) {
				const byPeer = stats.get(q) ?? new Map<Peer, Stat>();
				stats.set(q, byPeer);
				const st = byPeer.get(peer) ?? { peer, in: 0, count: 0, last: 0 };
				st.in += amount;
				st.count += count;
				st.last = Math.max(st.last, t);
				byPeer.set(peer, st);
			}
			const m = months.get(quarter) ?? { total: 0, byFamily: new Map<string, number>(), txs: 0 };
			m.total += amount;
			m.byFamily.set(peer.family.key, (m.byFamily.get(peer.family.key) ?? 0) + amount);
			m.txs += count;
			months.set(quarter, m);
			total += amount;
			lastIn = Math.max(lastIn, t);
		};

		for (const d of journey.days) {
			for (const p of d.peers) {
				const peer = peers[p.i];
				if (p.in > 0 && peer.kind === SOURCE_KIND) record(peer, d.t, p.in, p.count);
			}
		}

		// Each foreign coin counts one-to-one in its stablecoin's currency, but is listed on its own row in the coin it was paid in
		const bridges = SWAP_BRIDGES.filter((b) => b.stable === symbol);
		for (const f of fees) {
			const b = bridges.find((x) => x.module === f.module);
			if (!b || f.amount <= 0) continue;
			let peer = peers.find((p) => p.address.toLowerCase() === b.module && p.coin === b.coin);
			if (!peer) {
				peer = { address: b.module, label: b.label, kind: SOURCE_KIND, i: peers.length, family: familyOf(b.label), coin: b.coin };
				peers.push(peer);
			}
			record(peer, f.t, f.amount, 1);
		}

		/** the table's rows for one quarter (or all time): the biggest earners, with the small ones merged into "Other" */
		const rowsFor = (quarter: number | null) => {
			const sources = [...(stats.get(quarter ?? -1)?.values() ?? [])].sort((a, b) => b.in - a.in);
			const big = sources.filter((s) => s.in >= MIN_ROW_INCOME);
			const small = sources.filter((s) => s.in < MIN_ROW_INCOME);
			// the "other" row takes a slot of its own, so it only exists when something is left over
			const cut = big.length + (small.length ? 1 : 0) <= MAX_ROWS ? big.length : MAX_ROWS - 1;
			const rest = [...big.slice(cut), ...small];
			const toRow = (s: Stat) => ({
				key: `${s.peer.address}-${s.peer.coin ?? ''}`,
				address: s.peer.address as string | null,
				label: s.peer.label ?? shortAddr(s.peer.address),
				family: s.peer.family,
				in: s.in,
				count: s.count,
				last: s.last,
				coin: s.peer.coin,
			});
			const rows = big.slice(0, cut).map(toRow);
			if (rest.length === 1) rows.push(toRow(rest[0]));
			else if (rest.length > 1)
				rows.push({
					key: 'other',
					address: null,
					label: `Other (${rest.length} modules)`,
					family: FAMILIES[FAMILIES.length - 1],
					in: rest.reduce((a, s) => a + s.in, 0),
					count: rest.reduce((a, s) => a + s.count, 0),
					last: Math.max(...rest.map((s) => s.last)),
					coin: null,
				});
			return rows;
		};

		const all = [...(stats.get(-1)?.values() ?? [])];
		// every quarter up to the current one, back to whichever is earlier: the first payout or the minimum span
		const keys = [...months.keys()];
		const now = quarterOf(Date.now() / 1000);
		const first = Math.min(now - (MIN_QUARTERS - 1), ...keys);
		const last = Math.max(now, ...keys);
		const series: { q: number; key: string; total: number; byFamily: Map<string, number>; txs: number }[] = [];
		for (let q = first; q <= last; q++) {
			series.push({ q, key: quarterLabel(q), ...(months.get(q) ?? { total: 0, byFamily: new Map(), txs: 0 }) });
		}
		const families = FAMILIES.filter((f) => all.some((s) => s.peer.family.key === f.key));
		return {
			total,
			thisQuarter: months.get(now)?.total ?? 0,
			now: quarterLabel(now),
			lastIn,
			rowsFor,
			modules: new Set(all.map((s) => s.peer.address)).size,
			series,
			families,
			max: Math.max(...series.map((m) => m.total), 0),
		};
	}, [journey, fees, symbol]);

	if (!boot.ready)
		return (
			<div className="relative min-h-[420px] rounded-lg border border-usdu-surface bg-usdu-bg">
				<GodEyeLoading sync={boot.sync} unreachable={boot.unreachable} />
			</div>
		);

	const active = hover ? model?.series.find((m) => m.key === hover) : undefined;
	const selectedQuarter = selected !== null ? model?.series.find((m) => m.q === selected) : undefined;

	return (
		<div className="relative min-h-[420px] rounded-lg border border-usdu-surface bg-usdu-bg p-4 md:p-6 space-y-4 text-usdu-black">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">DAO earnings</h2>
					<p className="text-xs text-text-muted">
						Revenue that modules and minters paid to the DAO curator{' '}
						<a
							href={`${EXPLORER[1]}/address/${DAO}`}
							target="_blank"
							rel="noreferrer"
							className="underline decoration-dotted hover:text-usdu-black"
						>
							{shortAddr(DAO)}
						</a>
						, in {symbol} or the bridge&apos;s backing coin (counted 1:1).
					</p>
				</div>
				<Seg value={token ?? ''} options={options} onChange={setToken} />
			</div>

			{error && <Glass className="p-4 text-sm text-rose-600">Could not load the earnings: {error}</Glass>}
			{feesError && (
				<p className="text-xs text-rose-600">Swap-out fees could not be loaded, so income paid in foreign coins is missing.</p>
			)}
			{!error && (loading || feesLoading || !model) && (
				<Glass className="p-6 text-center text-sm text-text-muted">Loading transfers…</Glass>
			)}
			{!error && model && model.total === 0 && (
				<Glass className="p-6 text-center text-sm text-text-muted">No module or minter has paid the DAO any {symbol} yet.</Glass>
			)}

			{!error && model && model.total > 0 && (
				<>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						<StatCard label="Total earned" value={<Amount value={model.total} coin={symbol} />} />
						<StatCard label={`This quarter (${model.now})`} value={<Amount value={model.thisQuarter} coin={symbol} />} />
						<StatCard label="Modules" value={model.modules} />
						<StatCard label="Last transfer" value={dateStr(model.lastIn)} />
					</div>

					<Glass className="p-4">
						<SectionTitle
							right={
								active ? (
									<span className="inline-flex items-center gap-1.5">
										{active.key} · <Amount value={active.total} coin={symbol} /> · {active.txs}{' '}
										{active.txs === 1 ? 'tx' : 'txs'}
									</span>
								) : undefined
							}
						>
							Earned per quarter
						</SectionTitle>
						<div className="flex h-48 items-end gap-1" onMouseLeave={() => setHover(null)}>
							{model.series.map((m) => {
								const isSelected = selected === m.q;
								const dimmed = (hover !== null && hover !== m.key) || (selected !== null && !isSelected);
								return (
									// a quarter with income can be clicked to filter the table to it, clicking it again clears the filter
									<button
										type="button"
										key={m.key}
										disabled={m.total <= 0}
										aria-pressed={isSelected}
										aria-label={`${m.key}: ${fmt(m.total, 2)} ${symbol}`}
										onClick={() => setSelected(isSelected ? null : m.q)}
										onMouseEnter={() => setHover(m.key)}
										className={`group flex h-full min-w-0 flex-1 flex-col justify-end rounded-t bg-black/[0.04] transition-shadow enabled:cursor-pointer enabled:hover:bg-black/[0.07] focus-visible:outline-none ${isSelected ? 'bg-black/[0.07]' : ''}`}
										style={
											isSelected
												? { boxShadow: '0 0 0 1px rgba(245,158,11,0.9), 0 0 18px 3px rgba(241,99,37,0.5)' }
												: undefined
										}
									>
										<div
											className={`flex w-full flex-col-reverse overflow-hidden rounded-t transition-opacity ${dimmed ? 'opacity-40' : ''}`}
											style={{ height: `${(m.total / model.max) * 100}%` }}
										>
											{model.families.map((f) => {
												const v = m.byFamily.get(f.key) ?? 0;
												return v > 0 ? (
													<div key={f.key} style={{ height: `${(v / m.total) * 100}%`, background: f.color }} />
												) : null;
											})}
										</div>
									</button>
								);
							})}
						</div>
						<div className="mt-1 flex gap-1 text-[10px] text-text-muted">
							{model.series.map((m, i) => (
								// past a year of bars the labels get tight, so every other one is dropped
								<span key={m.key} className="min-w-0 flex-1 text-center">
									{model.series.length > 12 && (model.series.length - 1 - i) % 2 ? '' : m.key}
								</span>
							))}
						</div>
						<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
							{model.families.map((f) => (
								<span key={f.key} className="inline-flex items-center gap-1.5">
									<Dot color={f.color} size={8} />
									{f.name}
								</span>
							))}
						</div>
					</Glass>

					<Glass className="p-4">
						<SectionTitle
							right={
								selectedQuarter ? (
									<span className="inline-flex items-center gap-2">
										<Amount value={selectedQuarter.total} coin={symbol} />
										<button
											type="button"
											onClick={() => setSelected(null)}
											className="rounded-md border border-black/10 bg-black/5 px-1.5 py-0.5 text-[10px] hover:bg-black/10"
										>
											Show all time ✕
										</button>
									</span>
								) : undefined
							}
						>
							Modules &amp; minters · {selectedQuarter ? selectedQuarter.key : 'all time'}
						</SectionTitle>
						{/* the padding gives the dots' glow room inside the scroll box, the negative margin keeps the table where it was */}
						<div className="-mx-3 overflow-x-auto px-3">
							<table className="w-full text-sm">
								<thead className="text-left text-[10px] uppercase tracking-wider text-text-muted">
									<tr>
										<th className="py-1 pr-3 font-medium">Module</th>
										<th className="py-1 pr-3 text-right font-medium">Received</th>
										<th className="py-1 pr-3 text-right font-medium">Share</th>
										<th className="py-1 pr-3 text-right font-medium">Transfers</th>
										<th className="py-1 text-right font-medium">Last</th>
									</tr>
								</thead>
								<tbody>
									{model.rowsFor(selected).map((s) => {
										const name = (
											<>
												<Dot color={s.family.color} size={8} />
												<span className="font-medium">{s.label}</span>
												<span className="text-xs text-text-muted">
													{s.address ? s.family.name : 'Smaller modules'}
												</span>
											</>
										);
										return (
											<tr key={s.key} className="border-t border-black/5">
												<td className="py-1.5 pr-3">
													{s.address ? (
														<a
															href={`${EXPLORER[1]}/address/${s.address}`}
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
													<Amount value={s.in} coin={s.coin ?? symbol} />
												</td>
												<td className="py-1.5 pr-3 text-right tabular-nums">
													{((s.in / (selectedQuarter?.total ?? model.total)) * 100).toFixed(1)}%
												</td>
												<td className="py-1.5 pr-3 text-right tabular-nums">{s.count}</td>
												<td className="py-1.5 text-right tabular-nums text-text-muted">{dateStr(s.last)}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</Glass>
				</>
			)}
		</div>
	);
}
