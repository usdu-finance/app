import React from 'react';
import AppLink from '@/components/ui/AppLink';
import { getBlockExplorerUrl } from '@/lib/web3/config';
import { formatAddress } from '@/lib/utils';

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
 * Shows shortened address with link to block explorer, styled like AppLink.
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
		<AppLink href={explorerUrl} external hideIcon={hideIcon} className={className}>
			{display}
		</AppLink>
	);
}
