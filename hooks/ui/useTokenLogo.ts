import { useState, useEffect } from 'react';
import { TOKENS } from '@/lib/tokens/config';
import { fetchCowTokenList } from '@/lib/tokens/cow-service';

export function useTokenLogo(currency?: string, logoURI?: string): string | undefined {
	const [src, setSrc] = useState<string | undefined>(logoURI);

	useEffect(() => {
		if (logoURI) {
			setSrc(logoURI);
			return;
		}

		if (!currency) return;

		let cancelled = false;

		fetchCowTokenList()
			.then((tokens) => {
				if (cancelled) return;
				const match = tokens.find((t) => t.symbol.toLowerCase() === currency.toLowerCase());
				if (match?.logoURI) {
					setSrc(match.logoURI);
					return;
				}
				// fall back to local registry
				const local = TOKENS[currency] ?? TOKENS[currency.toUpperCase()];
				setSrc(local?.logoURI);
			})
			.catch(() => {
				const local = TOKENS[currency] ?? TOKENS[currency.toUpperCase()];
				setSrc(local?.logoURI);
			});

		return () => {
			cancelled = true;
		};
	}, [currency, logoURI]);

	return src;
}
