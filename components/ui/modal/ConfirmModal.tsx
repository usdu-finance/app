import { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import ButtonInput from '@/components/ui/input/ButtonInput';
import { Modal } from './Modal';

interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	message: string | ReactNode;
	confirmText?: string;
	cancelText?: string;
	confirmVariant?: 'primary' | 'secondary' | 'danger';
	onConfirm: () => void;
	loading?: boolean;
	className?: string;
}

export function ConfirmModal({
	isOpen,
	onClose,
	title,
	message,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	confirmVariant = 'primary',
	onConfirm,
	loading = false,
	className,
}: ConfirmModalProps) {
	const dangerClass = confirmVariant === 'danger' ? 'bg-error hover:bg-error/80 text-white border-error' : '';

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			size="sm"
			className={className}
			closeOnBackdrop={!loading}
			closeOnEscape={!loading}
			showCloseButton={false}
		>
			<div className="text-center">
				<div className="mx-auto mb-4 w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center">
					<FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6 text-yellow-400" />
				</div>

				<h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>

				<div className="text-text-secondary mb-6">
					{typeof message === 'string' ? <p>{message}</p> : message}
				</div>

				<div className="flex justify-center">
					<ButtonInput
						label={cancelText}
						variant="secondary"
						onClick={onClose}
						disabled={loading}
						className="min-w-[80px]"
						second={{
							label: confirmText,
							variant: confirmVariant === 'danger' ? 'primary' : confirmVariant,
							onClick: onConfirm,
							disabled: loading,
							loading,
							icon: loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : undefined,
							className: cn('min-w-[80px]', dangerClass),
						}}
					/>
				</div>
			</div>
		</Modal>
	);
}

export default ConfirmModal;
