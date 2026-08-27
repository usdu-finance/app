interface Props {
	title: string;
	className?: string;
}

export function CardTitle({ title, className = '' }: Props) {
	return (
		<p className={`text-xs font-semibold uppercase tracking-wider text-text-secondary pb-4 ${className}`}>
			{title}
		</p>
	);
}

export default CardTitle;
