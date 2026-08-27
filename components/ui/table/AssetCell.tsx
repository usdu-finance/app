interface AssetCellProps {
	logo: React.ReactNode;
	symbol: string;
	amount: string;
	align?: 'left' | 'right';
}

export function AssetCell({ logo, symbol, amount, align = 'right' }: AssetCellProps) {
	const justifyClass = align === 'right' ? 'justify-end' : 'justify-start';
	return (
		<div className={`flex items-center gap-1.5 ${justifyClass}`}>
			{logo}
			<span className="font-mono text-sm">{amount}</span>
			<span className="text-sm">{symbol}</span>
		</div>
	);
}
