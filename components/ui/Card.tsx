import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
	children: ReactNode;
	className?: string;
	hover?: boolean;
	gradient?: boolean;
}

export default function Card({ children, className, hover = false, gradient = false }: CardProps) {
	return (
		<div
			className={cn(
				'bg-card rounded-lg p-4 transition-all duration-300',
				hover && 'hover:shadow-card-hover hover:-translate-y-1',
				gradient && 'bg-gradient-card',
				className
			)}
		>
			{children}
		</div>
	);
}
