import { Fragment } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faHome } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
	label: string;
	href?: string;
	onClick?: () => void;
}

interface BreadcrumbProps {
	items: BreadcrumbItem[];
	className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
	if (!items || items.length === 0) return null;

	return (
		<nav className={cn('flex items-center gap-2 text-sm', className)} aria-label="Breadcrumb">
			{items[0]?.href && (
				<>
					<Link
						href="/"
						className="text-text-secondary hover:text-brand transition-colors p-1 rounded"
						aria-label="Home"
					>
						<FontAwesomeIcon icon={faHome} className="w-4 h-4" />
					</Link>
					<FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 text-text-secondary" />
				</>
			)}

			{items.map((item, index) => (
				<Fragment key={index}>
					{index > 0 && <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 text-text-secondary" />}
					{index === items.length - 1 ? (
						<span className="text-text-primary font-medium px-1 py-0.5 rounded" aria-current="page">
							{item.label}
						</span>
					) : item.href ? (
						<Link
							href={item.href}
							className="text-text-secondary hover:text-brand transition-colors px-1 py-0.5 rounded hover:bg-surface/30"
						>
							{item.label}
						</Link>
					) : item.onClick ? (
						<button
							onClick={item.onClick}
							className="text-text-secondary hover:text-brand transition-colors px-1 py-0.5 rounded hover:bg-surface/30"
						>
							{item.label}
						</button>
					) : (
						<span className="text-text-secondary px-1 py-0.5">{item.label}</span>
					)}
				</Fragment>
			))}
		</nav>
	);
}

export default Breadcrumb;
