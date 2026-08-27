import React from 'react';

interface Props {
	children: React.ReactElement | string;
}

export default function GridItemEmpty({ children }: Props) {
	return (
		<div className="col-span-full rounded-lg border border-dashed border-table-alt bg-card p-8 text-center text-text-secondary">
			{children}
		</div>
	);
}
