import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { Dot, GLASS } from './GodEyeUi';

/** md breakpoint: below it the side panels are hidden and the details become a bottom sheet */
export function useIsWide() {
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

/**
 * The side panels sit between the top bar and the time travel panel with the same 12px gap on both sides.
 * Attach `barEl` / `timelineEl` to those two elements, `remeasure` changes when they (un)mount.
 */
export function usePanelGaps(remeasure: string) {
	const barEl = useRef<HTMLDivElement | null>(null);
	const timelineEl = useRef<HTMLDivElement>(null);
	const [gaps, setGaps] = useState({ top: 64, bottom: 148 });
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
	}, [remeasure]);
	const panelVars = { '--gt': `${gaps.top}px`, '--gb': `${gaps.bottom}px` } as CSSProperties;
	return { barEl, timelineEl, gaps, panelVars };
}

/** the round GodEye mark + title used by the top card */
export function GodEyeBrand({ subtitle, children }: { subtitle: string; children?: ReactNode }) {
	return (
		<>
			<div className="h-6 w-6 shrink-0 rounded-full bg-[radial-gradient(circle,#0c0c0c_0_22%,#f16325_23%_55%,transparent_56%)] ring-2 ring-usdu-orange/30" />
			<div className="leading-tight">
				<div className="text-[13px] font-bold tracking-[0.18em]">GODEYE</div>
				<div className="whitespace-nowrap text-[10px] text-text-muted">{subtitle}</div>
			</div>
			{children}
		</>
	);
}

/** phones: compact bar at the bottom, a tap opens the full details sheet */
export function MobileDetailBar({
	color,
	title,
	sub,
	style,
	onOpen,
	onClose,
}: {
	color: string;
	title: string;
	sub?: string;
	style?: CSSProperties;
	onOpen: () => void;
	/** omit when there is nothing to deselect */
	onClose?: () => void;
}) {
	return (
		<button
			onClick={onOpen}
			style={style}
			className={`${GLASS} absolute bottom-[var(--gb)] left-3 right-3 z-10 flex items-center gap-2.5 px-3.5 py-2.5 text-left`}
		>
			<Dot color={color} size={9} />
			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-semibold">{title}</span>
				{sub && <span className="block text-[11px] text-text-muted">{sub}</span>}
			</span>
			<span className="rounded-lg border border-usdu-orange/50 bg-usdu-orange/10 px-2.5 py-1 text-xs">Details ▲</span>
			{onClose && (
				<span
					role="button"
					aria-label="Deselect"
					onClick={(e) => {
						e.stopPropagation();
						onClose();
					}}
					className="px-1 text-text-muted"
				>
					✕
				</span>
			)}
		</button>
	);
}

/** right hand details panel; a bottom sheet on phones */
export const DETAIL_PANEL =
	'absolute bottom-[var(--gb)] right-3 top-[var(--gt)] z-10 w-[340px] max-w-[calc(100%-24px)] max-md:top-auto max-md:h-[46%]';
