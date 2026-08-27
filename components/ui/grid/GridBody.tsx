import React from 'react';

interface Props {
	children: React.ReactElement | React.ReactElement[];
}

export default function GridBody({ children }: Props) {
	return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">{children}</div>;
}
