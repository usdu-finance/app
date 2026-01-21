import { useState, ReactNode, Children, isValidElement } from 'react';

interface TabsProps {
	children: ReactNode;
	selectedIndex?: number;
	onSelectionChange?: (index: number) => void;
	className?: string;
}

interface TabProps {
	children: ReactNode;
	value?: string | number;
	className?: string;
}

export function Tab({ children, className = '' }: TabProps) {
	return <div className={className}>{children}</div>;
}

export default function Tabs({ children, selectedIndex, onSelectionChange, className = '' }: TabsProps) {
	const tabChildren = Children.toArray(children).filter((child) => isValidElement(child) && child.type === Tab);

	const [internalSelectedIndex, setInternalSelectedIndex] = useState<number>(
		selectedIndex !== undefined ? selectedIndex : 0
	);

	// Use controlled or uncontrolled mode
	const currentSelectedIndex = selectedIndex !== undefined ? selectedIndex : internalSelectedIndex;

	const handleTabClick = (index: number) => {
		if (selectedIndex === undefined) {
			setInternalSelectedIndex(index);
		}
		onSelectionChange?.(index);
	};

	if (tabChildren.length === 0) {
		return null;
	}

	return (
		<div className={`w-full ${className}`}>
			{/* Tabs grid container */}
			<div className="flex flex-wrap gap-3">
				{tabChildren.map((child, index) => {
					const isSelected = index === currentSelectedIndex;

					return (
						<button
							key={index}
							onClick={() => handleTabClick(index)}
							className={`
								px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200
								${
									isSelected
										? 'bg-usdu-orange text-white shadow-md'
										: 'bg-white text-usdu-black hover:bg-usdu-surface border border-usdu-surface'
								}
							`}
						>
							{isValidElement<TabProps>(child) ? child.props.children : child}
						</button>
					);
				})}
			</div>
		</div>
	);
}
