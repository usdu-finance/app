interface TextInputProps {
	label?: string;
	placeholder?: string;
	value: string;
	onChange?: (value: string) => void;
	type?: 'text' | 'email' | 'date' | 'tel' | 'url';
	error?: string;
	warning?: string;
	note?: string;
	disabled?: boolean;
	maxLength?: number;
	className?: string;
}

export default function TextInput({
	label,
	placeholder = '',
	value,
	onChange,
	type = 'text',
	error,
	warning,
	note,
	disabled = false,
	maxLength,
	className = '',
}: TextInputProps) {
	return (
		<div className={className}>
			<div
				className={`border-2 rounded-lg px-3 py-1 transition-colors
          ${disabled ? 'bg-surface border-input-border' : 'border-input-border hover:border-brand'}
          focus-within:!border-brand
          ${error ? '!border-error' : ''}`}
			>
				{label && <div className="text-input-label mt-1 mb-0.5">{label}</div>}
				<input
					type={type}
					value={value}
					onChange={(e) => onChange?.(e.target.value)}
					placeholder={placeholder}
					disabled={disabled}
					maxLength={maxLength}
					className={`w-full bg-transparent text-lg py-1.5 outline-none
            ${disabled ? 'text-text-secondary cursor-not-allowed' : 'text-text-primary'}
            ${error ? 'text-error' : ''}
            placeholder:text-input-empty`}
				/>
			</div>

			{error ? (
				<div className="flex mt-2 px-3.5 text-error">{error}</div>
			) : warning ? (
				<div className="flex mt-2 px-3.5 text-warning">{warning}</div>
			) : note ? (
				<div className="flex mt-2 px-3.5">{note}</div>
			) : null}
		</div>
	);
}
