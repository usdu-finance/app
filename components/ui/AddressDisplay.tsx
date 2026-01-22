import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { copyToClipboard, formatAddress } from '@/lib/utils';
import { getBlockExplorerUrl } from '@/lib/web3/config';
import Link from 'next/link';

interface AddressDisplayProps {
	/** Label/title for the address */
	label: string;
	/** The address to display */
	address: string;
	/** Type of address for block explorer (address, tx, block, etc.) */
	type?: 'address' | 'tx' | 'block';
	/** Chain ID for block explorer link */
	chainId?: number;
	/** Whether to shorten the address display */
	shorten?: boolean;
	/** Additional CSS classes for container */
	className?: string;
	/** Hide the copy button */
	hideCopy?: boolean;
	/** Hide the external link */
	hideExplorer?: boolean;
}

export default function AddressDisplay({
	label,
	address,
	type = 'address',
	chainId,
	shorten = true,
	className = '',
	hideCopy = false,
	hideExplorer = false,
}: AddressDisplayProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		const success = await copyToClipboard(address);
		if (success) {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const explorerUrl = getBlockExplorerUrl(`${type}/${address}`, chainId);

	// Use custom shortened or full address
	const displayAddress = shorten ? formatAddress(address) : address;

	return (
		<div className={`bg-gray-50 p-3 rounded-lg ${className}`}>
			<p className="text-sm text-text-secondary mb-2">{label}</p>
			<div className="flex items-center justify-between gap-2">
				<p className="font-mono text-xs text-usdu-black break-all flex-1">{displayAddress}</p>
				<div className="flex items-center gap-1 flex-shrink-0">
					{!hideExplorer && (
						<Link
							href={explorerUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="p-2 hover:bg-white rounded transition-colors"
							title="View on block explorer"
						>
							<FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3 text-usdu-orange" />
						</Link>
					)}
					{!hideCopy && (
						<button
							onClick={handleCopy}
							className="p-2 hover:bg-white rounded transition-colors"
							title="Copy address"
						>
							<FontAwesomeIcon
								icon={copied ? faCheck : faCopy}
								className={`w-3 h-3 ${copied ? 'text-green-600' : 'text-usdu-orange'}`}
							/>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
