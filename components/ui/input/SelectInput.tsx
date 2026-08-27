import { useEffect, useRef, useState } from 'react';
import { faCheck, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export interface SelectOption {
	value: string;
	label: string;
}

interface SelectInputProps {
	label?: string;
	options: SelectOption[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	error?: string;
	disabled?: boolean;
}

export function SelectInput({
	label,
	options,
	value,
	onChange,
	placeholder = 'Select…',
	error,
	disabled = false,
}: SelectInputProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const selected = options.find((o) => o.value === value);

	return (
		<div>
			<div
				className={`border-2 rounded-lg px-3 py-1 transition-colors
          ${disabled ? 'bg-surface border-input-border' : 'border-input-border hover:border-brand'}
          ${open ? '!border-brand' : ''}
          ${error ? '!border-error' : ''}`}
			>
				{label && <div className="text-input-label text-xs mt-1 mb-0.5">{label}</div>}
				<div className="relative" ref={ref}>
					<button
						type="button"
						disabled={disabled}
						onClick={() => setOpen((prev) => !prev)}
						className={`w-full flex items-center justify-between gap-2 bg-transparent text-lg py-1.5 outline-none text-left
              ${disabled ? 'cursor-not-allowed text-text-secondary' : 'cursor-pointer'}
              ${selected ? 'text-text-primary' : 'text-input-empty'}`}
					>
						<span>{selected?.label ?? placeholder}</span>
						<FontAwesomeIcon
							icon={faChevronDown}
							className={`w-3 h-3 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
						/>
					</button>
					{open && (
						<div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg bg-card shadow-lg border border-table-alt py-1">
							{options.map((opt) => (
								<button
									key={opt.value}
									type="button"
									onClick={() => {
										onChange(opt.value);
										setOpen(false);
									}}
									className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-surface transition-colors"
								>
									<span
										className={`flex-1 ${opt.value === value ? 'text-brand font-semibold' : 'text-text-primary'}`}
									>
										{opt.label}
									</span>
									{opt.value === value && (
										<FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-brand" />
									)}
								</button>
							))}
						</div>
					)}
				</div>
			</div>
			{error && <div className="flex mt-2 px-3.5 text-xs text-error">{error}</div>}
		</div>
	);
}
