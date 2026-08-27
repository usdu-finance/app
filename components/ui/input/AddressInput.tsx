import { useRef } from 'react';

interface Props {
	label?: string;
	className?: string;
	placeholder?: string;
	value?: string;
	onChange?: (value: string) => void;
	onOwn?: () => void;
	onReset?: () => void;
	limitLabel?: string;
	own?: string;
	reset?: string;
	error?: string;
	warning?: string;
	autoFocus?: boolean;
	disabled?: boolean;
	isTextLeft?: boolean;
	note?: string;
}

export default function AddressInput({
	label,
	className,
	placeholder,
	value,
	error,
	warning,
	onChange = () => {},
	onOwn = () => {},
	onReset = () => {},
	limitLabel,
	own,
	reset,
	autoFocus,
	disabled,
	isTextLeft,
	note,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleClick = () => {
		if (inputRef.current && !disabled) {
			inputRef.current.focus();
		}
	};

	return (
		<div className={className}>
			<div
				className={`group border-input-border ${
					disabled ? 'bg-surface' : 'hover:border-brand'
				} focus-within:!border-brand ${
					error ? '!border-error' : ''
				} text-text-secondary border-2 rounded-lg px-3 py-1`}
				onClick={handleClick}
			>
				{label && <div className="flex text-input-label my-1">{label}</div>}

				<input
					ref={inputRef}
					className={`w-full py-2 text-lg ${isTextLeft ? 'text-left' : 'text-right'} bg-transparent outline-none ${
						error ? 'text-error' : 'text-text-primary'
					}`}
					placeholder={placeholder}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
					autoFocus={autoFocus}
				/>

				{limitLabel != undefined || own != undefined || reset != undefined ? (
					<div className="flex flex-row gap-2 py-1">
						<div className="flex-1 min-w-0">
							{limitLabel != undefined && (
								<div className="flex flex-row gap-2 w-full">
									<div className="text-text-secondary flex-shrink-0">Own: {limitLabel}</div>
								</div>
							)}
						</div>

						{!disabled && own != undefined && own !== value && (
							<div
								className="text-input-border cursor-pointer hover:text-text-secondary font-extrabold"
								onClick={() => {
									onChange(own);
									onOwn();
								}}
							>
								Own
							</div>
						)}
						{!disabled && reset != undefined && reset !== value && reset !== own && (
							<div
								className="text-input-border cursor-pointer hover:text-text-secondary font-extrabold"
								onClick={() => {
									onChange(reset);
									onReset();
								}}
							>
								Reset
							</div>
						)}
					</div>
				) : null}
			</div>

			{error ? (
				<div className="flex mt-2 px-3.5 text-error">{error}</div>
			) : warning ? (
				<div className="flex mt-2 px-3.5 text-warning">{warning}</div>
			) : (
				<div className="flex mt-2 px-3.5">{note}</div>
			)}
		</div>
	);
}
