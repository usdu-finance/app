import { useRef } from 'react';
import { BigNumberInput } from './BigNumberInput';

interface Props {
	label?: string;
	placeholder?: string;
	value?: string;
	onChange?: (value: string) => void;
	error?: string;
	warning?: string;
	symbol: string;
	digit?: bigint | number;
	output?: string;
	note?: string;
	autoFocus?: boolean;
	disabled?: boolean;
}

export default function NormalInput({
	label = 'Send',
	placeholder = 'Input Amount',
	value = '',
	onChange,
	error,
	warning,
	symbol,
	digit = 18,
	output,
	note,
	autoFocus = false,
	disabled = false,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleClick = () => {
		if (inputRef.current && !disabled) {
			inputRef.current.focus();
		}
	};

	return (
		<div>
			<div
				className={`group border-input-border ${
					disabled ? 'bg-surface' : 'hover:border-brand'
				} focus-within:!border-brand ${
					error ? '!border-error' : ''
				} text-text-secondary border-2 rounded-lg px-3 py-1`}
				onClick={handleClick}
			>
				{label && <div className="flex text-input-label my-1">{label}</div>}

				<div className="flex items-center gap-1">
					<div
						className={`flex-1 py-2 ${
							error ? 'text-error' : value ? 'text-text-primary' : 'placeholder:text-input-empty'
						}`}
					>
						{output ? (
							<div className="text-3xl py-0">{output}</div>
						) : (
							<BigNumberInput
								inputRefChild={inputRef}
								className={`w-full px-0 py-0 text-3xl text-right ${disabled ? 'bg-surface' : ''}`}
								decimals={Number(digit)}
								placeholder={placeholder}
								value={value}
								onChange={onChange}
								autoFocus={autoFocus}
								disabled={disabled}
							/>
						)}
					</div>

					<div className="text-input-label text-left">{symbol}</div>
				</div>
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
