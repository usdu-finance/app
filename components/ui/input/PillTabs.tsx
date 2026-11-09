import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PillTabOption<T extends string> {
	value: T;
	label: ReactNode;
	/** Count bubble, hidden when 0. */
	badge?: number;
	/** Highlights the bubble in the brand color. */
	highlight?: boolean;
}

interface PillTabsProps<T extends string> {
	options: PillTabOption<T>[];
	value: T;
	onChange: (value: T) => void;
	className?: string;
	/** Blurs and locks the control, e.g. when it has no effect on the current view. */
	disabled?: boolean;
}

/** Segmented control with the active option raised on a white chip. */
export default function PillTabs<T extends string>({ options, value, onChange, className, disabled }: PillTabsProps<T>) {
	return (
		<div
			aria-disabled={disabled}
			className={cn(
				'flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-usdu-surface bg-usdu-bg p-1 transition-all duration-300 md:w-auto',
				disabled && 'pointer-events-none select-none opacity-50 blur-[2px]',
				className
			)}
		>
			{options.map((o) => (
				<button
					key={o.value}
					onClick={() => onChange(o.value)}
					tabIndex={disabled ? -1 : undefined}
					className={cn(
						'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all md:flex-none',
						o.value === value ? 'bg-usdu-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
					)}
				>
					{o.label}
					{!!o.badge && (
						<span
							className={cn(
								'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-none',
								o.highlight ? 'bg-brand text-white' : 'bg-usdu-surface text-text-primary'
							)}
						>
							{o.badge}
						</span>
					)}
				</button>
			))}
		</div>
	);
}
