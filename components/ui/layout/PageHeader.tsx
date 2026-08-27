import { ReactNode, Fragment } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
	label: string;
	href?: string;
	onClick?: () => void;
}

interface PageHeaderProps {
	title: string;
	description?: string;
	icon?: IconDefinition;
	badge?: { text: string; variant: 'success' | 'warning' | 'info' | 'error' };
	actions?: ReactNode;
	breadcrumbs?: BreadcrumbItem[];
	className?: string;
	userInfo?: ReactNode;
}

const BADGE_VARIANTS = {
	success: 'bg-success-bg text-success',
	warning: 'bg-yellow-400/20 text-yellow-400',
	info: 'bg-info/20 text-info',
	error: 'bg-error-bg text-error',
};

export function PageHeader({
	title,
	description,
	icon,
	badge,
	actions,
	breadcrumbs,
	className,
	userInfo,
}: PageHeaderProps) {
	return (
		<div className={cn('space-y-4', className)}>
			{breadcrumbs && breadcrumbs.length > 0 && (
				<nav className="flex items-center gap-2 text-sm">
					{breadcrumbs.map((item, index) => (
						<Fragment key={index}>
							{index > 0 && (
								<FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 text-text-secondary" />
							)}
							{item.href ? (
								<Link
									href={item.href}
									className="text-text-secondary hover:text-brand transition-colors"
								>
									{item.label}
								</Link>
							) : item.onClick ? (
								<button
									onClick={item.onClick}
									className="text-text-secondary hover:text-brand transition-colors"
								>
									{item.label}
								</button>
							) : (
								<span className="text-text-primary font-medium">{item.label}</span>
							)}
						</Fragment>
					))}
				</nav>
			)}

			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-3 mb-2">
						{icon && <FontAwesomeIcon icon={icon} className="text-brand text-3xl flex-shrink-0" />}
						<h1 className="text-3xl font-bold text-text-primary min-w-0 break-words">{title}</h1>
						{badge && (
							<div
								className={cn(
									'px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap',
									BADGE_VARIANTS[badge.variant]
								)}
							>
								{badge.text}
							</div>
						)}
						{userInfo && <div className="flex items-center">{userInfo}</div>}
					</div>
					{description && <p className="text-text-secondary leading-relaxed">{description}</p>}
				</div>
				{actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
			</div>
		</div>
	);
}

export default PageHeader;
