import { useState, ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface AccordionProps {
	title: string | ReactNode;
	children: ReactNode;
	defaultOpen?: boolean;
	className?: string;
}

export default function Accordion({ title, children, defaultOpen = false, className = '' }: AccordionProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<div className={`border border-usdu-surface rounded-lg overflow-hidden ${className}`}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full px-6 py-4 bg-usdu-surface hover:bg-usdu-orange/10 transition-colors flex items-center justify-between"
			>
				<div className="flex-1 text-left">{title}</div>
				<FontAwesomeIcon
					icon={faChevronDown}
					className={`w-4 h-4 text-usdu-black transition-transform ${isOpen ? 'rotate-180' : ''}`}
				/>
			</button>
			{isOpen && <div className="px-6 py-4 bg-white border-t border-usdu-surface">{children}</div>}
		</div>
	);
}
