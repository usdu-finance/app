import { useState } from 'react';

export interface DonutSlice {
	key: string;
	label: string;
	value: number;
	/** Tailwind stroke class, e.g. `stroke-success` */
	className: string;
}

interface Props {
	slices: DonutSlice[];
	centerLabel?: string;
	centerValue?: string;
	size?: number;
	className?: string;
}

const THICKNESS = 22;
const GAP = 2; // px of surface between slices

/**
 * Donut chart drawn in SVG. Slices start at 12 o'clock and run clockwise, hovering one dims the others and
 * swaps the center text to that slice. Renders a recessive empty ring when there is nothing to show.
 */
export default function DonutChart({ slices, centerLabel, centerValue, size = 200, className = '' }: Props) {
	const [hover, setHover] = useState<string | null>(null);

	const radius = (size - THICKNESS) / 2;
	const circumference = 2 * Math.PI * radius;
	const total = slices.reduce((sum, s) => sum + s.value, 0);
	const active = slices.find((s) => s.key === hover);

	let offset = 0;

	return (
		<div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
			<svg width={size} height={size} role="img" aria-label="Donut chart" className="-rotate-90">
				<circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={THICKNESS} className="stroke-usdu-surface" />
				{total > 0 &&
					slices
						.filter((s) => s.value > 0)
						.map((s) => {
							const length = (s.value / total) * circumference;
							const dash = Math.max(length - (slices.length > 1 ? GAP : 0), 0);
							const circle = (
								<circle
									key={s.key}
									cx={size / 2}
									cy={size / 2}
									r={radius}
									fill="none"
									strokeWidth={THICKNESS}
									strokeDasharray={`${dash} ${circumference - dash}`}
									strokeDashoffset={-offset}
									className={`${s.className} transition-opacity duration-200`}
									opacity={hover === null || hover === s.key ? 1 : 0.4}
									onPointerEnter={() => setHover(s.key)}
									onPointerLeave={() => setHover(null)}
								/>
							);
							offset += length;
							return circle;
						})}
			</svg>

			<div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
				<span className="text-text-secondary text-xs font-medium">{active ? active.label : centerLabel}</span>
				<span className="text-usdu-black text-lg font-bold">
					{active ? `${((active.value / total) * 100).toFixed(1)}%` : centerValue}
				</span>
			</div>
		</div>
	);
}
