import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GodEyeQuery, useGodEyeBoot, useGodEyeScene, useGodEyeTimeline } from '@/hooks/useGodEye';
import { KIND_META, KIND_ORDER } from './godeye.constants';
import { GodEyeKind, GodEyeMode, GodEyeRank } from './godeye.types';
import GodEyeDetail from './GodEyeDetail';
import GodEyeLoading from './GodEyeLoading';
import GodEyeMap, { GodEyeMapHandle } from './GodEyeMap';
import GodEyeOverview from './GodEyeOverview';
import GodEyeTimeline from './GodEyeTimeline';
import GodEyeToolbar, { GodEyeControls } from './GodEyeToolbar';
import { DETAIL_PANEL, MobileDetailBar, useIsWide, usePanelGaps } from './GodEyeLayout';
import { Glass, IconButton } from './GodEyeUi';
import { fmt, shortAddr } from './godeye.format';

const NEAR_LIVE = 3600;

type Props = {
	/** false while the deep timeline covers the map: keeps the state but stops rendering, hotkeys and the url hash */
	active?: boolean;
	onTimeline: (address: string, token: string) => void;
};

export default function GodEyeView({ active = true, onTimeline }: Props) {
	const boot = useGodEyeBoot();
	const map = useRef<GodEyeMapHandle>(null);
	const wide = useIsWide();

	// ---- view state (mirrored into the url hash so views can be shared)

	const [init, setInit] = useState(false);
	const [token, setToken] = useState<string | null>(null);
	const [at, setAt] = useState<number | null>(null);
	const { barEl, timelineEl, gaps, panelVars } = usePanelGaps(`${boot.ready}:${token}`);
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
		if (!init || !token || !active) return;
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
	}, [init, token, active, at, windowS, mode, focus, selected, three]);

	// ---- data
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

	// resetting the canvas without a new graph arriving would leave it empty, so every action that
	// resets the context first checks that it really changes what is queried
	const onToken = (k: string) => {
		if (k === token) return;
		setToken(k);
		setFocus(null);
		setSelected(null);
		setHidden(new Set());
		resetContext();
	};
	const onMode = (m: GodEyeMode) => {
		if (m === mode) return;
		setMode(m);
		setFocus(null);
		setHidden(new Set());
		if (m === 'categories') setSelected(null);
		resetContext();
	};
	const doFocus = useCallback(
		(address: string) => {
			setSelected(address);
			// already focused: keep the graph, just bring the node back into view
			if (address === focus && mode === 'entities') {
				setHidden(new Set());
				map.current?.flyTo(address);
				return;
			}
			setFocus(address);
			setMode('entities');
			setHidden(new Set());
			resetContext();
		},
		[resetContext, focus, mode]
	);
	const exitFocus = () => {
		if (!focus) return;
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
		const requery = mode !== 'entities' || !!focus;
		setMode('entities');
		setFocus(null);
		setHidden(new Set(KIND_ORDER.filter((k) => k !== kind && k !== 'mint' && k !== 'others')));
		if (requery) resetContext();
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
			if (!active) return;
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
	}, [togglePlay, selected, focus, active]);

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
				paused={!active}
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
					center={
						ready && graph && focus ? (
							<Glass className="flex max-w-full items-center gap-3 px-3 py-1.5 text-xs">
								<span className="min-w-0 truncate">
									Focus · <b>{focusNode?.label || shortAddr(focus)}</b>
									<span className="hidden text-text-muted xl:inline">
										{' '}
										and its {graph.nodes.length - 1} biggest counterparties
									</span>
								</span>
								<IconButton onClick={exitFocus}>Exit focus</IconButton>
							</Glass>
						) : null
					}
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

					{detailOpen && token && selected && !wide && !sheet && (
						<MobileDetailBar
							style={panelVars}
							color={KIND_META[selectedNode?.kind ?? 'wallet'].color}
							title={selectedNode?.label || shortAddr(selected)}
							sub={
								selectedNode && selectedNode.kind !== 'mint'
									? `${fmt(selectedNode.balance)} ${boot.tokens.find((t) => t.key === token)?.symbol ?? ''}`
									: undefined
							}
							onOpen={() => setSheet(true)}
							onClose={() => setSelected(null)}
						/>
					)}

					{detailOpen && token && selected && (wide || sheet) && (
						<div style={panelVars} className={DETAIL_PANEL}>
							<GodEyeDetail
								token={token}
								address={selected}
								fallbackLabel={selectedLabel}
								onClose={() => setSelected(null)}
								onFocus={doFocus}
								onJump={jump}
								onTimeline={(a) => onTimeline(a, token)}
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
