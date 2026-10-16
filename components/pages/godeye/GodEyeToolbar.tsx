import { ReactNode, Ref, useEffect, useRef, useState } from 'react';
import { godeyeSearch } from '@/hooks/useGodEye';
import { KIND_META, WINDOWS } from './godeye.constants';
import { shortAddr } from './godeye.format';
import { GodEyeMode, GodEyeRank, GodEyeSearchHit, GodEyeTokenInfo } from './godeye.types';
import { GodEyeBrand } from './GodEyeLayout';
import { Dot, Glass, IconButton, Seg, SELECT as select } from './GodEyeUi';

type ControlsProps = {
	mode: GodEyeMode;
	rank: GodEyeRank;
	onRank: (r: GodEyeRank) => void;
	window: number;
	onWindow: (w: number) => void;
	top: number;
	onTop: (n: number) => void;
	three: boolean;
	onThree: () => void;
	onFit: () => void;
	focusActive: boolean;
};

type Props = {
	tokens: GodEyeTokenInfo[];
	token: string;
	onToken: (k: string) => void;
	mode: GodEyeMode;
	onMode: (m: GodEyeMode) => void;
	onPick: (address: string) => void;
	focusActive: boolean;
	/** lets the view measure the bar to keep the panels evenly spaced */
	rootRef?: Ref<HTMLDivElement>;
	/** shown on the same row between the card and the search (own row on phones) */
	center?: ReactNode;
};

/** node count slider; commits on release so the scene is not refetched while dragging */
export function NodesSlider({ value, min, onChange }: { value: number; min: number; onChange: (n: number) => void }) {
	const [local, setLocal] = useState(value);
	useEffect(() => setLocal(value), [value]);
	return (
		<>
			<span className="text-[10px] uppercase tracking-wider text-text-muted">Nodes</span>
			<input
				type="range"
				min={min}
				max={300}
				step={5}
				value={local}
				onChange={(e) => setLocal(Number(e.target.value))}
				onMouseUp={() => onChange(local)}
				onTouchEnd={() => onChange(local)}
				onKeyUp={() => onChange(local)}
				className="w-24 accent-usdu-orange"
			/>
			<span className="w-8 rounded-lg border border-black/10 bg-black/5 py-0.5 text-center text-xs tabular-nums">{local}</span>
		</>
	);
}

/** graph settings, rendered inside the time travel panel */
export function GodEyeControls(p: ControlsProps) {
	return (
		<div className="hidden flex-wrap items-center gap-2 md:flex">
			<span className="text-[10px] uppercase tracking-wider text-text-muted">Rank</span>
			<Seg
				value={p.rank}
				onChange={p.onRank}
				disabled={p.mode === 'categories' || p.focusActive}
				options={[
					{ value: 'balance', label: 'Balance' },
					{ value: 'volume', label: 'Volume' },
				]}
			/>
			<span className="text-[10px] uppercase tracking-wider text-text-muted">Flow</span>
			<select className={select} value={p.window} onChange={(e) => p.onWindow(Number(e.target.value))}>
				{WINDOWS.map((w) => (
					<option key={w.value} value={w.value}>
						{w.label}
					</option>
				))}
			</select>
			<NodesSlider value={p.top} min={15} onChange={p.onTop} />
			<IconButton onClick={p.onThree} active={p.three} title="Toggle 3D (3)">
				3D
			</IconButton>
			<IconButton onClick={p.onFit} title="Fit view (F)">
				Fit
			</IconButton>
		</div>
	);
}

export default function GodEyeToolbar(p: Props) {
	const [q, setQ] = useState('');
	const [hits, setHits] = useState<GodEyeSearchHit[]>([]);
	const [open, setOpen] = useState(false);
	const box = useRef<HTMLDivElement>(null);
	const input = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const term = q.trim();
		if (term.length < 2) return setOpen(false);
		const t = setTimeout(async () => {
			try {
				const r = await godeyeSearch(term, p.token);
				if (!r.length && /^0x[0-9a-fA-F]{40}$/.test(term)) r.push({ address: term.toLowerCase(), label: null, kind: 'wallet' });
				setHits(r);
				setOpen(true);
			} catch {
				/* ignore */
			}
		}, 160);
		return () => clearTimeout(t);
	}, [q, p.token]);

	useEffect(() => {
		const click = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
		const key = (e: KeyboardEvent) => {
			if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
				e.preventDefault();
				input.current?.focus();
			}
		};
		document.addEventListener('click', click);
		window.addEventListener('keydown', key);
		return () => {
			document.removeEventListener('click', click);
			window.removeEventListener('keydown', key);
		};
	}, []);

	const pick = (a: string) => {
		setOpen(false);
		setQ('');
		input.current?.blur();
		p.onPick(a);
	};

	return (
		<div
			ref={p.rootRef}
			className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex flex-wrap items-center gap-2 [&>*]:pointer-events-auto"
		>
			<Glass className="flex w-full flex-wrap items-center gap-x-2.5 gap-y-2 px-3 py-2.5 md:w-auto md:flex-nowrap">
				<GodEyeBrand subtitle="USDU · fund flow" />
				<div className="mx-1 hidden h-6 w-px bg-black/10 md:block" />
				<div className="flex w-full items-center gap-2 md:w-auto">
					<select
						className={`${select} min-w-0 flex-1 md:flex-none`}
						value={p.token}
						onChange={(e) => p.onToken(e.target.value)}
						title="Token ledger"
					>
						{p.tokens.map((t) => (
							<option key={t.key} value={t.key}>
								{t.symbol} ({t.transfers.toLocaleString()})
							</option>
						))}
					</select>
					<Seg
						value={p.mode}
						onChange={p.onMode}
						options={[
							{ value: 'entities', label: 'Entities' },
							{ value: 'categories', label: 'Categories' },
						]}
					/>
				</div>
			</Glass>

			{p.center && <div className="flex w-full min-w-0 justify-center md:w-auto md:flex-1">{p.center}</div>}

			<div ref={box} className="relative w-full md:ml-auto md:w-auto">
				<input
					ref={input}
					value={q}
					onChange={(e) => setQ(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && hits[0]) pick(hits[0].address);
						if (e.key === 'Escape') {
							setOpen(false);
							input.current?.blur();
						}
					}}
					placeholder="Search address or label  ( / )"
					spellCheck={false}
					autoComplete="off"
					className="w-full rounded-xl md:w-64 border border-black/10 bg-white/80 px-3 py-2 text-xs text-usdu-black outline-none backdrop-blur-xl placeholder:text-text-muted focus:border-usdu-orange"
				/>
				{open && (
					<Glass className="absolute right-0 top-11 max-h-80 w-full overflow-auto p-1 md:w-80">
						{hits.length === 0 && <div className="px-2 py-1.5 text-xs text-text-muted">No match</div>}
						{hits.map((h) => (
							<div
								key={h.address}
								onClick={() => pick(h.address)}
								className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-usdu-orange/15"
							>
								<span className="flex items-center gap-2">
									<Dot color={KIND_META[h.kind].color} size={7} />
									{h.label || shortAddr(h.address)}
								</span>
								<span className="font-mono text-[10px] text-text-muted">{shortAddr(h.address)}</span>
							</div>
						))}
					</Glass>
				)}
			</div>
		</div>
	);
}
