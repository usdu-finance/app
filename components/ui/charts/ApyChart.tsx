import { useEffect, useRef, useState } from 'react';

interface Props {
	yearly: number; // paid into the vault per year at the flow, in tokens
	tvl: number; // the vault's TVL today, in tokens
	targets?: number[]; // APY targets in %, none draws only the curve and today's line
	metric?: string; // what the curve is called, APY by default (APR for a stream rate)
	formatTvl: (v: number) => string; // compact, without the unit
	unit: string; // token symbol
	height?: number;
	className?: string;
}

const MARGIN = { top: 20, right: 16, bottom: 28, left: 44 };
const TICKS = 4;
const SAMPLES = 120;

// Round up to a clean step (1 / 2 / 2.5 / 5 x 10^n) so the ticks land on round values
const niceStep = (max: number, ticks: number) => {
	const raw = max / ticks;
	const exp = Math.pow(10, Math.floor(Math.log10(raw)));
	return ([1, 2, 2.5, 5, 10].find((m) => m * exp >= raw) ?? 10) * exp;
};

/**
 * What the APY of a flow is for any vault TVL: the yearly amount over the TVL, a curve that falls as the vault grows.
 * Vertical is the APY, horizontal the TVL. The part of the curve up to today's TVL is the accent, the rest is gray, and
 * each target APY is a dot where its line meets the curve: the accent when the vault is already at or above that TVL,
 * gray while it is missing. The key below the chart lists the same values in text.
 */
export default function ApyChart({ yearly, tvl, targets = [], metric = 'APY', formatTvl, unit, height = 240, className = '' }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const [hover, setHover] = useState<number | null>(null); // TVL under the pointer

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	// the container always renders, or the observer above would never attach while there is nothing to draw yet
	const empty = !(yearly > 0);

	const apyAt = (t: number) => (yearly / t) * 100;
	const neededAt = (a: number) => (yearly * 100) / a;
	const currentApy = tvl > 0 ? apyAt(tvl) : undefined;
	const maxTarget = Math.max(...targets, 1);

	const yStep = niceStep(Math.max(maxTarget * 1.4, (currentApy ?? 0) * 1.15), TICKS);
	const yMax = yStep * TICKS;
	const xStep = niceStep(Math.max(tvl, ...targets.map(neededAt)) * 1.15, TICKS);
	const xMax = xStep * TICKS;
	const x0 = neededAt(yMax); // TVL where the curve leaves the top of the chart

	const innerW = Math.max(width - MARGIN.left - MARGIN.right, 0);
	const innerH = height - MARGIN.top - MARGIN.bottom;
	const x = (t: number) => MARGIN.left + (t / xMax) * innerW;
	const y = (a: number) => MARGIN.top + innerH - (a / yMax) * innerH;

	// the curve is steep near the top, so the samples sit denser there
	const curve = (from: number, to: number, dense: boolean) =>
		Array.from({ length: SAMPLES + 1 }, (_, i) => {
			const u = i / SAMPLES;
			const t = from + (to - from) * (dense ? u * u : u);
			return `${i === 0 ? 'M' : 'L'}${x(t)},${y(apyAt(t))}`;
		}).join(' ');

	const split = Math.min(Math.max(tvl, x0), xMax); // where the accent ends and the gray starts
	const reachedPath = split > x0 ? curve(x0, split, true) : '';
	const restPath = split < xMax ? curve(split, xMax, false) : '';
	const reachedArea = reachedPath ? `${reachedPath} L${x(split)},${y(0)} L${x(x0)},${y(0)} Z` : '';

	const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
		const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
		setHover(Math.min(Math.max(((px - MARGIN.left) / innerW) * xMax, x0), xMax));
	};

	const tooltipLeft = hover !== null ? Math.min(Math.max(x(hover), 70), Math.max(width - 70, 70)) : 0;
	const todayAnchor = x(tvl) > width - 80 ? 'end' : 'middle';

	return (
		// relative: the sr-only list below is absolutely positioned, and without a positioned parent it is measured against the
		// whole page, so its spot far down inside <main> would make the page itself scrollable
		<div className={`relative ${className}`}>
			<div ref={ref} className="relative w-full" style={{ height }}>
				{!empty && width > 0 && (
					<svg
						width={width}
						height={height}
						role="img"
						aria-label={`${metric} of the flow by vault TVL`}
						onPointerMove={onMove}
						onPointerLeave={() => setHover(null)}
					>
						{/* grid + y axis */}
						{Array.from({ length: TICKS + 1 }, (_, i) => (
							<g key={i}>
								<line
									x1={MARGIN.left}
									x2={width - MARGIN.right}
									y1={y(yStep * i)}
									y2={y(yStep * i)}
									className="stroke-usdu-surface"
									strokeWidth={1}
								/>
								<text
									x={MARGIN.left - 8}
									y={y(yStep * i)}
									textAnchor="end"
									dominantBaseline="middle"
									className="fill-text-secondary text-xs"
								>
									{`${yStep * i}%`}
								</text>
							</g>
						))}

						{/* x axis, the unit rides on the last tick */}
						{Array.from({ length: TICKS + 1 }, (_, i) => (
							<text
								key={i}
								x={x(xStep * i)}
								y={height - 8}
								textAnchor={i === 0 ? 'start' : i === TICKS ? 'end' : 'middle'}
								className="fill-text-secondary text-xs"
							>
								{formatTvl(xStep * i)}
								{i === TICKS ? ` ${unit}` : ''}
							</text>
						))}

						{/* target APYs: a hairline across, a drop to the axis and a dot on the curve */}
						{targets.map((a) => {
							const needed = neededAt(a);
							return (
								<g key={a}>
									<line
										x1={MARGIN.left}
										x2={width - MARGIN.right}
										y1={y(a)}
										y2={y(a)}
										className="stroke-text-muted"
										strokeWidth={1}
										strokeOpacity={0.5}
										strokeDasharray="4 4"
									/>
									<line
										x1={x(needed)}
										x2={x(needed)}
										y1={y(a)}
										y2={y(0)}
										className="stroke-text-muted"
										strokeWidth={1}
										strokeOpacity={0.5}
										strokeDasharray="4 4"
									/>
								</g>
							);
						})}

						{reachedArea && <path d={reachedArea} className="fill-usdu-orange" fillOpacity={0.1} />}
						{restPath && (
							<path
								d={restPath}
								fill="none"
								className="stroke-text-muted"
								strokeWidth={2}
								strokeLinejoin="round"
								strokeLinecap="round"
							/>
						)}
						{reachedPath && (
							<path
								d={reachedPath}
								fill="none"
								className="stroke-usdu-orange"
								strokeWidth={2}
								strokeLinejoin="round"
								strokeLinecap="round"
							/>
						)}

						{targets.map((a) => {
							const needed = neededAt(a);
							const label = `${a}% at ${formatTvl(needed)} TVL`;
							const labelW = label.length * 7; // text-xs, close enough to place it
							// above the line to the right of the dot, where the curve leaves room; below the line to the left
							// when that would run into the Today line or the edge
							const todayX = currentApy !== undefined ? x(tvl) : Infinity;
							const right = x(needed) + 8 + labelW;
							const flip = right > width - MARGIN.right || (x(needed) < todayX && right > todayX - 4);
							return (
								<g key={a}>
									<circle
										cx={x(needed)}
										cy={y(a)}
										r={4}
										className={`${needed <= tvl ? 'fill-usdu-orange' : 'fill-text-muted'} stroke-usdu-bg`}
										strokeWidth={2}
									/>
									<text
										x={flip ? x(needed) - 8 : x(needed) + 8}
										y={flip ? y(a) + 14 : y(a) - 7}
										textAnchor={flip ? 'end' : 'start'}
										paintOrder="stroke"
										strokeWidth={3}
										className="fill-text-secondary stroke-usdu-bg text-xs"
									>
										{label}
									</text>
								</g>
							);
						})}

						{/* today */}
						{currentApy !== undefined && tvl >= x0 && (
							<>
								<line
									x1={x(tvl)}
									x2={x(tvl)}
									y1={MARGIN.top}
									y2={y(0)}
									className="stroke-usdu-orange"
									strokeWidth={1}
									strokeOpacity={0.5}
								/>
								<circle cx={x(tvl)} cy={y(currentApy)} r={5} className="fill-usdu-orange stroke-usdu-bg" strokeWidth={2} />
								<text x={x(tvl)} y={MARGIN.top - 6} textAnchor={todayAnchor} className="fill-text-secondary text-xs">
									{`Today · ${currentApy.toFixed(2)}%`}
								</text>
							</>
						)}

						{/* crosshair */}
						{hover !== null && (
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
									cy={y(apyAt(hover))}
									r={4}
									className={`${hover <= tvl ? 'fill-usdu-orange' : 'fill-text-muted'} stroke-usdu-bg`}
									strokeWidth={2}
								/>
							</>
						)}
					</svg>
				)}

				{empty && <div className="text-text-secondary">Nothing flows yet, so there is no {metric} to draw.</div>}

				{hover !== null && !empty && (
					<div
						className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-usdu-surface bg-usdu-bg px-3 py-2 shadow-sm"
						style={{ left: tooltipLeft, top: 0 }}
					>
						<div className="text-sm font-semibold text-text-primary">
							{apyAt(hover).toFixed(2)}% {metric}
						</div>
						<div className="text-xs text-text-secondary">
							at {formatTvl(hover)} {unit} TVL
						</div>
					</div>
				)}
			</div>

			{/* the values for screen readers: the accent alone is below 3:1 on this surface */}
			{!empty && (
				<ul className="sr-only">
					<li>
						Today: {formatTvl(tvl)} {unit} TVL{currentApy !== undefined && `, ${currentApy.toFixed(2)}% ${metric}`}
					</li>
					{targets.map((a) => {
						const needed = neededAt(a);
						return (
							<li key={a}>
								{a}% {metric} at {formatTvl(needed)} {unit} TVL,{' '}
								{needed <= tvl ? 'reached' : `missing ${formatTvl(needed - tvl)} ${unit}`}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
