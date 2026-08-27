interface DetailRowProps {
	label: string;
	value?: string;
	mono?: boolean;
	children?: React.ReactNode;
}

export function DetailRow({ label, value, mono, children }: DetailRowProps) {
	return (
		<div className="flex items-start justify-between gap-4 py-1 border-b border-table-alt last:border-0">
			<span className="text-text-muted shrink-0">{label}</span>
			{children ?? <span className={`text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>}
		</div>
	);
}
