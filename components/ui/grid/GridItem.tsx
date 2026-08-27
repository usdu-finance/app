import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

interface GridItemAvatar {
	src?: string;
	label: string;
}

interface GridItemImage {
	src: string;
	alt: string;
}

interface Props {
	badge?: React.ReactNode;
	meta?: React.ReactNode;
	subtitle?: React.ReactNode;
	image?: GridItemImage;
	avatar?: GridItemAvatar;
	title: React.ReactNode;
	description?: React.ReactNode;
	footer?: React.ReactNode;
	onClick?: () => void;
	className?: string;
}

export default function GridItem({
	badge,
	meta,
	subtitle,
	image,
	avatar,
	title,
	description,
	footer,
	onClick,
	className,
}: Props) {
	return (
		<div
			className={cn(
				'group flex bg-card rounded-lg border border-table-alt shadow-card transition-all duration-300',
				onClick && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5',
				className
			)}
			onClick={onClick}
		>
			<div className="flex flex-1 flex-col justify-between p-4 min-w-0">
				<div>
					{(badge || meta) && (
						<div className="flex items-center justify-between gap-2">
							{badge && <div className="min-w-0">{badge}</div>}
							{meta && (
								<span className="text-xs text-text-secondary whitespace-nowrap flex-shrink-0">
									{meta}
								</span>
							)}
						</div>
					)}
					{subtitle && <div className="mt-1 text-xs text-text-secondary truncate">{subtitle}</div>}
					<h3 className="mt-3 font-semibold text-text-primary line-clamp-2">{title}</h3>
					{description && <p className="mt-2 text-sm text-text-secondary line-clamp-2">{description}</p>}
				</div>

				{footer && <div className="mt-4">{footer}</div>}
			</div>

			{image && (
				<div className="relative w-20 sm:w-28 md:w-32 flex-shrink-0 rounded-r-lg overflow-hidden">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={image.src} alt={image.alt} className="h-full w-full object-cover" />

					{avatar && (
						<div
							title={avatar.label}
							className="absolute top-2 right-2 h-7 w-7 rounded-full border-2 border-card bg-surface overflow-hidden flex items-center justify-center"
						>
							{avatar.src ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img src={avatar.src} alt={avatar.label} className="h-full w-full object-cover" />
							) : (
								<FontAwesomeIcon icon={faCircleUser} className="w-4 h-4 text-text-secondary" />
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
