import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Card from '@/components/ui/Card';

interface SectionProps {
	title?: string;
	description?: string;
	children: ReactNode;
	/** 'default' = children rendered directly, 'card' = wrapped in a Card, 'filled' = subtle bg */
	variant?: 'default' | 'card' | 'filled';
	/** Controls gap between header and content (and between children when spacing is inherited) */
	spacing?: 'sm' | 'md' | 'lg';
	/** Vertical padding on the section element — useful for filled/card variants or page sections that need breathing room */
	padding?: 'none' | 'sm' | 'md' | 'lg';
	/**
	 * 'md' (default) — bold h2, `text-xl font-bold text-text-primary` — for major page sections
	 * 'sm' — compact uppercase label, `text-xs font-semibold uppercase tracking-wider` — for
	 *         sub-sections within a page (equivalent to CardTitle but outside a Card)
	 */
	titleSize?: 'sm' | 'md';
	className?: string;
	/** Right-aligned actions (buttons, filters…) */
	actions?: ReactNode;
	/** Right-aligned secondary hint text — sits alongside actions */
	hint?: ReactNode;
}

const SPACING = { sm: 'space-y-4', md: 'space-y-6', lg: 'space-y-8' };
const PADDING = { none: '', sm: 'py-4', md: 'py-6', lg: 'py-8' };

export function Section({
	title,
	description,
	children,
	variant = 'default',
	spacing = 'md',
	titleSize = 'md',
	padding = 'md',
	className,
	actions,
	hint,
}: SectionProps) {
	const hasHeader = title || description || actions || hint;

	return (
		<section className={cn(SPACING[spacing], padding && PADDING[padding], className)}>
			{hasHeader && (
				<div className="flex items-center justify-between gap-4">
					<div className="flex-1 min-w-0">
						{title &&
							(titleSize === 'sm' ? (
								<p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
									{title}
								</p>
							) : (
								<h2 className="text-xl font-bold text-text-primary mb-1">{title}</h2>
							))}
						{description && titleSize === 'md' && (
							<p className="text-text-secondary text-sm">{description}</p>
						)}
					</div>
					{(actions || hint) && (
						<div className="flex items-center gap-3 flex-shrink-0">
							{hint && <span className="text-xs text-text-secondary">{hint}</span>}
							{actions}
						</div>
					)}
				</div>
			)}

			{variant === 'card' ? (
				<Card>{children}</Card>
			) : variant === 'filled' ? (
				<div className="bg-surface/30 rounded-lg p-6">{children}</div>
			) : (
				children
			)}
		</section>
	);
}

export default Section;
