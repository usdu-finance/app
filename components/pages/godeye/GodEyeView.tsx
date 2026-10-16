import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GodEyeQuery, useGodEyeBoot, useGodEyeScene, useGodEyeTimeline } from '@/hooks/useGodEye';
import { KIND_META, KIND_ORDER } from './godeye.constants';
import { GodEyeKind, GodEyeMode, GodEyeRank } from './godeye.types';
import GodEyeIntro from './GodEyeIntro';
import GodEyeDetail from './GodEyeDetail';
import GodEyeLoading from './GodEyeLoading';
import GodEyeMap, { GodEyeMapHandle } from './GodEyeMap';
import GodEyeOverview from './GodEyeOverview';
import GodEyeTimeline from './GodEyeTimeline';
import GodEyeToolbar, { GodEyeControls } from './GodEyeToolbar';
import { Dot, GLASS, Glass, IconButton } from './GodEyeUi';
import { fmt, shortAddr } from './godeye.format';

const NEAR_LIVE = 3600;

function useIsWide() {
	const [wide, setWide] = useState(true);
	useEffect(() => {
		const mq = window.matchMedia('(min-width: 768px)');
		const on = () => setWide(mq.matches);
		on();
		mq.addEventListener('change', on);
		return () => mq.removeEventListener('change', on);
	}, []);
	return wide;
}

export default function GodEyeView() {
	const boot = useGodEyeBoot();
	const map = useRef<GodEyeMapHandle>(null);
	// the side panels sit between the toolbar and the timeline with the same 12px gap on both sides
	const barEl = useRef<HTMLDivElement | null>(null);
	const timelineEl = useRef<HTMLDivElement>(null);
	const [gaps, setGaps] = useState({ top: 64, bottom: 148 });
	const panelVars = { '--gt': `${gaps.top}px`, '--gb': `${gaps.bottom}px` } as CSSProperties;
	const wide = useIsWide();

	// ---- view state (mirrored into the url hash so views can be shared)

	const [init, setInit] = useState(false);
	const [token, setToken] = useState<string | null>(null);
	const [at, setAt] = useState<number | null>(null);
	const [windowS, setWindowS] = useState(0);
	const [top, setTop] = useState(30);
	const [rank, setRank] = useState<GodEyeRank>('balance');
	const [mode, setMode] = useState<GodEyeMode>('entities');
	const [focus, setFocus] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(null);
	const [hidden, setHidden] = useState<Set<GodEyeKind>>(new Set());
	const [three, setThree] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [rate, setRate] = useState(604800);
	const [leftOpen, setLeftOpen] = useState(true);
	const [fitKey, setFitKey] = useState(0);
	const [refresh, setRefresh] = useState(0);

	// read the hash once
	useEffect(() => {
		const p = new URLSearchParams(window.location.hash.slice(1));
		if (p.get('token')) setToken(p.get('token'));
		if (p.get('at')) setAt(Number(p.get('at')));
		if (p.get('window')) setWindowS(Number(p.get('window')));
		if (p.get('mode') === 'categories') setMode('categories');
		if (p.get('focus')) setFocus(p.get('focus'));
		if (p.get('sel')) setSelected(p.get('sel'));
		if (p.get('3d')) setThree(true);
		setInit(true);
	}, []);

	// default token once the ledger is ready
	useEffect(() => {
		if (!boot.ready) return;
		if (!token || !boot.tokens.some((t) => t.key === token)) {
			const usdu = boot.tokens.find((t) => t.symbol === 'USDU' && t.chainId === 1) ?? boot.tokens[0];
			setToken(usdu.key);
		}
	}, [boot.ready, boot.tokens, token]);

	// write the hash
	useEffect(() => {
		if (!init || !token) return;
		const t = setTimeout(() => {
			const p = new URLSearchParams();
			p.set('token', token);
			if (at) p.set('at', String(at));
			if (windowS) p.set('window', String(windowS));
			if (mode !== 'entities') p.set('mode', mode);
			if (focus) p.set('focus', focus);
			if (selected && selected !== focus) p.set('sel', selected);
			if (three) p.set('3d', '1');
			try {
				window.history.replaceState(null, '', '#' + p.toString());
			} catch {
				/* ignore */
			}
		}, 400);
		return () => clearTimeout(t);
	}, [init, token, at, windowS, mode, focus, selected, three]);

	// ---- data
	useEffect(() => {
		const measure = () => {
			const top = barEl.current ? barEl.current.offsetTop + barEl.current.offsetHeight + 12 : 64;
			const bottom = timelineEl.current ? timelineEl.current.offsetHeight + 24 : 148;
			setGaps((g) => (g.top === top && g.bottom === bottom ? g : { top, bottom }));
		};
		const ro = new ResizeObserver(measure);
		if (barEl.current) ro.observe(barEl.current);
		if (timelineEl.current) ro.observe(timelineEl.current);
		measure();
		return () => ro.disconnect();
		// the bar and the timeline mount once the ledgers are known
	}, [boot.ready, token]);

	const timeline = useGodEyeTimeline(boot.ready ? token : null);
	const t0 = timeline.length ? timeline[0].t : 0;
	const t1 = timeline.length ? timeline[timeline.length - 1].t : 0;

	const query: GodEyeQuery | null = useMemo(
		() => (boot.ready && init && token ? { token, at, window: windowS, top, rank, mode, focus } : null),
		[boot.ready, init, token, at, windowS, top, rank, mode, focus]
	);
	const { scene, error } = useGodEyeScene(query, refresh);
	const graph = scene?.graph ?? null;

	// keep the head of the chain fresh while looking at "live"
	useEffect(() => {
		if (at || playing || !boot.ready) return;
		const i = setInterval(() => setRefresh((r) => r + 1), 60000);
		return () => clearInterval(i);
	}, [at, playing, boot.ready]);

	// ---- time travel
	const scrub = useCallback(
		(t: number) => {
			setPlaying(false);
			setAt(t >= t1 - NEAR_LIVE ? null : Math.floor(t));
		},
		[t1]
	);
	const togglePlay = useCallback(() => {
		setPlaying((p) => {
			if (!p && (!at || at >= t1 - NEAR_LIVE)) setAt(t0 + 86400 * 2);
			return !p;
		});
	}, [at, t0, t1]);
	useEffect(() => {
		if (!playing) return;
		const i = setInterval(() => {
			setAt((cur) => {
				const next = (cur ?? t1) + rate * 0.1;
				if (next >= t1) {
					setPlaying(false);
					return null;
				}
				return Math.floor(next);
			});
		}, 100);
		return () => clearInterval(i);
	}, [playing, rate, t1]);

	// ---- actions
	const resetContext = useCallback(() => {
		map.current?.reset();
		setFitKey((k) => k + 1);
	}, []);

	const onToken = (k: string) => {
		setToken(k);
		setFocus(null);
		setSelected(null);
		setHidden(new Set());
		resetContext();
	};
	const onMode = (m: GodEyeMode) => {
		setMode(m);
		setFocus(null);
		setHidden(new Set());
		if (m === 'categories') setSelected(null);
		resetContext();
	};
	const doFocus = useCallback(
		(address: string) => {
			setFocus(address);
			setMode('entities');
			setHidden(new Set());
			setSelected(address);
			resetContext();
		},
		[resetContext]
	);
	const exitFocus = () => {
		setFocus(null);
		resetContext();
	};
	const jump = (address: string) => {
		if (map.current?.has(address)) {
			setSelected(address);
			map.current.flyTo(address);
		} else doFocus(address);
	};
	const dive = (kind: GodEyeKind) => {
		setMode('entities');
		setFocus(null);
		setHidden(new Set(KIND_ORDER.filter((k) => k !== kind && k !== 'mint' && k !== 'others')));
		resetContext();
	};
	const toggleKind = (k: GodEyeKind) =>
		setHidden((h) => {
			const n = new Set(h);
			if (n.has(k)) n.delete(k);
			else n.add(k);
			return n;
		});
	const onSelect = useCallback((id: string | null) => setSelected(id), []);

	// ---- keyboard
	useEffect(() => {
		const key = (e: KeyboardEvent) => {
			if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
			if (e.code === 'Space') {
				e.preventDefault();
				togglePlay();
			} else if (e.key === 'f' || e.key === 'F') map.current?.fit();
			else if (e.key === '3') setThree((t) => !t);
			else if (e.key === 'Escape') {
				if (selected) setSelected(null);
				else if (focus) exitFocus();
			}
		};
		window.addEventListener('keydown', key);
		return () => window.removeEventListener('keydown', key);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [togglePlay, selected, focus]);

	// the engine centers the map in the free area between the panels
	const detailOpen = !!selected && mode === 'entities';
	const insets = useMemo(
		() => ({
			left: wide && leftOpen ? 304 : 0,
			right: wide && detailOpen ? 364 : detailOpen ? 0 : 0,
			top: gaps.top + 6,
			bottom: gaps.bottom + 2,
		}),
		[wide, leftOpen, detailOpen, gaps]
	);

	const focusNode = graph?.nodes.find((n) => n.id === graph.focus);
	// on phones the details start as a compact bar, a tap opens the full sheet
	const [sheet, setSheet] = useState(false);
	useEffect(() => setSheet(false), [selected]);
	const selectedNode = graph?.nodes.find((n) => n.id === selected);

	const selectedLabel = graph?.nodes.find((n) => n.id === selected)?.label;
	const ready = boot.ready && !!graph;

	return (
		<div className="absolute inset-0 overflow-hidden bg-usdu-bg">
			<GodEyeMap
				ref={map}
				graph={graph}
				rank={rank}
				hidden={hidden}
				three={three}
				selected={selected}
				focus={focus}
				insets={insets}
				fitKey={fitKey}
				onSelect={onSelect}
				onFocus={doFocus}
				onDive={dive}
			/>

			{!ready && <GodEyeLoading sync={boot.sync} unreachable={boot.unreachable} />}
			{boot.ready && error && !graph && (
				<div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
					<Glass className="px-5 py-4 text-center text-sm">
						<div className="font-semibold">GodEye could not load this view</div>
						<div className="mt-1 text-xs text-rose-600">{error}</div>
					</Glass>
				</div>
			)}

			{boot.ready && token && (
				<GodEyeToolbar
					rootRef={barEl}
					tokens={boot.tokens}
					token={token}
					onToken={onToken}
					mode={mode}
					onMode={onMode}
					onPick={doFocus}
					focusActive={!!focus}
				/>
			)}

			{ready && graph && scene && (
				<>
					{wide && (
						<div
							style={panelVars}
							className={`absolute bottom-[var(--gb)] left-3 top-[var(--gt)] z-10 w-[292px] transition-transform duration-200 ${leftOpen ? '' : '-translate-x-[310px]'}`}
						>
							<GodEyeOverview
								graph={graph}
								holders={scene.holders}
								windowSeconds={windowS}
								hidden={hidden}
								onToggleKind={toggleKind}
								onPick={jump}
								onCollapse={() => setLeftOpen(false)}
							/>
						</div>
					)}
					{wide && !leftOpen && (
						<div style={panelVars} className="absolute left-3 top-[var(--gt)] z-10">
							<IconButton onClick={() => setLeftOpen(true)}>› Overview</IconButton>
						</div>
					)}

					{focus && (
						<Glass
							style={panelVars}
							className="absolute left-1/2 top-[var(--gt)] z-10 flex -translate-x-1/2 items-center gap-3 px-3 py-1.5 text-xs"
						>
							<span>
								Focus · <b>{focusNode?.label || shortAddr(focus)}</b>
								<span className="text-text-muted"> and its {graph.nodes.length - 1} biggest counterparties</span>
							</span>
							<IconButton onClick={exitFocus}>Exit focus</IconButton>
						</Glass>
					)}

					{!selected && <GodEyeIntro />}

					{detailOpen && token && selected && !wide && !sheet && (
						<button
							onClick={() => setSheet(true)}
							style={panelVars}
							className={`${GLASS} absolute bottom-[var(--gb)] left-3 right-3 z-10 flex items-center gap-2.5 px-3.5 py-2.5 text-left`}
						>
							<Dot color={KIND_META[selectedNode?.kind ?? 'wallet'].color} size={9} />
							<span className="min-w-0 flex-1">
								<span className="block truncate text-sm font-semibold">{selectedNode?.label || shortAddr(selected)}</span>
								{selectedNode && selectedNode.kind !== 'mint' && (
									<span className="block text-[11px] text-text-muted">
										{fmt(selectedNode.balance)} {token ? boot.tokens.find((t) => t.key === token)?.symbol : ''}
									</span>
								)}
							</span>
							<span className="rounded-lg border border-usdu-orange/50 bg-usdu-orange/10 px-2.5 py-1 text-xs">Details ▲</span>
							<span
								role="button"
								aria-label="Deselect"
								onClick={(e) => {
									e.stopPropagation();
									setSelected(null);
								}}
								className="px-1 text-text-muted"
							>
								✕
							</span>
						</button>
					)}

					{detailOpen && token && selected && (wide || sheet) && (
						<div
							style={panelVars}
							className="absolute bottom-[var(--gb)] right-3 top-[var(--gt)] z-10 w-[340px] max-w-[calc(100%-24px)] max-md:top-auto max-md:h-[46%]"
						>
							<GodEyeDetail
								token={token}
								address={selected}
								fallbackLabel={selectedLabel}
								onClose={() => setSelected(null)}
								onFocus={doFocus}
								onJump={jump}
							/>
						</div>
					)}
				</>
			)}

			{boot.ready && (
				<div ref={timelineEl} className="absolute bottom-3 left-3 right-3 z-10">
					<GodEyeTimeline
						timeline={timeline}
						at={at}
						playing={playing}
						rate={rate}
						info={
							graph
								? `${graph.token.transfers.toLocaleString()} transfers mirrored · ${graph.totalNodes.toLocaleString()} ${mode === 'entities' ? 'accounts' : 'categories'}`
								: ''
						}
						controls={
							<GodEyeControls
								mode={mode}
								rank={rank}
								onRank={setRank}
								window={windowS}
								onWindow={setWindowS}
								top={top}
								onTop={setTop}
								three={three}
								onThree={() => setThree((t) => !t)}
								onFit={() => map.current?.fit()}
								focusActive={!!focus}
							/>
						}
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
		</div>
	);
}
