import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGodEyeBoot, useGodEyeJourney } from '@/hooks/useGodEye';
import { EXPLORER, KIND_META } from './godeye.constants';
import { GodEyeKind } from './godeye.types';
import { dateStr, fmt, pct, shortAddr } from './godeye.format';
import { buildModel, insights, stateAt } from './godeye.journey';
import GodEyeJourneyCanvas, { JourneyCanvasHandle } from './GodEyeJourneyCanvas';
import GodEyeLoading from './GodEyeLoading';
import GodEyeTimeline from './GodEyeTimeline';
import { NodesSlider } from './GodEyeToolbar';
import { DETAIL_PANEL, GodEyeBrand, MobileDetailBar, useIsWide, usePanelGaps } from './GodEyeLayout';
import { Dot, Glass, IconButton, SectionTitle, SELECT, StatCard } from './GodEyeUi';

const NEAR_LIVE = 86400;
const LABELS = { supply: 'Balance', holders: 'Counterparties', volume: 'Volume' };

type Props = {
	address: string;
	/** ledger key; defaults to USDU on mainnet */
	token: string | null;
	onBack: () => void;
	/** drill into a counterparty's own timeline */
	onOpenAddress: (address: string, token: string) => void;
};

export default function GodEyeJourneyView({ address: addr, token: initialToken, onBack, onOpenAddress }: Props) {
	const boot = useGodEyeBoot();
	const wide = useIsWide();
	const [leftOpen, setLeftOpen] = useState(true);
	// on phones the details start as a compact bar, a tap opens the full sheet
	const [sheet, setSheet] = useState(false);
	const canvas = useRef<JourneyCanvasHandle>(null);

	const address = addr.toLowerCase();
	const [token, setToken] = useState<string | null>(null);
	const [at, setAt] = useState<number | null>(null);
	const [selected, setSelected] = useState<number | null>(null);
	const [playing, setPlaying] = useState(false);
	const [rate, setRate] = useState(2592000);
	const [fitKey, setFitKey] = useState(0);
	const [hashRead, setHashRead] = useState(false);
	const [top, setTop] = useState(50);
	const [hidden, setHidden] = useState<Set<GodEyeKind>>(new Set());
	const toggleKind = (k: GodEyeKind) =>
		setHidden((h) => {
			const n = new Set(h);
			if (n.has(k)) n.delete(k);
			else n.add(k);
			return n;
		});

	// token comes from the link, otherwise default to USDU once the ledger is ready
	useEffect(() => {
		if (!boot.ready) return;
		const q = initialToken;
		const t =
			q && boot.tokens.some((x) => x.key === q)
				? q
				: (boot.tokens.find((x) => x.symbol === 'USDU' && x.chainId === 1) ?? boot.tokens[0]).key;
		setToken((cur) => cur ?? t);
	}, [initialToken, boot.ready, boot.tokens]);

	const { data: journey, loading, error } = useGodEyeJourney(boot.ready ? token : null, address);
	const model = useMemo(() => (journey ? buildModel(journey) : null), [journey]);

	// cursor + selection from the hash, once the data is there
	useEffect(() => {
		if (!model || hashRead) return;
		const p = new URLSearchParams(window.location.hash.slice(1));
		if (p.get('at')) setAt(Number(p.get('at')));
		if (p.get('sel')) {
			const i = model.journey.peers.findIndex((x) => x.address === p.get('sel'));
			if (i >= 0) setSelected(i);
		}
		setHashRead(true);
	}, [model, hashRead]);
	useEffect(() => {
		if (!model || !hashRead) return;
		const t = setTimeout(() => {
			const p = new URLSearchParams();
			p.set('view', 'journey');
			p.set('addr', address);
			if (token) p.set('token', token);
			if (at) p.set('at', String(at));
			if (selected !== null) p.set('sel', model.journey.peers[selected].address);
			try {
				window.history.replaceState(null, '', window.location.pathname + window.location.search + '#' + p.toString());
			} catch {
				/* ignore */
			}
		}, 400);
		return () => clearTimeout(t);
	}, [model, hashRead, at, selected, address, token]);

	const t0 = model?.t0 ?? 0;
	const t1 = model?.t1 ?? 0;
	const cur = at ?? t1;

	// ---- time travel (same feel as the map: scrub, play, live)
	const scrub = useCallback(
		(t: number) => {
			setPlaying(false);
			setAt(t >= t1 - NEAR_LIVE ? null : Math.floor(t));
		},
		[t1]
	);
	const togglePlay = useCallback(() => {
		setPlaying((p) => {
			if (!p && (!at || at >= t1 - NEAR_LIVE)) setAt(t0);
			return !p;
		});
	}, [at, t0, t1]);
	useEffect(() => {
		if (!playing) return;
		const i = setInterval(() => {
			setAt((c) => {
				const next = (c ?? t1) + rate * 0.1;
				if (next >= t1) {
					setPlaying(false);
					return null;
				}
				return Math.floor(next);
			});
		}, 100);
		return () => clearInterval(i);
	}, [playing, rate, t1]);

	const state = useMemo(() => (model ? stateAt(model, cur) : null), [model, cur]);
	const now = useMemo(() => new Map((state?.peers ?? []).map((p) => [p.i, p])), [state]);
	const kinds = useMemo(() => {
		const v = new Map<GodEyeKind, number>();
		for (const p of model?.totals ?? []) v.set(p.kind, (v.get(p.kind) ?? 0) + p.in + p.out);
		return [...v.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
	}, [model]);
	const facts = useMemo(() => (model ? insights(model, fmt, dateStr) : []), [model]);

	useEffect(() => {
		const key = (e: KeyboardEvent) => {
			if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
			if (e.code === 'Space') {
				e.preventDefault();
				togglePlay();
			} else if (e.key === 'f' || e.key === 'F') canvas.current?.fit();
			else if (e.key === 'Escape') setSelected(null);
			else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') scrub(cur + (e.key === 'ArrowRight' ? 1 : -1) * 86400 * 7);
		};
		window.addEventListener('keydown', key);
		return () => window.removeEventListener('keydown', key);
	}, [togglePlay, scrub, cur]);

	useEffect(() => setSheet(false), [selected]);
	const ready = boot.ready && !!model && !!state;
	const { barEl, timelineEl, gaps, panelVars } = usePanelGaps(`${boot.ready}:${token}:${ready}`);
	const insets = useMemo(
		() => ({ left: wide && leftOpen ? 304 : 0, right: wide ? 364 : 0, top: gaps.top + 6, bottom: gaps.bottom + 2 }),
		[wide, leftOpen, gaps]
	);
	const scan = journey ? EXPLORER[journey.token.chainId] || EXPLORER[1] : EXPLORER[1];
	const kcol = journey ? KIND_META[journey.kind].color : KIND_META.wallet.color;
	const sel = model && selected !== null ? model.journey.peers[selected] : null;
	const selStat = selected !== null ? now.get(selected) : undefined;

	// the activity feed: newest first up to the cursor, optionally for one counterparty
	const feed = useMemo(() => {
		if (!model || !state) return [];
		const rows: { t: number; in: number; out: number; txs: number; who: string; extra: number; balance: number }[] = [];
		for (let k = state.day; k >= 0 && rows.length < 40; k--) {
			const d = model.journey.days[k];
			const mine = selected !== null ? d.peers.find((p) => p.i === selected) : d.peers[0];
			if (!mine) continue;
			const p = model.journey.peers[mine.i];
			rows.push({
				t: d.t,
				in: selected !== null ? mine.in : d.in,
				out: selected !== null ? mine.out : d.out,
				txs: selected !== null ? mine.count : d.txs,
				who: p.label || shortAddr(p.address),
				extra: d.peers.length - 1,
				balance: d.balance,
			});
		}
		return rows;
	}, [model, state, selected]);

	const kindTotal = state ? [...state.byKind.entries()].reduce((a, [k, v]) => (hidden.has(k) ? a : a + v), 0) : 0;
	const visiblePeers = state ? state.peers.filter((p) => !hidden.has(p.kind)) : [];

	return (
		<div className="absolute inset-0 overflow-hidden bg-usdu-bg">
			{model && (
				<GodEyeJourneyCanvas
					ref={canvas}
					model={model}
					cur={cur}
					selected={selected}
					hidden={hidden}
					limit={top}
					now={now}
					insets={insets}
					fitKey={fitKey}
					onSelect={setSelected}
				/>
			)}

			{!ready && !error && <GodEyeLoading sync={boot.sync} unreachable={boot.unreachable} />}
			{boot.ready && error && (
				<div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
					<Glass className="px-5 py-4 text-center text-sm">
						<div className="font-semibold">No timeline for this address</div>
						<div className="mt-1 text-xs text-rose-600">{error}</div>
						<div className="mt-3">
							<button onClick={onBack} className="text-xs text-usdu-orange">
								← back to GodEye
							</button>
						</div>
					</Glass>
				</div>
			)}

			{/* one card: brand, way back, ledger and who we are looking at */}
			{boot.ready && token && (
				<div ref={barEl} className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex [&>*]:pointer-events-auto">
					<Glass className="flex w-full flex-wrap items-center gap-x-2.5 gap-y-2 px-3 py-2.5 md:w-auto md:max-w-full md:flex-nowrap">
						<GodEyeBrand subtitle="Account timeline" />
						<div className="mx-1 hidden h-6 w-px bg-black/10 md:block" />
						<button
							onClick={onBack}
							title="Back to the map"
							className="ml-auto whitespace-nowrap rounded-lg border border-black/10 bg-black/5 px-2.5 py-1 text-xs text-text-secondary hover:bg-white md:ml-0"
						>
							← Map
						</button>
						<div className="flex w-full items-center gap-2 md:w-auto">
							<select
								className={`${SELECT} min-w-0 flex-1 md:flex-none`}
								value={token}
								title="Token ledger"
								onChange={(e) => {
									setToken(e.target.value);
									setSelected(null);
									setAt(null);
									setPlaying(false);
									setHashRead(false);
								}}
							>
								{boot.tokens.map((t) => (
									<option key={t.key} value={t.key}>
										{t.symbol} ({t.transfers.toLocaleString()})
									</option>
								))}
							</select>
						</div>
						<div className="mx-1 hidden h-6 w-px bg-black/10 md:block" />
						<div className="flex w-full min-w-0 items-center gap-2 md:w-auto">
							<Dot color={kcol} />
							<span className="truncate text-sm font-semibold">{journey?.label || (address ? shortAddr(address) : '…')}</span>
							{journey && (
								<span
									className="shrink-0 rounded-full border px-2 py-px text-[10px]"
									style={{ color: kcol, borderColor: kcol }}
								>
									{KIND_META[journey.kind].name}
								</span>
							)}
							<span className="hidden font-mono text-[11px] text-text-muted lg:inline">{address}</span>
							{address && (
								<a
									className="ml-auto whitespace-nowrap text-xs text-text-secondary hover:text-usdu-black md:hidden"
									href={`${scan}/address/${address}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									Explorer ↗
								</a>
							)}
						</div>
					</Glass>
				</div>
			)}

			{ready && model && state && journey && (
				<>
					{wide && (
						<div
							style={panelVars}
							className={`absolute bottom-[var(--gb)] left-3 top-[var(--gt)] z-10 w-[292px] transition-transform duration-200 ${leftOpen ? '' : '-translate-x-[310px]'}`}
						>
							<Glass className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-3 [scrollbar-width:thin]">
								<div>
									<SectionTitle
										right={
											<button
												className="px-1 text-base leading-none text-text-muted hover:text-usdu-black"
												onClick={() => setLeftOpen(false)}
												title="Collapse"
											>
												‹
											</button>
										}
									>
										Insights
									</SectionTitle>
									<div className="grid grid-cols-2 gap-2">
										{facts.map((f) => (
											<StatCard
												key={f.title}
												label={f.title}
												value={f.value}
												sub={f.sub && <span className="block truncate">{f.sub}</span>}
											/>
										))}
									</div>
								</div>

								<div>
									<SectionTitle right={hidden.size ? `${hidden.size} hidden` : `${state.peers.length} met`}>
										Counterparties by category
									</SectionTitle>
									<div className="mb-2 flex h-2 overflow-hidden rounded-full bg-black/5">
										{[...state.byKind.entries()]
											.filter(([k]) => !hidden.has(k))
											.sort((a, b) => b[1] - a[1])
											.map(([k, v]) => (
												<div
													key={k}
													title={KIND_META[k].name}
													style={{ width: `${(v / (kindTotal || 1)) * 100}%`, background: KIND_META[k].color }}
													className="transition-all duration-300"
												/>
											))}
									</div>
									{kinds.map((k) => {
										const off = hidden.has(k);
										const v = state.byKind.get(k) ?? 0;
										return (
											<div
												key={k}
												onClick={() => {
													toggleKind(k);
													if (selected !== null && model.journey.peers[selected].kind === k) setSelected(null);
												}}
												title={off ? 'Click to show' : 'Click to hide'}
												className={`grid cursor-pointer grid-cols-[12px_1fr_auto] items-center gap-2 rounded-lg px-1.5 py-1 text-[13px] hover:bg-black/5 ${off ? 'opacity-35' : ''}`}
											>
												<Dot color={KIND_META[k].color} size={8} />
												<span>{KIND_META[k].name}</span>
												<span className="text-[11px] tabular-nums text-text-muted">
													{v > 0 && !off ? pct(v / (kindTotal || 1), 0) : off ? 'hidden' : '–'}
												</span>
											</div>
										);
									})}
								</div>

								<div>
									<SectionTitle right={dateStr(cur)}>Biggest counterparties so far</SectionTitle>
									{visiblePeers.length === 0 && <div className="text-xs text-text-muted">Nothing happened yet.</div>}
									{visiblePeers.slice(0, 12).map((p) => (
										<div
											key={p.i}
											onClick={() => setSelected(p.i === selected ? null : p.i)}
											className={`grid cursor-pointer grid-cols-[10px_1fr_auto] items-center gap-2 rounded-lg px-1 py-1 text-[13px] hover:bg-black/10 ${p.i === selected ? 'bg-black/10' : ''}`}
										>
											<Dot color={KIND_META[p.kind].color} size={8} />
											<span className="truncate">{p.label || shortAddr(p.address)}</span>
											<span className="text-[11px] tabular-nums">
												<span className="text-green-600">{fmt(p.in)}</span>{' '}
												<span className="text-rose-600">{fmt(p.out)}</span>
											</span>
										</div>
									))}
								</div>
							</Glass>
						</div>
					)}

					{wide && !leftOpen && (
						<div style={panelVars} className="absolute left-3 top-[var(--gt)] z-10">
							<IconButton onClick={() => setLeftOpen(true)}>› Insights</IconButton>
						</div>
					)}

					{!wide && !sheet && (
						<MobileDetailBar
							style={panelVars}
							color={sel ? KIND_META[sel.kind].color : kcol}
							title={sel ? sel.label || shortAddr(sel.address) : journey.label || shortAddr(journey.address)}
							sub={
								sel
									? selStat
										? `← ${fmt(selStat.in)} · → ${fmt(selStat.out)} · ${selStat.count} transfers`
										: 'not met yet at this date'
									: `${fmt(state.balance)} ${journey.token.symbol} · ${state.txs.toLocaleString()} transfers`
							}
							onOpen={() => setSheet(true)}
							onClose={sel ? () => setSelected(null) : undefined}
						/>
					)}

					{(wide || sheet) && (
						<div style={panelVars} className={DETAIL_PANEL}>
							<Glass className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-3.5 [scrollbar-width:thin]">
								{!wide && (
									<button className="-mb-2 self-end px-1 text-xs text-text-muted" onClick={() => setSheet(false)}>
										Close ▼
									</button>
								)}
								<div className="grid grid-cols-2 gap-2">
									<StatCard
										label="Balance"
										value={fmt(state.balance)}
										sub={`${journey.token.symbol} on ${dateStr(cur)}`}
									/>
									<StatCard label="Transfers" value={state.txs.toLocaleString()} sub="since the first one" />
									<StatCard label="Received" value={fmt(state.inflow)} valueClass="text-green-600" />
									<StatCard
										label="Sent"
										value={fmt(state.outflow)}
										valueClass="text-rose-600"
										sub={`net ${fmt(state.inflow - state.outflow)}`}
									/>
								</div>

								{sel && (
									<div className="rounded-xl border border-usdu-orange/30 bg-usdu-orange/[0.06] p-2.5">
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<div className="flex items-center gap-2 text-sm font-semibold">
													<Dot color={KIND_META[sel.kind].color} size={8} />
													<span className="truncate">{sel.label || shortAddr(sel.address)}</span>
												</div>
												<div className="break-all font-mono text-[10px] text-text-muted">{sel.address}</div>
											</div>
											<button
												className="px-1 text-lg leading-none text-text-muted hover:text-usdu-black"
												onClick={() => setSelected(null)}
											>
												×
											</button>
										</div>
										<div className="mt-1.5 text-[12px] tabular-nums text-text-secondary">
											{selStat ? (
												<>
													<span className="text-green-600">← {fmt(selStat.in)}</span> ·{' '}
													<span className="text-rose-600">→ {fmt(selStat.out)}</span> · {selStat.count} transfers
													<div className="text-[10px] text-text-muted">
														{dateStr(selStat.first)} → {dateStr(selStat.last)}
													</div>
												</>
											) : (
												<span className="text-text-muted">not met yet at this date</span>
											)}
										</div>
										<div className="mt-2 flex gap-1.5">
											<button
												onClick={() => onOpenAddress(sel.address, journey.token.key)}
												className="rounded-lg border border-usdu-orange/50 bg-usdu-orange/15 px-2.5 py-1 text-xs text-usdu-black hover:bg-usdu-orange/25"
											>
												◈ Open timeline
											</button>
											<a
												className="rounded-lg border border-black/10 bg-black/5 px-2.5 py-1 text-xs text-text-secondary hover:bg-black/10"
												href={`${scan}/address/${sel.address}`}
												target="_blank"
												rel="noopener noreferrer"
											>
												Explorer ↗
											</a>
										</div>
									</div>
								)}

								<div>
									<SectionTitle right={sel ? 'with this counterparty' : 'newest first'}>
										Activity up to {dateStr(cur)}
									</SectionTitle>
									{feed.length === 0 && <div className="text-xs text-text-muted">No activity before this date.</div>}
									{feed.map((r) => (
										<div key={r.t} className="grid grid-cols-[1fr_auto] gap-2 border-b border-black/5 py-1 text-[11px]">
											<span>
												{r.in > 0 && <span className="text-green-600">← {fmt(r.in)} </span>}
												{r.out > 0 && <span className="text-rose-600">→ {fmt(r.out)} </span>}
												<span className="text-text-muted">
													{r.who}
													{!sel && r.extra > 0 ? ` +${r.extra}` : ''} · {r.txs}×
												</span>
											</span>
											<span className="text-right">
												{dateStr(r.t)}
												<br />
												<span className="text-text-muted">bal {fmt(r.balance)}</span>
											</span>
										</div>
									))}
								</div>
							</Glass>
						</div>
					)}
				</>
			)}

			{ready && model && (
				<div ref={timelineEl} className="absolute bottom-3 left-3 right-3 z-10">
					<GodEyeTimeline
						timeline={model.series}
						at={at}
						playing={playing}
						rate={rate}
						title="Account timeline"
						labels={LABELS}
						info={`${model.journey.days.length.toLocaleString()} active days · ${(state?.peers.length ?? 0).toLocaleString()} of ${model.journey.peers.length.toLocaleString()} counterparties`}
						controls={
							<div className="hidden flex-wrap items-center gap-2 md:flex">
								<NodesSlider value={top} min={10} onChange={setTop} />
								<IconButton
									onClick={() => {
										canvas.current?.fit();
										setFitKey((k) => k + 1);
									}}
									title="Fit view (F)"
								>
									Fit
								</IconButton>
								{address && (
									<a
										className="rounded-lg border border-black/10 bg-black/5 px-2.5 py-1 text-xs text-text-secondary hover:bg-white"
										href={`${scan}/address/${address}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										Explorer ↗
									</a>
								)}
							</div>
						}
						hoverText={(p, t) => `${dateStr(t)} · balance ${fmt(p.supply)} · ${p.holders} counterparties`}
						onScrub={scrub}
						onPlay={togglePlay}
						onRate={setRate}
						onLive={() => {
							setPlaying(false);
							setAt(null);
						}}
					/>
				</div>
			)}
			{loading && !model && <div className="sr-only">loading</div>}
		</div>
	);
}
