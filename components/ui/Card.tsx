import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const VARIANTS = {
	default: 'bg-card rounded-lg p-4',
	// grey bordered panel used to group tables and content on dashboard pages
	panel: 'bg-usdu-bg border border-usdu-surface rounded-xl p-6',
};

interface CardProps {
	children: ReactNode;
	className?: string;
	variant?: keyof typeof VARIANTS;
	hover?: boolean;
	gradient?: boolean;
}

export default function Card({ children, className, variant = 'default', hover = false, gradient = false }: CardProps) {
	return (
		<div
			className={cn(
				VARIANTS[variant],
				'transition-all duration-300',
				hover && 'hover:shadow-card-hover hover:-translate-y-1',
				gradient && 'bg-gradient-card',
				className
			)}
		>
			{children}
		</div>
	);
}
