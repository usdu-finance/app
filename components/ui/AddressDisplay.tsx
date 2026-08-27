import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

interface AddressDisplayProps {
	address: string;
	/** Characters to show at the start. Default 6. */
	prefixLength?: number;
	/** Characters to show at the end. Default 4. */
	suffixLength?: number;
	/** Copy the full address (default) or a custom value. */
	copyValue?: string;
	/** Extra classes on the wrapper. */
	className?: string;
	/** Show the copy icon. Default true. */
	showCopy?: boolean;
}

export function AddressDisplay({
	address,
	prefixLength = 6,
	suffixLength = 4,
	copyValue,
	className = '',
	showCopy = true,
}: AddressDisplayProps) {
	const [copied, setCopied] = useState(false);

	const short =
		address.length > prefixLength + suffixLength + 3
			? `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`
			: address;

	const handleCopy = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			navigator.clipboard.writeText(copyValue ?? address).then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			});
		},
		[address, copyValue]
	);

	return (
		<span className={`inline-flex items-center gap-1.5 font-mono text-sm ${className}`} title={address}>
			{short}
			{showCopy && (
				<button
					onClick={handleCopy}
					className="text-text-muted hover:text-brand transition-colors focus:outline-none"
					aria-label="Copy address"
				>
					<FontAwesomeIcon
						icon={copied ? faCheckCircle : faCopy}
						className={`text-xs ${copied ? 'text-success' : ''}`}
					/>
				</button>
			)}
		</span>
	);
}
