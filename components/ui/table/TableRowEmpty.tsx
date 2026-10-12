import React from 'react';

interface Props {
	children: React.ReactElement | string;
}

export default function TableRowEmpty({ children }: Props) {
	return (
		<div className="bg-usdu-bg md:hover:bg-surface px-2 py-3 border-t border-table-alt rounded-lg duration-300">
			<div className="flex flex-col text-text-secondary justify-between gap-y-5 md:flex-row md:space-x-4">
				{children}
			</div>
		</div>
	);
}
