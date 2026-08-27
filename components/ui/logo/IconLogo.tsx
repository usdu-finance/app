import React from 'react';

interface IconLogoProps {
	icon: React.ReactNode;
	size?: number;
	className?: string;
}

export function IconLogo({ icon, size = 8, className = '' }: IconLogoProps) {
	return (
		<div
			style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
			className={`flex-shrink-0 rounded-full bg-card flex items-center justify-center ${className}`}
		>
			{icon}
		</div>
	);
}
