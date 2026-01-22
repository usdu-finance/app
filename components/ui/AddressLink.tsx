import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { getBlockExplorerUrl } from '@/lib/web3/config';
import { formatAddress } from '@/lib/utils';
import Link from 'next/link';

interface AddressLinkProps {
	/** The address to display and link to */
	address: string;
	/** Type of address for block explorer (address, tx, block, etc.) */
	type?: 'address' | 'tx' | 'block';
	/** Chain ID for block explorer link */
	chainId?: number;
	/** Custom display text (if not provided, will shorten address) */
	displayText?: string;
	/** Additional CSS classes */
	className?: string;
	/** Hide the external link icon */
	hideIcon?: boolean;
}

/**
 * Inline address link component for use in tables, cards, etc.
 * Shows shortened address with link to block explorer.
 */
export default function AddressLink({
	address,
	type = 'address',
	chainId,
	displayText,
	className = '',
	hideIcon = false,
}: AddressLinkProps) {
	const explorerUrl = getBlockExplorerUrl(`${type}/${address}`, chainId);
	const display = displayText || formatAddress(address);

	return (
		<Link
			href={explorerUrl}
			target="_blank"
			rel="noopener noreferrer"
			className={`text-usdu-orange hover:text-usdu-orange/80 inline-flex items-center gap-1 font-mono ${className}`}
		>
			<span>{display}</span>
			{!hideIcon && <FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3 -mt-0.5" />}
		</Link>
	);
}
