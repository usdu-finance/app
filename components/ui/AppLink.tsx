import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

interface AppLinkProps {
	/** Destination: absolute URLs open in a new tab, anything else is an internal route */
	href: string;
	/** Link text */
	children: React.ReactNode;
	/** Force external (new tab) or internal behaviour instead of detecting it from `href` */
	external?: boolean;
	/** Hide the external link icon */
	hideIcon?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Generic inline link. External URLs open in a new tab with an icon, internal routes use client-side navigation.
 * Use AddressLink for block explorer links to addresses.
 */
export default function AppLink({ href, children, external, hideIcon = false, className = '' }: AppLinkProps) {
	const isExternal = external ?? /^https?:\/\//i.test(href);

	return (
		<Link
			href={href}
			{...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
			className={`text-usdu-orange hover:text-usdu-orange/80 inline-flex items-center gap-1 ${className}`}
		>
			<span>{children}</span>
			{isExternal && !hideIcon && <FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3 -mt-0.5" />}
		</Link>
	);
}
