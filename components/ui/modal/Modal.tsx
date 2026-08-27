import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

export interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: ReactNode;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	closeOnBackdrop?: boolean;
	closeOnEscape?: boolean;
	className?: string;
	header?: ReactNode;
	footer?: ReactNode;
	showCloseButton?: boolean;
}

const SIZE_VARIANTS = {
	sm: 'max-w-md',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
	xl: 'max-w-4xl',
};

export function Modal({
	isOpen,
	onClose,
	title,
	children,
	size = 'md',
	closeOnBackdrop = true,
	closeOnEscape = true,
	className,
	header,
	footer,
	showCloseButton = true,
}: ModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);
	const previousActiveElement = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!closeOnEscape) return;
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) onClose();
		};
		if (isOpen) document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [isOpen, onClose, closeOnEscape]);

	useEffect(() => {
		if (isOpen) {
			previousActiveElement.current = document.activeElement as HTMLElement;
			setTimeout(() => {
				if (modalRef.current) {
					const el = modalRef.current.querySelector<HTMLElement>(
						'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
					);
					(el ?? modalRef.current).focus();
				}
			}, 100);
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
			previousActiveElement.current?.focus();
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [isOpen]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key !== 'Tab' || !modalRef.current) return;
		const focusable = modalRef.current.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last?.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first?.focus();
		}
	};

	if (!isOpen) return null;

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
			onClick={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose()}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
		>
			<div
				ref={modalRef}
				className={cn(
					'relative w-full bg-surface rounded-lg border border-surface',
					'animate-in zoom-in-95 slide-in-from-bottom-4',
					SIZE_VARIANTS[size],
					className
				)}
				tabIndex={-1}
				onKeyDown={handleKeyDown}
			>
				{(title || header || showCloseButton) && (
					<div className="flex items-center justify-between p-6 border-b border-usdu-bg">
						<div className="flex-1">
							{header ??
								(title && (
									<h2 id="modal-title" className="text-xl font-bold text-text-primary">
										{title}
									</h2>
								))}
						</div>
						{showCloseButton && (
							<button
								onClick={onClose}
								className="ml-4 p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-surface/50"
								aria-label="Close modal"
							>
								<FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
							</button>
						)}
					</div>
				)}

				<div className="p-6">{children}</div>

				{footer && (
					<div className="flex items-center justify-end gap-3 p-6 border-t border-usdu-bg">{footer}</div>
				)}
			</div>
		</div>,
		document.body
	);
}

export default Modal;
