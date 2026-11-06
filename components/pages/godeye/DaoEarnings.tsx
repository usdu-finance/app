import { useEffect, useMemo, useState } from 'react';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { useGodEyeBoot, useGodEyeJourney } from '@/hooks/useGodEye';
import { EXPLORER } from './godeye.constants';
import { dateStr, fmt, shortAddr } from './godeye.format';
import GodEyeLoading from './GodEyeLoading';
import { Dot, Glass, SectionTitle, Seg, StatCard } from './GodEyeUi';

// The DAO's curator address: what the governance module will stream into the reward vaults from
const DAO = ADDRESS[mainnet.id].curator.toLowerCase();
const STABLES = ['USDU', 'EURU', 'CHFU'];
const DAY = 86400;
// The chart always spans at least two years of quarters, so it keeps its shape while there is little (or nothing) to show
const MIN_QUARTERS = 8;
const quarterOf = (t: number) => {
	const d = new Date(t * 1000);
	return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3);
};
const quarterLabel = (q: number) => `${String(Math.floor(q / 4)).slice(2)}Q${(q % 4) + 1}`;
// Only modules and minters count: pools and vaults that pay the DAO are pass-throughs for a strategy's own position
const SOURCE_KIND = 'minter';

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

	const { data: journey, loading, error } = useGodEyeJourney(boot.ready ? token : null, DAO);

	const model = useMemo(() => {
		if (!journey) return null;
		const months = new Map<number, { total: number; byFamily: Map<string, number>; txs: number }>();
		const peers = journey.peers.map((p, i) => ({ ...p, i, family: familyOf(p.label), in: 0, count: 0, last: 0 }));
		let total = 0;
		let last30 = 0;
		let lastIn = 0;
		const since = Date.now() / 1000 - 30 * DAY;
		for (const d of journey.days) {
			const key = quarterOf(d.t);
			const m = months.get(key) ?? { total: 0, byFamily: new Map<string, number>(), txs: 0 };
			let day = 0;
			for (const p of d.peers) {
				const peer = peers[p.i];
				if (p.in <= 0 || peer.kind !== SOURCE_KIND) continue;
				peer.in += p.in;
				peer.count += p.count;
				peer.last = Math.max(peer.last, d.t);
				m.byFamily.set(peer.family.key, (m.byFamily.get(peer.family.key) ?? 0) + p.in);
				m.txs += p.count;
				day += p.in;
			}
			if (day <= 0) continue;
			m.total += day;
			months.set(key, m);
			total += day;
			if (d.t >= since) last30 += day;
			lastIn = Math.max(lastIn, d.t);
		}
		const sources = peers.filter((p) => p.in > 0).sort((a, b) => b.in - a.in);
		// every quarter up to the current one, back to whichever is earlier: the first payout or the minimum span
		const keys = [...months.keys()];
		const now = quarterOf(Date.now() / 1000);
		const first = Math.min(now - (MIN_QUARTERS - 1), ...keys);
		const last = Math.max(now, ...keys);
		const series: { key: string; total: number; byFamily: Map<string, number>; txs: number }[] = [];
		for (let q = first; q <= last; q++) {
			series.push({ key: quarterLabel(q), ...(months.get(q) ?? { total: 0, byFamily: new Map(), txs: 0 }) });
		}
		const families = FAMILIES.filter((f) => sources.some((p) => p.family.key === f.key));
		return { total, last30, lastIn, sources, series, families, max: Math.max(...series.map((m) => m.total), 0) };
	}, [journey]);

	if (!boot.ready)
		return (
			<div className="relative min-h-[420px] rounded-lg border border-usdu-surface bg-usdu-bg">
				<GodEyeLoading sync={boot.sync} unreachable={boot.unreachable} />
			</div>
		);

	const active = hover ? model?.series.find((m) => m.key === hover) : undefined;

	return (
		<div className="relative min-h-[420px] rounded-lg border border-usdu-surface bg-usdu-bg p-4 md:p-6 space-y-4 text-usdu-black">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">DAO earnings</h2>
					<p className="text-xs text-text-muted">
						{symbol} paid to the DAO curator{' '}
						<a
							href={`${EXPLORER[1]}/address/${DAO}`}
							target="_blank"
							rel="noreferrer"
							className="underline decoration-dotted hover:text-usdu-black"
						>
							{shortAddr(DAO)}
						</a>
						by modules and minters. Pools and vaults are left out: they only pass on what a module&apos;s own position earned.
					</p>
				</div>
				<Seg value={token ?? ''} options={options} onChange={setToken} />
			</div>

			{error && <Glass className="p-4 text-sm text-rose-600">Could not load the earnings: {error}</Glass>}
			{!error && (loading || !model) && <Glass className="p-6 text-center text-sm text-text-muted">Loading transfers…</Glass>}
			{!error && model && model.total === 0 && (
				<Glass className="p-6 text-center text-sm text-text-muted">No module or minter has paid the DAO any {symbol} yet.</Glass>
			)}

			{!error && model && model.total > 0 && (
				<>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						<StatCard label="Total earned" value={`${fmt(model.total, 2)} ${symbol}`} />
						<StatCard label="Last 30 days" value={`${fmt(model.last30, 2)} ${symbol}`} />
						<StatCard label="Modules" value={model.sources.length} />
						<StatCard label="Last transfer" value={dateStr(model.lastIn)} />
					</div>

					<Glass className="p-4">
						<SectionTitle
							right={
								active
									? `${active.key} · ${fmt(active.total, 2)} ${symbol} · ${active.txs} ${active.txs === 1 ? 'tx' : 'txs'}`
									: undefined
							}
						>
							Earned per quarter
						</SectionTitle>
						<div className="flex h-48 items-end gap-1" onMouseLeave={() => setHover(null)}>
							{model.series.map((m) => (
								<div
									key={m.key}
									className="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-t bg-black/[0.04]"
									onMouseEnter={() => setHover(m.key)}
								>
									<div
										className={`flex flex-col-reverse overflow-hidden rounded-t transition-opacity ${hover && hover !== m.key ? 'opacity-40' : ''}`}
										style={{ height: `${(m.total / model.max) * 100}%` }}
									>
										{model.families.map((f) => {
											const v = m.byFamily.get(f.key) ?? 0;
											return v > 0 ? <div key={f.key} style={{ height: `${(v / m.total) * 100}%`, background: f.color }} /> : null;
										})}
									</div>
								</div>
							))}
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
						<SectionTitle>Modules &amp; minters</SectionTitle>
						<div className="overflow-x-auto">
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
									{model.sources.slice(0, 25).map((s) => (
										<tr key={s.address} className="border-t border-black/5">
											<td className="py-1.5 pr-3">
												<a
													href={`${EXPLORER[1]}/address/${s.address}`}
													target="_blank"
													rel="noreferrer"
													className="inline-flex items-center gap-2 hover:underline"
												>
													<Dot color={s.family.color} size={8} />
													<span className="font-medium">{s.label ?? shortAddr(s.address)}</span>
													<span className="text-xs text-text-muted">{s.family.name}</span>
												</a>
											</td>
											<td className="py-1.5 pr-3 text-right tabular-nums">
												{fmt(s.in, 2)} {symbol}
											</td>
											<td className="py-1.5 pr-3 text-right tabular-nums">{((s.in / model.total) * 100).toFixed(1)}%</td>
											<td className="py-1.5 pr-3 text-right tabular-nums">{s.count}</td>
											<td className="py-1.5 text-right tabular-nums text-text-muted">{dateStr(s.last)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{model.sources.length > 25 && (
							<p className="mt-2 text-xs text-text-muted">Top 25 of {model.sources.length} modules.</p>
						)}
					</Glass>
				</>
			)}
		</div>
	);
}
