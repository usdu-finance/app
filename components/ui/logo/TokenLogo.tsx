import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { useTokenLogo } from '@/hooks/ui/useTokenLogo';

interface TokenLogoProps {
	logoURI?: string;
	currency?: string;
	size?: number;
	className?: string;
}

export function TokenLogo({ logoURI, currency, size = 8, className = '' }: TokenLogoProps) {
	const [failed, setFailed] = useState(false);
	const src = useTokenLogo(currency, logoURI);

	useEffect(() => {
		setFailed(false);
	}, [src]);

	if (!src || failed) {
		return (
			<FontAwesomeIcon
				icon={faCircleQuestion}
				className={`w-${size} h-${size} text-text-secondary ${className}`}
			/>
		);
	}

	return (
		<img
			src={src}
			width={size * 4}
			height={size * 4}
			className={`w-${size} h-${size} rounded-full object-cover ${className}`}
			alt={currency ?? 'token'}
			onError={() => setFailed(true)}
		/>
	);
}
