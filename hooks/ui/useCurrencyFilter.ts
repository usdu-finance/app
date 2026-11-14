import { useRouter } from 'next/router';
import { ALL_CURRENCIES } from '@/components/ui/input';

/** The stablecoins the currency switcher filters by. */
export const FILTER_CURRENCIES = ['USDU', 'EURU', 'CHFU'];

/**
 * Selected stablecoin of a page's currency switcher, kept in the `?currency=` query so a view can be shared.
 * `currency` is a stablecoin symbol or `ALL_CURRENCIES`.
 */
export function useCurrencyFilter() {
	const router = useRouter();
	const query = typeof router.query.currency === 'string' ? router.query.currency.toUpperCase() : '';
	const currency = FILTER_CURRENCIES.includes(query) ? query : ALL_CURRENCIES;

	const setCurrency = (value: string) => router.replace({ query: { ...router.query, currency: value } }, undefined, { shallow: true });

	return { currency, all: currency === ALL_CURRENCIES, setCurrency, currencies: FILTER_CURRENCIES };
}
