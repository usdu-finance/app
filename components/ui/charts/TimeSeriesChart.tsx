import { useEffect, useRef, useState } from 'react';

export interface AreaChartPoint {
	t: number; // unix seconds
	v: number;
}

interface Props {
	points: AreaChartPoint[];
	formatValue: (v: number) => string;
	formatTick?: (v: number) => string; // compact y-axis labels, defaults to formatValue
	height?: number;
	className?: string;
}

const MARGIN = { top: 12, right: 12, bottom: 24, left: 52 };
const Y_TICKS = 3;

const formatDay = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Round the axis max up to a clean number so the ticks land on 0 / 1K / 2K style values
function niceMax(max: number): number {
	if (max <= 0) return 1;
	const exp = Math.pow(10, Math.floor(Math.log10(max)));
	const step = [1, 2, 2.5, 5, 10].find((m) => m * exp * Y_TICKS >= max) ?? 10;
	return step * exp * Y_TICKS;
}

/**
 * Single-series area chart with a crosshair and tooltip, drawn in SVG.
 * The area grows from a zero baseline, the line is 2px, the grid is a recessive hairline.
 */
export default function AreaChart({ points, formatValue, formatTick, height = 220, className = '' }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const [hover, setHover] = useState<number | null>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const innerW = Math.max(width - MARGIN.left - MARGIN.right, 0);
	const innerH = height - MARGIN.top - MARGIN.bottom;

	const tMin = points[0]?.t ?? 0;
	const tMax = points[points.length - 1]?.t ?? 1;
	const yMax = niceMax(Math.max(...points.map((p) => p.v), 0));

	const x = (t: number) => MARGIN.left + (tMax === tMin ? innerW / 2 : ((t - tMin) / (tMax - tMin)) * innerW);
	const y = (v: number) => MARGIN.top + innerH - (v / yMax) * innerH;

	const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t)},${y(p.v)}`).join(' ');
	const last = points[points.length - 1];
	const area = last && points[0] ? `${line} L${x(last.t)},${y(0)} L${x(points[0].t)},${y(0)} Z` : '';

	const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
		const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
		let nearest = 0;
		points.forEach((p, i) => {
			if (Math.abs(x(p.t) - px) < Math.abs(x(points[nearest]!.t) - px)) nearest = i;
		});
		setHover(nearest);
	};

	const active = hover !== null ? points[hover] : undefined;
	const tooltipLeft = active ? Math.min(Math.max(x(active.t), 70), Math.max(width - 70, 70)) : 0;

	return (
		<div ref={ref} className={`relative w-full ${className}`} style={{ height }}>
			{width > 0 && (
				<svg
					width={width}
					height={height}
					role="img"
					aria-label="Area chart"
					onPointerMove={onMove}
					onPointerLeave={() => setHover(null)}
				>
					{/* grid + y axis */}
					{Array.from({ length: Y_TICKS + 1 }, (_, i) => {
						const v = (yMax / Y_TICKS) * i;
						return (
							<g key={i}>
								<line
									x1={MARGIN.left}
									x2={width - MARGIN.right}
									y1={y(v)}
									y2={y(v)}
									className="stroke-usdu-surface"
									strokeWidth={1}
								/>
								<text
									x={MARGIN.left - 8}
									y={y(v)}
									textAnchor="end"
									dominantBaseline="middle"
									className="fill-text-secondary text-xs"
								>
									{(formatTick ?? formatValue)(v)}
								</text>
							</g>
						);
					})}

					{/* x axis: first and last day */}
					{points.length > 1 && (
						<>
							<text x={MARGIN.left} y={height - 6} textAnchor="start" className="fill-text-secondary text-xs">
								{formatDay(tMin)}
							</text>
							<text x={width - MARGIN.right} y={height - 6} textAnchor="end" className="fill-text-secondary text-xs">
								{formatDay(tMax)}
							</text>
						</>
					)}

					<path d={area} className="fill-usdu-orange" fillOpacity={0.1} />
					<path
						d={line}
						fill="none"
						className="stroke-usdu-orange"
						strokeWidth={2}
						strokeLinejoin="round"
						strokeLinecap="round"
					/>

					{/* end marker with a surface ring */}
					{last && <circle cx={x(last.t)} cy={y(last.v)} r={4} className="fill-usdu-orange stroke-usdu-bg" strokeWidth={2} />}

					{/* crosshair */}
					{active && (
						<>
							<line
								x1={x(active.t)}
								x2={x(active.t)}
								y1={MARGIN.top}
								y2={y(0)}
								className="stroke-text-secondary"
								strokeWidth={1}
							/>
							<circle cx={x(active.t)} cy={y(active.v)} r={4} className="fill-usdu-orange stroke-usdu-bg" strokeWidth={2} />
						</>
					)}
				</svg>
			)}

			{active && (
				<div
					className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-usdu-surface bg-usdu-bg px-3 py-2 shadow-sm"
					style={{ left: tooltipLeft, top: 0 }}
				>
					<div className="text-sm font-semibold text-text-primary">{formatValue(active.v)}</div>
					<div className="text-xs text-text-secondary">{formatDay(active.t)}</div>
				</div>
			)}
		</div>
	);
}
