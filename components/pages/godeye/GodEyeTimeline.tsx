import { useCallback, useEffect, useRef, useState } from 'react';
import { SPEEDS } from './godeye.constants';
import { clamp, dateStr, fmt } from './godeye.format';
import { GodEyeTimelinePoint } from './godeye.types';
import { Glass, IconButton, Seg } from './GodEyeUi';

type Metric = 'supply' | 'holders' | 'volume';

type Props = {
	timeline: GodEyeTimelinePoint[];
	at: number | null;
	playing: boolean;
	rate: number;
	info: string;
	/** override the metric names and hover text (the address timeline reuses supply / holders / volume for balance / counterparties / volume) */
	labels?: Record<Metric, string>;
	title?: string;
	hoverText?: (p: GodEyeTimelinePoint, t: number) => string;
	onScrub: (t: number) => void;
	onPlay: () => void;
	onRate: (r: number) => void;
	onLive: () => void;
};

export default function GodEyeTimeline({
	timeline,
	at,
	playing,
	rate,
	info,
	labels,
	title = 'Time travel',
	hoverText,
	onScrub,
	onPlay,
	onRate,
	onLive,
}: Props) {
	const ref = useRef<HTMLCanvasElement>(null);
	const [metric, setMetric] = useState<Metric>('supply');
	const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
	const scrubbing = useRef(false);
	const [size, setSize] = useState(0);

	const t0 = timeline.length ? timeline[0].t : 0;
	const t1 = timeline.length ? timeline[timeline.length - 1].t : 1;
	const cur = at ?? t1;

	useEffect(() => {
		const c = ref.current;
		if (!c) return;
		const ro = new ResizeObserver(() => setSize(c.clientWidth));
		ro.observe(c);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const c = ref.current;
		if (!c || timeline.length < 2) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = c.clientWidth,
			h = c.clientHeight;
		c.width = Math.round(w * dpr);
		c.height = Math.round(h * dpr);
		const g = c.getContext('2d')!;
		g.setTransform(dpr, 0, 0, dpr, 0, 0);
		g.clearRect(0, 0, w, h);
		const val = (p: GodEyeTimelinePoint) => p[metric];
		let mx = 1e-9;
		for (const p of timeline) mx = Math.max(mx, val(p));
		const X = (t: number) => ((t - t0) / (t1 - t0)) * (w - 2) + 1;
		const Y = (v: number) => h - 14 - (v / mx) * (h - 24);
		const ax = X(cur);
		const line = () => timeline.forEach((p, i) => (i ? g.lineTo(X(p.t), Y(val(p))) : g.moveTo(X(p.t), Y(val(p)))));

		const grd = g.createLinearGradient(0, 0, 0, h);
		grd.addColorStop(0, 'rgba(241,99,37,.35)');
		grd.addColorStop(1, 'rgba(241,99,37,0)');
		g.beginPath();
		g.moveTo(X(t0), h - 14);
		line();
		g.lineTo(X(t1), h - 14);
		g.closePath();
		g.fillStyle = grd;
		g.fill();

		g.save();
		g.beginPath();
		g.rect(0, 0, ax, h);
		g.clip();
		g.beginPath();
		line();
		g.strokeStyle = '#f16325';
		g.lineWidth = 1.6;
		g.stroke();
		g.fillStyle = 'rgba(241,99,37,.10)';
		g.fillRect(0, 0, ax, h);
		g.restore();

		g.beginPath();
		line();
		g.strokeStyle = 'rgba(241,99,37,.5)';
		g.lineWidth = 1;
		g.stroke();

		g.fillStyle = '#6b7280';
		g.font = '10px sans-serif';
		g.textAlign = 'left';
		for (let y = new Date(t0 * 1000).getUTCFullYear() + 1; y <= new Date(t1 * 1000).getUTCFullYear(); y++) {
			const x = X(Date.UTC(y, 0, 1) / 1000);
			g.fillRect(x, h - 14, 1, 5);
			g.fillText(String(y), x + 3, h - 3);
		}
		g.fillText(dateStr(t0), 3, h - 3);

		g.strokeStyle = '#0c0c0c';
		g.lineWidth = 2;
		g.beginPath();
		g.moveTo(ax, 0);
		g.lineTo(ax, h - 14);
		g.stroke();
		g.fillStyle = '#0c0c0c';
		g.beginPath();
		g.arc(ax, 4, 4, 0, Math.PI * 2);
		g.fill();
		if (hover) {
			g.strokeStyle = 'rgba(12,12,12,.25)';
			g.lineWidth = 1;
			g.beginPath();
			g.moveTo(X(hover.t), 0);
			g.lineTo(X(hover.t), h - 14);
			g.stroke();
		}
	}, [timeline, cur, metric, hover, size, t0, t1]);

	const timeAt = useCallback(
		(e: React.PointerEvent) => {
			const r = ref.current!.getBoundingClientRect();
			return clamp(t0 + ((e.clientX - r.left) / r.width) * (t1 - t0), t0, t1);
		},
		[t0, t1]
	);

	const point = hover && timeline.length ? (timeline.find((p) => p.t >= hover.t) ?? timeline[timeline.length - 1]) : null;

	return (
		<Glass className="grid grid-cols-1 gap-3.5 px-3.5 py-2.5 md:grid-cols-[auto_1fr]">
			<div className="flex min-w-[150px] items-center gap-3 md:flex-col md:items-stretch md:justify-between md:gap-1.5">
				<div className="flex items-center gap-2.5">
					<button
						onClick={onPlay}
						title="Play history (space)"
						className="h-11 w-11 rounded-full border border-usdu-orange/50 bg-usdu-orange/10 text-base hover:bg-usdu-orange/25"
					>
						{playing ? '❚❚' : '▶'}
					</button>
					<div>
						<div className="text-[10px] uppercase tracking-widest text-text-muted">{title}</div>
						<div className="text-lg font-semibold tabular-nums">{timeline.length ? dateStr(cur) : '–'}</div>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<select
						value={rate}
						onChange={(e) => onRate(Number(e.target.value))}
						className="rounded-lg border border-black/10 bg-black/5 px-2 py-1 text-xs outline-none [&>option]:bg-white"
					>
						{SPEEDS.map((s) => (
							<option key={s.value} value={s.value}>
								{s.label}
							</option>
						))}
					</select>
					<IconButton onClick={onLive} active={!at}>
						<span className="inline-flex items-center gap-1.5">
							<i className={`inline-block h-1.5 w-1.5 rounded-full ${at ? 'bg-gray-400' : 'animate-pulse bg-green-500'}`} />
							Live
						</span>
					</IconButton>
				</div>
			</div>

			<div className="flex min-w-0 flex-col">
				<div className="mb-1 flex items-center justify-between gap-2">
					<Seg
						value={metric}
						onChange={setMetric}
						options={[
							{ value: 'supply', label: labels?.supply ?? 'Supply' },
							{ value: 'holders', label: labels?.holders ?? 'Holders' },
							{ value: 'volume', label: labels?.volume ?? 'Volume' },
						]}
					/>
					<span className="hidden text-[10px] uppercase tracking-wider text-text-muted sm:block">{info}</span>
				</div>
				<div className="relative h-[70px] min-h-0 flex-1">
					<canvas
						ref={ref}
						className="absolute inset-0 h-full w-full cursor-ew-resize touch-none"
						onPointerDown={(e) => {
							e.currentTarget.setPointerCapture(e.pointerId);
							scrubbing.current = true;
							onScrub(timeAt(e));
						}}
						onPointerMove={(e) => {
							const t = timeAt(e);
							const r = ref.current!.getBoundingClientRect();
							setHover({ x: e.clientX - r.left, t });
							if (scrubbing.current) onScrub(t);
						}}
						onPointerUp={() => (scrubbing.current = false)}
						onPointerLeave={() => setHover(null)}
					/>
					{hover && point && (
						<div
							className="pointer-events-none absolute top-5 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/15 bg-white/95 px-2 py-0.5 text-[11px]"
							style={{ left: hover.x }}
						>
							{hoverText
								? hoverText(point, hover.t)
								: `${dateStr(hover.t)} · supply ${fmt(point.supply)} · ${point.holders} holders`}
						</div>
					)}
				</div>
			</div>
		</Glass>
	);
}
