import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { cn } from '@/lib/utils';
import Card from '@/components/ui/Card';

interface StatCardProps {
	icon: IconDefinition;
	label: string;
	value: string | number;
	trend?: {
		value: number;
		direction: 'up' | 'down';
		label?: string;
	};
	color?: 'orange' | 'green' | 'blue' | 'purple' | 'yellow';
	loading?: boolean;
	className?: string;
	onClick?: () => void;
}

const COLOR_VARIANTS = {
	orange: 'text-brand bg-brand/20',
	green: 'text-success bg-success-bg',
	blue: 'text-info bg-info/20',
	purple: 'text-purple-400 bg-purple-400/20',
	yellow: 'text-yellow-400 bg-yellow-400/20',
};

const TREND_COLORS = {
	up: 'text-success',
	down: 'text-error',
};

function formatValue(val: string | number): string {
	if (typeof val === 'number') {
		if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
		if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
		if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
		return val.toString();
	}
	return val;
}

export function StatCardSkeleton({ className }: { className?: string }) {
	return (
		<Card className={cn('animate-pulse', className)}>
			<div className="flex items-center justify-between">
				<div className="flex-1">
					<div className="w-20 h-4 bg-surface/30 rounded mb-2"></div>
					<div className="w-16 h-8 bg-surface/30 rounded"></div>
				</div>
				<div className="w-12 h-12 bg-surface/30 rounded-lg flex-shrink-0"></div>
			</div>
		</Card>
	);
}

export function StatCard({
	icon,
	label,
	value,
	trend,
	color = 'orange',
	loading = false,
	className,
	onClick,
}: StatCardProps) {
	if (loading) return <StatCardSkeleton className={className} />;

	const cardContent = (
		<div className="flex items-center justify-between">
			<div className="flex-1">
				<p className="text-text-secondary text-sm font-medium mb-1">{label}</p>
				<div>
					<p className="text-3xl font-bold text-text-primary mb-1">{formatValue(value)}</p>
					{trend && (
						<div
							className={cn('flex items-center gap-1 text-sm font-medium', TREND_COLORS[trend.direction])}
						>
							<FontAwesomeIcon
								icon={trend.direction === 'up' ? faArrowUp : faArrowDown}
								className="w-3 h-3"
							/>
							<span>{Math.abs(trend.value)}%</span>
							{trend.label && <span className="text-text-secondary ml-1">{trend.label}</span>}
						</div>
					)}
				</div>
			</div>
			<div
				className={cn(
					'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
					COLOR_VARIANTS[color]
				)}
			>
				<FontAwesomeIcon icon={icon} className="w-6 h-6" />
			</div>
		</div>
	);

	if (onClick) {
		return (
			<div
				className={cn('cursor-pointer', className)}
				onClick={onClick}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onClick();
					}
				}}
			>
				<Card>{cardContent}</Card>
			</div>
		);
	}

	return <Card className={className}>{cardContent}</Card>;
}

export default StatCard;
