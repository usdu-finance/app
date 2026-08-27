import React from 'react';

interface HeroStep {
	icon: React.ReactNode;
	title: string;
	description: string;
}

interface Props {
	steps: HeroStep[];
	className?: string;
}

const GRID_COLS: Record<number, string> = {
	1: 'md:grid-cols-1',
	2: 'md:grid-cols-2',
	3: 'md:grid-cols-3',
	4: 'md:grid-cols-4',
};

export default function HeroSteps({ steps, className }: Props) {
	return (
		<div className={`grid grid-cols-1 ${GRID_COLS[steps.length] ?? 'md:grid-cols-3'} gap-4 ${className ?? ''}`}>
			{steps.map((step, i) => (
				<div key={i} className="flex items-start gap-4 bg-card rounded-lg p-4 border border-surface">
					<div className="flex-shrink-0 w-6 h-6 rounded-full bg-text-primary text-base flex items-center justify-center text-sm font-bold">
						{step.icon}
					</div>
					<div className="flex flex-col gap-1">
						<span className="font-bold text-text-primary">{step.title}</span>
						<span className="text-sm text-text-secondary">{step.description}</span>
					</div>
				</div>
			))}
		</div>
	);
}
