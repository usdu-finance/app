import { ReactNode } from 'react';

export const GLASS = 'bg-white/80 backdrop-blur-xl border border-black/10 rounded-2xl text-usdu-black';

export function Glass({ className = '', children }: { className?: string; children: ReactNode }) {
	return <div className={`${GLASS} ${className}`}>{children}</div>;
}

export function Seg<T extends string>({
	value,
	options,
	onChange,
	disabled,
}: {
	value: T;
	options: { value: T; label: string }[];
	onChange: (v: T) => void;
	disabled?: boolean;
}) {
	return (
		<div className={`inline-flex rounded-lg bg-black/5 p-0.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
			{options.map((o) => (
				<button
					key={o.value}
					onClick={() => onChange(o.value)}
					className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
						value === o.value
							? 'bg-usdu-orange/20 text-usdu-black ring-1 ring-usdu-orange/40'
							: 'text-text-muted hover:text-usdu-black'
					}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

export function IconButton({
	onClick,
	active,
	children,
	title,
}: {
	onClick: () => void;
	active?: boolean;
	children: ReactNode;
	title?: string;
}) {
	return (
		<button
			onClick={onClick}
			title={title}
			className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
				active
					? 'bg-usdu-orange/20 border-usdu-orange/50 text-usdu-black'
					: 'bg-black/5 border-black/10 text-text-secondary hover:bg-black/10 hover:border-black/15'
			}`}
		>
			{children}
		</button>
	);
}

export function StatCard({
	label,
	value,
	sub,
	valueClass = '',
}: {
	label: string;
	value: ReactNode;
	sub?: ReactNode;
	valueClass?: string;
}) {
	return (
		<div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
			<div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
			<div className={`text-lg font-semibold tabular-nums ${valueClass}`}>{value}</div>
			{sub && <div className="text-[10px] text-text-muted">{sub}</div>}
		</div>
	);
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
	return (
		<div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
			<span>{children}</span>
			{right && <span className="normal-case tracking-normal font-normal">{right}</span>}
		</div>
	);
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
	return (
		<span
			className="inline-block shrink-0 rounded-full"
			style={{ width: size, height: size, background: color, boxShadow: `0 0 8px ${color}` }}
		/>
	);
}
