import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { TokenLogo } from '@/components/ui/logo';
import PillTabs from './PillTabs';

/** Value of the "All" option. */
export const ALL_CURRENCIES = 'ALL';

interface CurrencyTabsProps {
	currencies: readonly string[];
	/** A currency or `ALL_CURRENCIES`. */
	value: string;
	onChange: (value: string) => void;
	className?: string;
	disabled?: boolean;
	/** Shows the "All" option, default true. */
	showAll?: boolean;
}

/** PillTabs of the stablecoins, led by an "All" option. */
export default function CurrencyTabs({ currencies, value, onChange, className, disabled, showAll = true }: CurrencyTabsProps) {
	return (
		<PillTabs
			className={className}
			disabled={disabled}
			value={value}
			onChange={onChange}
			options={[
				...(showAll
					? [
							{
								value: ALL_CURRENCIES,
								label: (
									<>
										<span className="flex h-5 w-5 items-center justify-center rounded-full bg-usdu-black">
											<FontAwesomeIcon icon={faLayerGroup} className="h-2.5 w-2.5 text-usdu-card" />
										</span>
										All
									</>
								),
							},
						]
					: []),
				...currencies.map((c) => ({
					value: c,
					label: (
						<>
							<TokenLogo currency={c} size={5} />
							{c}
						</>
					),
				})),
			]}
		/>
	);
}
