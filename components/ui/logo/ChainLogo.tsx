import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';

interface ChainLogoProps {
	chain?: string;
	size?: number;
	className?: string;
}

export function ChainLogo({ chain, size = 6, className = '' }: ChainLogoProps) {
	const [failed, setFailed] = useState(false);

	if (!chain || failed) {
		return (
			<FontAwesomeIcon
				icon={faCircleQuestion}
				className={`w-${size} h-${size} text-text-secondary ${className}`}
			/>
		);
	}

	return (
		<Image
			src={`/chain/${chain.toLowerCase()}.svg`}
			width={size * 4}
			height={size * 4}
			className={`w-${size} h-${size} rounded-full ${className}`}
			alt={chain}
			onError={() => setFailed(true)}
		/>
	);
}
