import { formatUnits, parseUnits } from 'viem';
import { formatCurrency } from '@/lib/utils';

interface Props {
	label?: string;
	value: bigint;
	digit?: number;
	sliderMin: bigint;
	sliderMax: bigint;
	sliderSource: bigint;
	min?: bigint;
	max?: bigint;
	reset?: bigint;
	onChange: (value: bigint) => void;
	onMin?: () => void;
	onMax?: () => void;
	onReset?: () => void;
	symbol?: string;
	disabled?: boolean;
	error?: string;
	warning?: string;
	note?: string;
	limit?: bigint;
	limitDigit?: bigint | number;
	limitLabel?: string;
}

export default function LiquidationSlider({
	label,
	value,
	digit = 18,
	sliderMin,
	sliderMax,
	sliderSource,
	min,
	max,
	reset,
	onChange,
	onMin = () => {},
	onMax = () => {},
	onReset = () => {},
	symbol = 'ZCHF',
	disabled,
	error,
	warning,
	note,
	limit = 0n,
	limitDigit = 18n,
	limitLabel,
}: Props) {
	const valueNum = Number(formatUnits(value, digit));
	const sliderMinNum = Number(formatUnits(sliderMin, digit));
	const sliderMaxNum = Number(formatUnits(sliderMax, digit));
	const sliderSourceNum = Number(formatUnits(sliderSource, digit));

	const scale = Math.max(sliderMaxNum - sliderMinNum, 1e-10);
	const valuePct = Math.min(100, Math.max(0, ((valueNum - sliderMinNum) / scale) * 100));
	const sourcePct = Math.min(100, Math.max(0, ((sliderSourceNum - sliderMinNum) / scale) * 100));

	const canShowButtons = !disabled;

	return (
		<div>
			<div
				className={`group border-input-border ${
					disabled ? 'bg-surface' : 'hover:border-brand'
				} focus-within:!border-brand text-text-secondary border-2 rounded-lg px-3 py-1`}
			>
				<div className="flex items-center my-1">
					<span className="flex-1 text-input-label">{label ?? 'Liquidation price'}</span>
					<span className="font-bold text-lg text-text-primary">
						{formatCurrency(formatUnits(value, digit))} {symbol}
					</span>
				</div>

				<div className="relative" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
					<div
						className={`absolute -top-1 text-xs font-bold -translate-x-1/2 ${
							sourcePct < 38 ? 'text-success' : 'text-brand'
						}`}
						style={{ left: `${sourcePct}%` }}
					>
						Reference
					</div>

					<div className="relative h-8 flex items-center">
						<div className="absolute inset-x-0 h-3 rounded-full overflow-hidden">
							<div
								className="absolute inset-0"
								style={{
									background: 'linear-gradient(to right, #22c55e 0%, #eab308 50%, #f97316 100%)',
								}}
							/>
							<div
								className="absolute top-0 bottom-0 bg-surface"
								style={{ left: `${sourcePct}%`, right: 0 }}
							/>
							<div
								className="absolute top-0 bottom-0 w-0.5 bg-white/30"
								style={{ left: `${sourcePct}%` }}
							/>
						</div>

						<div
							className="absolute w-5 h-5 rounded-full bg-white border-2 border-gray-500 shadow-lg pointer-events-none -translate-x-1/2"
							style={{ left: `${valuePct}%` }}
						/>

						<input
							type="range"
							className="absolute inset-0 w-full opacity-0 cursor-pointer"
							min={sliderMinNum}
							max={sliderMaxNum}
							step={(sliderMaxNum - sliderMinNum) / 1000}
							value={valueNum}
							disabled={disabled}
							onChange={(e) => {
								const raw = e.target.value;
								const [intPart, fracPart = ''] = raw.split('.');
								const trimmed = fracPart ? `${intPart}.${fracPart.slice(0, digit)}` : intPart;
								onChange(parseUnits(trimmed, digit));
							}}
						/>
					</div>
				</div>

				<div className="flex flex-row gap-2 py-1">
					<div className="flex flex-row gap-2 flex-1">
						{limitLabel != undefined && (
							<>
								<div className="text-text-secondary flex-shrink-0">{limitLabel}</div>
								<div className="text-text-primary truncate min-w-0 overflow-hidden">
									{formatCurrency(formatUnits(limit, Number(limitDigit)))}
								</div>
							</>
						)}
					</div>
					<div className="flex flex-row gap-2">
						{canShowButtons && max != undefined && max !== value && (
							<div
								className="text-input-border cursor-pointer hover:text-text-secondary font-extrabold"
								onClick={() => {
									onChange(max);
									onMax();
								}}
							>
								Max
							</div>
						)}
						{canShowButtons && min != undefined && min !== value && min !== max && (
							<div
								className="text-input-border cursor-pointer hover:text-text-secondary font-extrabold"
								onClick={() => {
									onChange(min);
									onMin();
								}}
							>
								Min
							</div>
						)}
						{canShowButtons && reset != undefined && reset !== value && reset !== min && reset !== max && (
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
