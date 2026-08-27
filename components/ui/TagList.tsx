import { cn } from '@/lib/utils';

interface TagListProps {
	tags: string[];
	activeTags?: string[];
	align?: 'left' | 'right';
	className?: string;
}

// Full class-name strings kept as literals so Tailwind's scanner includes them.
const TAG_PALETTE = [
	{ bg: 'bg-info/10', text: 'text-info', border: 'border-info/20' },
	{ bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20' },
	{ bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
	{ bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-500/20' },
	{ bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
	{ bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20' },
	{ bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/20' },
	{ bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
];

function tagColor(tag: string) {
	let hash = 0;
	for (let i = 0; i < tag.length; i++) {
		hash = (hash * 31 + tag.charCodeAt(i)) & 0xffff;
	}
	return TAG_PALETTE[hash % TAG_PALETTE.length];
}

export function TagList({ tags, activeTags = [], align = 'right', className }: TagListProps) {
	if (tags.length === 0) {
		return <span className="text-xs text-text-secondary italic">—</span>;
	}

	return (
		<div
			className={cn(
				'flex flex-row flex-wrap gap-1.5',
				align === 'left' ? 'justify-start' : 'justify-end',
				className
			)}
		>
			{tags.map((tag) => {
				const active = activeTags.includes(tag);
				const { bg, text, border } = active
					? { bg: 'bg-brand/20', text: 'text-brand', border: 'border-brand/30' }
					: tagColor(tag);

				return (
					<span
						key={tag}
						className={cn(
							'inline-flex items-center rounded-lg px-1 text-xs font-medium border',
							bg,
							text,
							border
						)}
					>
						{tag}
					</span>
				);
			})}
		</div>
	);
}
