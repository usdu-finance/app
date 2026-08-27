import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { cn } from '@/lib/utils';
import { StatCard, StatCardSkeleton } from './StatCard';

interface StatItem {
	icon: IconDefinition;
	label: string;
	value: string | number;
	trend?: { value: number; direction: 'up' | 'down'; label?: string };
	color?: 'orange' | 'green' | 'blue' | 'purple' | 'yellow';
	loading?: boolean;
}

interface StatGridProps {
	stats: StatItem[];
	columns?: { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
	loading?: boolean;
	className?: string;
}

function getGridClasses(columns: StatGridProps['columns'] = {}) {
	const { base = 1, sm, md, lg, xl } = columns;
	return cn(
		'grid gap-6',
		`grid-cols-${base}`,
		sm && `sm:grid-cols-${sm}`,
		md && `md:grid-cols-${md}`,
		lg && `lg:grid-cols-${lg}`,
		xl && `xl:grid-cols-${xl}`
	);
}

export function StatGrid({ stats, columns = { base: 1, md: 2, lg: 4 }, loading = false, className }: StatGridProps) {
	if (loading) {
		const count = columns.lg ?? columns.md ?? columns.sm ?? columns.base ?? 4;
		return (
			<div className={cn(getGridClasses(columns), className)}>
				{Array.from({ length: count }, (_, i) => (
					<StatCardSkeleton key={i} />
				))}
			</div>
		);
	}

	if (!stats || stats.length === 0) {
		return (
			<div className={cn('text-center py-8', className)}>
				<p className="text-text-secondary">No statistics available</p>
			</div>
		);
	}

	return (
		<div className={cn(getGridClasses(columns), className)}>
			{stats.map((stat, i) => (
				<StatCard key={`${stat.label}-${i}`} {...stat} />
			))}
		</div>
	);
}

export default StatGrid;
