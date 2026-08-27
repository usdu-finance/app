export type FiatCurrency = 'CHF' | 'EUR' | 'USD';

export const FIAT_CURRENCIES: FiatCurrency[] = ['CHF', 'EUR', 'USD'];

export const FIAT_CURRENCY_TABS: FiatCurrency[] = ['CHF', 'EUR'];

export const FIAT_CURRENCY_SYMBOLS: Record<FiatCurrency, string> = {
	CHF: '₣',
	EUR: '€',
	USD: '$',
};

export const FIAT_CURRENCY_BADGE: Record<FiatCurrency, { color: string; bg: string }> = {
	CHF: { color: 'text-error', bg: 'bg-error-bg' },
	EUR: { color: 'text-info', bg: 'bg-info/10' },
	USD: { color: 'text-success', bg: 'bg-success-bg' },
};

export const DEFAULT_FIAT_CURRENCY: FiatCurrency = 'CHF';
