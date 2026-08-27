import { ReactNode } from 'react';

interface Props {
	title?: string;
	subtitle?: string;
	children?: ReactNode;
}

export function PageTitle({ title, subtitle, children }: Props) {
	return (
		<div>
			{title && <h2 className="text-xl font-bold text-text-primary">{title}</h2>}
			{subtitle && (
				<p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mt-1">{subtitle}</p>
			)}
			{children}
		</div>
	);
}

export default PageTitle;
