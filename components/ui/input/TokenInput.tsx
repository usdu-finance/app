import { formatUnits } from 'viem';
import { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { BigNumberInput } from './BigNumberInput';
import { TokenLogo } from '@/components/ui/logo';
import { formatCurrency } from '@/lib/utils';

interface Props {
	label?: string;
	symbol: string;
	placeholder?: string;
	min?: bigint;
	max?: bigint;
	reset?: bigint;
	digit?: bigint | number;
	limit?: bigint;
	limitDigit?: bigint | number;
	limitLabel?: string;
	output?: string;
	note?: string;
	value?: string;
	onChange?: (value: string) => void;
	onMin?: () => void;
	onMax?: () => void;
	onReset?: () => void;
	/** Turns the token badge into a button, e.g. to open a token picker. Works even when the input is disabled. */
	onTokenClick?: () => void;
	/** Logo for tokens the logo lookup doesn't know, e.g. an imported token. */
	logoURI?: string;
	autoFocus?: boolean;
	disabled?: boolean;
	showButtons?: boolean;
	error?: string;
	warning?: string;
}

export default function TokenInput({
	label = 'Send',
	placeholder = 'Amount',
	symbol,
	min,
	max,
	reset,
	digit = 18n,
	limit = 0n,
	limitDigit = 18n,
	limitLabel,
	output,
	note,
	value = '',
	autoFocus,
	disabled,
	showButtons,
	onChange = () => {},
	onMin = () => {},
	onMax = () => {},
	onReset = () => {},
	onTokenClick,
	logoURI,
	error,
	warning,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);
	const canShowButtons = showButtons ?? !disabled;

	const safeValue = value ? BigInt(value) : 0n;

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

				<div className="flex items-center">
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
								className={`w-full px-0 py-0 text-3xl ${disabled ? 'bg-surface' : ''}`}
								decimals={Number(digit)}
								placeholder={placeholder}
								value={value}
								onChange={onChange}
								autoFocus={autoFocus}
								disabled={disabled}
							/>
						)}
					</div>

					{onTokenClick ? (
						<button
							type="button"
							className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-input-border bg-card hover:border-brand transition-colors flex-shrink-0"
							onClick={(e) => {
								e.stopPropagation();
								onTokenClick();
							}}
						>
							<TokenLogo currency={symbol} logoURI={logoURI} size={6} />
							<span className="text-text-primary font-semibold">{symbol || 'Select'}</span>
							<FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-text-secondary" />
						</button>
					) : (
						<>
							<div className="mr-2">
								<TokenLogo currency={symbol} logoURI={logoURI} size={6} />
							</div>

							<div className="text-input-label text-left">{symbol}</div>
						</>
					)}
				</div>

				{limitLabel != undefined || max != undefined || min != undefined || reset != undefined ? (
					<div className="flex flex-row gap-2 py-1">
						<div className="flex-1 min-w-0">
							{limitLabel != undefined && (
								<div className="flex flex-row gap-2 w-full">
									<div className="text-text-secondary flex-shrink-0">{limitLabel}</div>
									<div className="text-text-primary truncate min-w-0 overflow-hidden">
										{formatCurrency(formatUnits(limit, Number(limitDigit)))}
									</div>
								</div>
							)}
						</div>

						{canShowButtons && max != undefined && max !== safeValue && (
							<div
								className="text-input-border cursor-pointer hover:text-text-secondary font-extrabold"
								onClick={() => {
									onChange(max.toString());
									onMax();
								}}
							>
								Max
							</div>
						)}
						{canShowButtons && min != undefined && min !== safeValue && min !== max && (
							<div
								className="text-input-border cursor-pointer hover:text-text-secondary font-extrabold"
								onClick={() => {
									onChange(min.toString());
									onMin();
								}}
							>
								Min
							</div>
						)}
						{canShowButtons &&
							reset != undefined &&
							reset !== safeValue &&
							reset !== min &&
							reset !== max && (
								<div
									className="text-input-border cursor-pointer hover:text-text-secondary font-extrabold"
									onClick={() => {
										onChange(reset.toString());
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
