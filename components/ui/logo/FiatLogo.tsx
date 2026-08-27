import { FIAT_CURRENCY_SYMBOLS } from '@/lib/currencies';

interface FiatLogoProps {
	symbol: string;
	size?: number;
	className?: string;
}

export function FiatLogo({ symbol, size = 4, className = '' }: FiatLogoProps) {
	const upper = symbol.toUpperCase();
	const px = size * 4;

	return (
		<span
			style={{ width: px, height: px, fontSize: px * 0.45 }}
			className={`inline-flex items-center justify-center rounded-full bg-brand text-text-primary font-semibold shrink-0 ${className}`}
		>
			{FIAT_CURRENCY_SYMBOLS[upper as keyof typeof FIAT_CURRENCY_SYMBOLS] ?? upper.slice(0, 2)}
		</span>
	);
}
