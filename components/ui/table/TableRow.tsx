import React from 'react';

interface Props {
	children: React.ReactNode | React.ReactNode[];
	actionCol?: React.ReactElement;
	colSpan?: number;
	className?: string;
	classNameMobile?: string;
	headers?: string[];
	subHeaders?: string[];
	tab?: string;
	noFirstHeader?: boolean;
	paddingY?: string;
	onClick?: () => void;
}

export default function TableRow({
	colSpan,
	children,
	actionCol,
	headers = [],
	subHeaders = [],
	tab = '',
	className,
	classNameMobile = '',
	noFirstHeader = false,
	paddingY,
	onClick,
}: Props) {
	const childArray = React.Children.toArray(children) as React.ReactElement[];

	return (
		<div
			className={`${className ?? ''} ${
				paddingY ?? 'py-1'
			} bg-card md:hover:bg-surface p-4 xl:px-6 border-t border-table-alt last:rounded-b-lg duration-300 ${
				onClick ? 'cursor-pointer' : 'cursor-default'
			}`}
			onClick={onClick}
		>
			<div className="flex flex-col justify-between gap-y-5 md:flex-row">
				{/* Desktop */}
				<div
					className="max-md:hidden grid flex-grow items-center py-2"
					style={{ gridTemplateColumns: `repeat(${colSpan || childArray.length}, minmax(0, 1fr))` }}
				>
					{childArray.map((child, idx) => (
						<div
							key={child.key ?? `row-desktop-${idx}`}
							className={`${idx > 0 ? 'text-right' : 'text-left'} ${
								headers[idx] === tab ? 'text-text-primary font-semibold' : 'text-text-secondary'
							}`}
						>
							{child}
						</div>
					))}
				</div>

				{/* Mobile */}
				<TableRowMobile
					headers={headers}
					subHeaders={subHeaders}
					tab={tab}
					className={classNameMobile}
					noFirstHeader={noFirstHeader}
				>
					{childArray}
				</TableRowMobile>

				{/* Action column */}
				{actionCol && (
					<div className="flex-shrink-0 md:w-[8rem] md:ml-[2rem] max-md:w-full mb-2">{actionCol}</div>
				)}
			</div>
		</div>
	);
}

interface TableRowMobileProps {
	children: React.ReactElement[];
	headers: string[];
	subHeaders: string[];
	tab: string;
	className: string;
	noFirstHeader: boolean;
}

function TableRowMobile({ children, noFirstHeader, headers, subHeaders, tab, className }: TableRowMobileProps) {
	if (headers.length === 0) {
		return (
			<div className={`${className} md:hidden justify-items-center text-center gap-6 grid flex-grow grid-cols-1`}>
				{children}
			</div>
		);
	}

	return (
		<div className={`${className} md:hidden grid-cols-1 flex-1 py-2`}>
			{children.map((c, idx) => (
				<div className="flex items-center" key={c.key ?? `row-mobile-${tab}-${idx}`}>
					<div className="flex-1 text-left">
						{idx === 0 && noFirstHeader ? (
							<div
								className={
									headers[idx] === tab ? 'text-text-primary font-semibold' : 'text-text-secondary'
								}
							>
								{c}
							</div>
						) : subHeaders.length === 0 ? (
							<div
								className={`text-md ${headers[idx] === tab ? 'text-text-primary font-semibold' : 'text-text-secondary'}`}
							>
								{headers[idx]}
							</div>
						) : (
							<div>
								<div
									className={`text-md ${
										headers[idx] === tab ? 'text-text-primary font-semibold' : 'text-text-secondary'
									}`}
								>
									{headers[idx]}
								</div>
								<div className="text-sm text-text-secondary">{subHeaders[idx]}</div>
							</div>
						)}
					</div>
					<div
						className={`text-right ${headers[idx] === tab ? 'text-text-primary font-semibold' : 'text-text-secondary'}`}
					>
						{idx === 0 && noFirstHeader ? '' : c}
					</div>
				</div>
			))}
		</div>
	);
}
