import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Scroll-in entrance used by every landing block. Reduced motion is handled by MotionConfig on the page. */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 24 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-60px' }}
			transition={{ duration: 0.55, delay }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

export function SectionHead({
	eyebrow,
	title,
	description,
	dark = false,
	className,
}: {
	eyebrow: string;
	title: string;
	description?: string;
	dark?: boolean;
	className?: string;
}) {
	return (
		<Reveal className={cn('max-w-3xl mb-10 md:mb-14', className)}>
			<p className="text-sm font-semibold uppercase tracking-widest text-usdu-orange mb-3">{eyebrow}</p>
			<h2 className={cn('text-3xl md:text-5xl font-bold tracking-tight', dark ? 'text-white' : 'text-usdu-black')}>{title}</h2>
			{description && (
				<p className={cn('mt-4 text-lg leading-relaxed', dark ? 'text-white/70' : 'text-text-secondary')}>{description}</p>
			)}
		</Reveal>
	);
}

/** Pulsing placeholder shown while a live figure loads. */
export function Skeleton({ className, dark = false }: { className?: string; dark?: boolean }) {
	return <span className={cn('block animate-pulse rounded', dark ? 'bg-white/15' : 'bg-usdu-surface', className)} />;
}

export const SECTION = 'px-4 md:px-8 lg:px-16 py-16 md:py-24';
export const INNER = 'mx-auto w-full max-w-[1400px]';
