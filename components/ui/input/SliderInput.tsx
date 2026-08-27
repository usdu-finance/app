interface SliderInputProps {
	label: string;
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	step?: number;
	formatValue?: (value: number) => string;
	minLabel?: string;
	maxLabel?: string;
	hint?: string;
	className?: string;
}

export default function SliderInput({
	label,
	value,
	onChange,
	min,
	max,
	step = 1,
	formatValue,
	minLabel,
	maxLabel,
	hint,
	className = '',
}: SliderInputProps) {
	const display = formatValue ? formatValue(value) : String(value);

	return (
		<div className={className}>
			<div className="flex items-center justify-between mb-1.5">
				<span className="text-sm text-text-secondary">{label}</span>
				<span className="text-sm font-mono text-text-primary">{display}</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(parseFloat(e.target.value))}
				className="w-full accent-brand"
			/>
			{(minLabel || maxLabel) && (
				<div className="flex justify-between text-xs text-text-muted mt-1">
					<span>{minLabel ?? ''}</span>
					<span>{maxLabel ?? ''}</span>
				</div>
			)}
			{hint && <p className="text-xs text-text-muted mt-1.5">{hint}</p>}
		</div>
	);
}
