import { useEffect, useRef } from 'react';
import { faCheck, faXmark, faEraser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface EditableCellProps {
	value: string | null;
	isEditing: boolean;
	editValue: string;
	onEdit: () => void;
	onSave: () => void;
	onCancel: () => void;
	onChange: (v: string) => void;
	/** Optional explicit "clear" action shown in edit mode (e.g. reset to an auto-estimate) */
	onClear?: () => void;
	placeholder?: string;
	emptyText?: string;
	maxLength?: number;
	align?: 'left' | 'right';
	valueClassName?: string;
	/** Renders the value ghost-italic with a "~" prefix — for auto-derived, unconfirmed values */
	isEstimate?: boolean;
	estimateTooltip?: string;
}

export function EditableCell({
	value,
	isEditing,
	editValue,
	onEdit,
	onSave,
	onCancel,
	onChange,
	onClear,
	placeholder = 'Label',
	emptyText = 'Add label',
	maxLength = 64,
	align = 'right',
	valueClassName,
	isEstimate = false,
	estimateTooltip = 'Estimated from daily close rate — click to confirm',
}: EditableCellProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const justifyClass = align === 'right' ? 'justify-end' : 'justify-start';
	const textAlignClass = align === 'right' ? 'text-right' : 'text-left';

	useEffect(() => {
		if (isEditing) {
			// Use rAF to ensure the input is in the DOM before focusing
			const id = requestAnimationFrame(() => inputRef.current?.focus());
			return () => cancelAnimationFrame(id);
		}
	}, [isEditing]);

	if (isEditing) {
		return (
			<div className={`flex items-center gap-1 ${justifyClass}`}>
				<input
					ref={inputRef}
					value={editValue}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') onSave();
						if (e.key === 'Escape') onCancel();
					}}
					className="text-sm bg-surface border border-input-border rounded px-2 py-0.5 w-32 focus:outline-none focus:border-brand"
					placeholder={placeholder}
					maxLength={maxLength}
				/>
				<button onClick={onSave} className="text-success hover:text-success/80 transition-colors">
					<FontAwesomeIcon icon={faCheck} className="text-xs" />
				</button>
				{onClear && (
					<button
						onClick={onClear}
						className="text-text-muted hover:text-error transition-colors"
						title="Clear"
					>
						<FontAwesomeIcon icon={faEraser} className="text-xs" />
					</button>
				)}
				<button onClick={onCancel} className="text-text-muted hover:text-text-secondary transition-colors">
					<FontAwesomeIcon icon={faXmark} className="text-xs" />
				</button>
			</div>
		);
	}

	return (
		<button
			onClick={onEdit}
			className={`flex w-full items-center text-sm hover:text-brand transition-colors ${justifyClass} ${textAlignClass}`}
		>
			{value ? (
				isEstimate ? (
					<span className="text-text-muted italic" title={estimateTooltip}>
						{value}
					</span>
				) : (
					<span className={valueClassName}>{value}</span>
				)
			) : (
				<span className="text-text-muted italic">{emptyText}</span>
			)}
		</button>
	);
}
