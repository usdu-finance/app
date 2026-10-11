import { useEffect, useRef, useState } from 'react';

export interface TimeSeriesPoint {
	t: number; // unix seconds
	v: number;
}

interface Props {
	points: TimeSeriesPoint[];
	variant?: 'area' | 'bars';
	formatValue: (v: number) => string;
	formatTick?: (v: number) => string; // compact y-axis labels, defaults to formatValue
	height?: number;
	className?: string;
}

const MARGIN = { top: 12, right: 12, bottom: 24, left: 52 };
const Y_TICKS = 3;
const BAR_MAX_WIDTH = 24;
const BAR_RADIUS = 4;
const BAR_GAP = 2;

const formatDay = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Round the axis max up to a clean number so the ticks land on 0 / 1K / 2K style values
function niceMax(max: number): number {
	if (max <= 0) return 1;
	const exp = Math.pow(10, Math.floor(Math.log10(max)));
	const step = [1, 2, 2.5, 5, 10].find((m) => m * exp * Y_TICKS >= max) ?? 10;
	return step * exp * Y_TICKS;
}

/**
 * Single-series time chart drawn in SVG, as an area with a crosshair or as columns with a per-bar tooltip.
 * Both grow from a zero baseline; the line is 2px, columns are at most 24px wide with a 4px rounded top,
 * and the grid is a recessive hairline.
 */
export default function TimeSeriesChart({ points, variant = 'area', formatValue, formatTick, height = 220, className = '' }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const [hover, setHover] = useState<number | null>(null);
	const isBars = variant === 'bars';

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

	// columns sit in equal slots by index, the area is placed by time
	const slot = points.length > 0 ? innerW / points.length : 0;
	const x = (i: number) =>
		isBars
			? MARGIN.left + slot * (i + 0.5)
			: MARGIN.left + (tMax === tMin ? innerW / 2 : (((points[i]?.t ?? tMin) - tMin) / (tMax - tMin)) * innerW);
	const y = (v: number) => MARGIN.top + innerH - (v / yMax) * innerH;

	const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
		const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
		let nearest = 0;
		points.forEach((_, i) => {
			if (Math.abs(x(i) - px) < Math.abs(x(nearest) - px)) nearest = i;
		});
		setHover(nearest);
	};

	const barWidth = Math.max(Math.min(BAR_MAX_WIDTH, slot - BAR_GAP), 1);
	const bar = (i: number, v: number) => {
		const left = x(i) - barWidth / 2;
		const right = left + barWidth;
		const top = y(v);
		const base = y(0);
		const r = Math.min(BAR_RADIUS, base - top, barWidth / 2);
		return `M${left},${base} L${left},${top + r} Q${left},${top} ${left + r},${top} L${right - r},${top} Q${right},${top} ${right},${top + r} L${right},${base} Z`;
	};

	const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.v)}`).join(' ');
	const lastIndex = points.length - 1;
	const area = lastIndex >= 0 ? `${line} L${x(lastIndex)},${y(0)} L${x(0)},${y(0)} Z` : '';

	const active = hover !== null ? points[hover] : undefined;
	const tooltipLeft = hover !== null ? Math.min(Math.max(x(hover), 70), Math.max(width - 70, 70)) : 0;

	return (
		<div ref={ref} className={`relative w-full ${className}`} style={{ height }}>
			{width > 0 && (
				<svg
					width={width}
					height={height}
					role="img"
					aria-label={isBars ? 'Column chart' : 'Area chart'}
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

					{isBars ? (
						points.map((p, i) => (
							<path
								key={p.t}
								d={bar(i, p.v)}
								className="fill-usdu-orange"
								fillOpacity={hover === null || hover === i ? 1 : 0.55}
							/>
						))
					) : (
						<>
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
							{lastIndex >= 0 && (
								<circle
									cx={x(lastIndex)}
									cy={y(points[lastIndex]!.v)}
									r={4}
									className="fill-usdu-orange stroke-usdu-bg"
									strokeWidth={2}
								/>
							)}

							{/* crosshair */}
							{active && hover !== null && (
								<>
									<line
										x1={x(hover)}
										x2={x(hover)}
										y1={MARGIN.top}
										y2={y(0)}
										className="stroke-text-secondary"
										strokeWidth={1}
									/>
									<circle
										cx={x(hover)}
										cy={y(active.v)}
										r={4}
										className="fill-usdu-orange stroke-usdu-bg"
										strokeWidth={2}
									/>
								</>
							)}
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
