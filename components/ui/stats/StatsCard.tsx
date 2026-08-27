import React from 'react';

interface StatItem {
	value: string | number;
	label: string;
	color?: string;
}

interface StatsCardProps {
	stats: StatItem[];
	className?: string;
}

export default function StatsCard({ stats, className = '' }: StatsCardProps) {
	// Determine grid columns class based on number of stats
	const getGridColsClass = () => {
		switch (stats.length) {
			case 1:
				return 'md:grid-cols-1';
			case 2:
				return 'md:grid-cols-2';
			case 3:
				return 'md:grid-cols-3';
			case 4:
			default:
				return 'md:grid-cols-4';
		}
	};

	return (
		<div className={`bg-usdu-black rounded-2xl p-8 ${className}`}>
			<div className={`grid grid-cols-2 ${getGridColsClass()} gap-6 text-center`}>
				{stats.map((stat, index) => (
					<div key={index}>
						<div className={`text-2xl font-bold mb-2 ${stat.color || 'text-usdu-card'}`}>{stat.value}</div>
						<div className="text-sm text-usdu-card">{stat.label}</div>
					</div>
				))}
			</div>
		</div>
	);
}
