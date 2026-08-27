import * as React from 'react';
import { parseUnits, formatUnits } from 'viem';

export type BigNumberInputProps = {
	inputRefChild?: React.RefObject<HTMLInputElement | null>;
	decimals?: number;
	value: string;
	onChange?: (value: string) => void;
	autoFocus?: boolean;
	placeholder?: string;
	max?: string;
	min?: string;
	className?: string;
	disabled?: boolean;
};

export function BigNumberInput({
	inputRefChild,
	decimals = 18,
	value,
	onChange,
	autoFocus,
	placeholder = '0.00',
	max,
	min,
	className,
	disabled,
}: BigNumberInputProps) {
	const inputRefFallback = React.useRef<HTMLInputElement>(null);
	const inputRef = inputRefChild || inputRefFallback;

	const [inputValue, setInputvalue] = React.useState('');

	React.useEffect(() => {
		if (value.length === 0) {
			setInputvalue('');
		} else {
			let parseInputValue: bigint | undefined;
			try {
				parseInputValue = parseUnits(inputValue || '0', decimals);
			} catch {
				// do nothing
			}

			if (parseInputValue === undefined || parseInputValue !== BigInt(value)) {
				try {
					setInputvalue(formatUnits(BigInt(value), decimals));
				} catch {
					// do nothing
				}
			}
		}
	}, [value, decimals, inputValue]);

	React.useEffect(() => {
		if (autoFocus && inputRef.current) {
			inputRef.current.focus();
		}
	}, [autoFocus, inputRef]);

	const updateValue = (event: React.ChangeEvent<HTMLInputElement>) => {
		const raw = event.currentTarget.value.split(' ').join('');

		if (raw === '') {
			onChange?.(raw);
			setInputvalue(raw);
			return;
		}

		let newValue: bigint;
		try {
			newValue = parseUnits(raw, decimals);
		} catch {
			// don't update the input on invalid values
			return;
		}

		const invalidValue = (min && newValue < BigInt(min)) || (max && newValue > BigInt(max));
		if (invalidValue) return;

		setInputvalue(raw);
		onChange?.(newValue.toString());
	};

	return (
		<div>
			<input
				ref={inputRef}
				placeholder={placeholder}
				onChange={updateValue}
				type="text"
				value={inputValue}
				className={'truncate bg-transparent outline-none ' + (className ?? '')}
				autoFocus={autoFocus}
				disabled={disabled}
			/>
		</div>
	);
}
