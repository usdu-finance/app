export enum FormatType {
	'us',
	'tiny',
}

/**
 * Format a number with commas for thousands separators
 */
export function formatNumber(num: number | string): string {
	return new Intl.NumberFormat().format(Number(num));
}

/**
 * Format currency with flexible options
 * @param value - The value to format
 * @param minimumFractionDigits - Minimum decimal places (default: 0)
 * @param maximumFractionDigits - Maximum decimal places (default: 2)
 * @param format - Format type (us or tiny)
 */
export const formatCurrency = (
	value: string | number,
	minimumFractionDigits = 0,
	maximumFractionDigits = 2,
	format = FormatType.tiny
) => {
	const amount = typeof value === 'string' ? parseFloat(value) : value;

	// exceptions
	if (amount === null || !!isNaN(amount)) return null;
	if (amount < 0.01 && amount > 0 && maximumFractionDigits <= 2) {
		return '< 0.01';
	}

	// us
	if (format === FormatType.us) {
		const formatter = new Intl.NumberFormat('en-US', {
			maximumFractionDigits,
			minimumFractionDigits,
		});
		return formatter.format(amount);
	}

	// tiny
	if (format === FormatType.tiny) {
		const formatter = new Intl.NumberFormat('en-US', {
			maximumFractionDigits: amount < 1000 ? 2 : 0,
			minimumFractionDigits: amount < 1000 ? 2 : 0,
		});
		return formatter.format(amount);
	}
};

/**
 * Format currency with standard USD formatting
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'USD')
 */
export function formatCurrencyStandard(amount: number | string, currency = 'USD'): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(Number(amount));
}

/**
 * Format large numbers with K/M suffixes
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 */
export const formatCompactNumber = (
	value: string | number,
	decimals = 2,
	prefix: string = '$',
	suffix: string = ''
): string => {
	const amount = typeof value === 'string' ? parseFloat(value) : value;

	// Handle edge cases
	if (amount === null || isNaN(amount)) return `${prefix}0${suffix}`;
	if (amount === 0) return `${prefix}0${suffix}`;

	// Handle very small numbers
	if (amount > 0 && amount < 0.0001) {
		return `< ${prefix}0.0001${suffix}`;
	}

	// Handle different ranges
	if (amount >= 1000000) {
		return prefix + (amount / 1000000).toFixed(decimals).replace(/\.?0+$/, '') + 'M' + suffix;
	} else if (amount >= 1000) {
		return prefix + (amount / 1000).toFixed(decimals).replace(/\.?0+$/, '') + 'k' + suffix;
	} else {
		// For numbers < 1000, show up to 4 decimal places for precision
		const precision = amount < 1 ? 4 : 2;
		return prefix + amount.toFixed(precision).replace(/\.?0+$/, '') + suffix;
	}
};

/**
 * Format large numbers with K/M suffixes and optional prefix/suffix
 * @param value - The value to format
 * @param prefix - Prefix to add (default: '$')
 * @param suffix - Suffix to add (default: '')
 */
export function formatValue(value: number | string | null, prefix: string = '$', suffix: string = ''): string {
	if (!value) return '...';

	const num = typeof value != 'number' ? parseFloat(value) : value;
	if (isNaN(num)) return 'Error';

	if (num >= 1e6) {
		return `${prefix}${(num / 1e6).toFixed(1)}M${suffix}`;
	} else if (num >= 1e3) {
		return `${prefix}${(num / 1e3).toFixed(1)}K${suffix}`;
	} else {
		return `${prefix}${num.toFixed(2)}${suffix}`;
	}
}

/**
 * Format price values with specific decimal precision
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 3)
 */
export function formatPrice(value: string | null, decimals: number = 3): string {
	if (!value) return '...';

	const num = parseFloat(value);
	if (isNaN(num)) return 'Error';

	return `$${num.toFixed(decimals)}`;
}

/**
 * Format values with loading and error state handling
 * @param value - The value to format
 * @param isLoading - Loading state
 * @param error - Error message
 * @param prefix - Prefix to add (default: '$')
 * @param suffix - Suffix to add (default: '')
 */
export function formatValueWithState(
	value: string | null,
	isLoading: boolean,
	error: string | null,
	prefix: string = '$',
	suffix: string = ''
): string {
	if (isLoading) return '...';
	if (error) return 'Error';
	return formatValue(value, prefix, suffix);
}

/**
 * Format prices with loading and error state handling
 * @param value - The value to format
 * @param isLoading - Loading state
 * @param error - Error message
 * @param decimals - Number of decimal places (default: 3)
 */
export function formatPriceWithState(
	value: string | null,
	isLoading: boolean,
	error: string | null,
	decimals: number = 3
): string {
	if (isLoading) return '...';
	if (error) return 'Error';
	return formatPrice(value, decimals);
}
