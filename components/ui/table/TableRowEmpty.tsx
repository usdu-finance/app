import React from 'react';

interface Props {
	children: React.ReactElement | string;
}

export default function TableRowEmpty({ children }: Props) {
	return (
		<div className="bg-card md:hover:bg-surface p-4 xl:px-6 border-t border-table-alt last:rounded-b-lg duration-300">
			<div className="flex flex-col text-text-secondary justify-between gap-y-5 md:flex-row md:space-x-4">
				{children}
			</div>
		</div>
	);
}
