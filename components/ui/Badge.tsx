interface BadgeProps {
	text: string;
	variant?: 'risk' | 'custom';
	riskLevel?: 'low' | 'medium' | 'high';
	customColor?: string;
	customBgColor?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

const RISK_COLORS: Record<string, string> = {
	low: 'text-success bg-success-bg',
	medium: 'text-yellow-400 bg-yellow-400/20',
	high: 'text-error bg-error-bg',
};

const SIZES: Record<string, string> = {
	sm: 'px-1 py-0 text-xs',
	md: 'px-2 py-1 text-sm',
	lg: 'px-4 py-2 text-base',
};

export function Badge({
	text,
	variant = 'risk',
	riskLevel,
	customColor,
	customBgColor,
	size = 'sm',
	className = '',
}: BadgeProps) {
	const color =
		variant === 'custom' && customColor && customBgColor
			? `${customColor} ${customBgColor}`
			: variant === 'risk' && riskLevel
				? (RISK_COLORS[riskLevel] ?? 'text-text-secondary bg-surface')
				: 'text-text-secondary bg-surface';

	return (
		<span
			className={`inline-flex items-center justify-center rounded-lg font-medium border border-transparent ${SIZES[size] ?? SIZES.sm} ${color} ${className}`}
		>
			{text}
		</span>
	);
}
