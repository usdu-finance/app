import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erc20Abi, isAddress } from 'viem';
import { useReadContracts } from 'wagmi';
import { Modal } from '@/components/ui/modal';
import { TokenLogo } from '@/components/ui/logo';
import { searchTokens } from '@/lib/tokens/cow-service';

export interface TokenOption {
	address: string;
	symbol: string;
	name: string;
	decimals: number;
	logoURI?: string;
}

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (token: TokenOption) => void;
	tokens: TokenOption[];
	title?: string;
	/** Addresses to hide, e.g. the token on the other side of a swap. */
	exclude?: string[];
	/** Lets users paste any ERC-20 address and import it by reading symbol and decimals on-chain. */
	allowCustom?: boolean;
	isLoading?: boolean;
	/** Shows each listed token's USD price, fetched for the tokens currently visible from /api/zap/prices. */
	showPrices?: boolean;
}

const MAX_RESULTS = 100;

const usd = (price: number) => {
	// near-peg stablecoins read better with 3-4 decimals, large prices need none, tiny ones keep their significant digits
	const max = price >= 1000 ? 0 : price >= 1 ? 3 : price >= 0.01 ? 4 : 6;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: Math.min(2, max), // must never exceed the maximum or Intl throws a RangeError
		maximumFractionDigits: max,
	}).format(price);
};

function TokenRow({ token, price, onClick }: { token: TokenOption; price?: number; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left hover:bg-usdu-bg transition-colors"
		>
			<TokenLogo currency={token.symbol} logoURI={token.logoURI} size={8} />
			<div className="flex flex-col min-w-0 flex-1">
				<span className="font-semibold text-text-primary">{token.symbol}</span>
				<span className="text-sm text-text-secondary truncate">{token.name}</span>
			</div>
			{price !== undefined && <span className="text-sm text-text-secondary flex-shrink-0">{usd(price)}</span>}
		</button>
	);
}

/**
 * Token picker with search by symbol, name or address. Pasting an address that isn't in the list reads the
 * token's metadata on-chain so any ERC-20 can be selected (when `allowCustom` is set).
 */
export default function TokenSelectModal({
	isOpen,
	onClose,
	onSelect,
	tokens,
	title = 'Select a token',
	exclude = [],
	allowCustom,
	isLoading,
	showPrices,
}: Props) {
	const [query, setQuery] = useState('');

	const excluded = useMemo(() => new Set(exclude.map((a) => a.toLowerCase())), [exclude]);
	const available = useMemo(() => tokens.filter((t) => !excluded.has(t.address.toLowerCase())), [tokens, excluded]);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		const found = searchTokens(available, query);
		// Exact symbol matches first, then symbol prefixes, then the rest in list order
		const rank = (t: TokenOption) => (t.symbol.toLowerCase() === q ? 0 : t.symbol.toLowerCase().startsWith(q) ? 1 : 2);
		return (q ? [...found].sort((a, b) => rank(a) - rank(b)) : found).slice(0, MAX_RESULTS);
	}, [available, query]);

	const typedAddress = query.trim();
	const importable =
		allowCustom &&
		isAddress(typedAddress) &&
		!excluded.has(typedAddress.toLowerCase()) &&
		!tokens.some((t) => t.address.toLowerCase() === typedAddress.toLowerCase());

	const { data: meta, isLoading: isReadingMeta } = useReadContracts({
		contracts: importable
			? [
					{ address: typedAddress, abi: erc20Abi, functionName: 'symbol' as const },
					{ address: typedAddress, abi: erc20Abi, functionName: 'name' as const },
					{ address: typedAddress, abi: erc20Abi, functionName: 'decimals' as const },
				]
			: [],
		query: { enabled: importable },
	});
	const imported = useMemo<TokenOption | undefined>(
		() =>
			importable && meta?.[0]?.result && meta[2]?.result !== undefined
				? {
						address: typedAddress,
						symbol: meta[0].result as string,
						name: (meta[1]?.result as string) ?? (meta[0].result as string),
						decimals: Number(meta[2].result),
					}
				: undefined,
		[importable, meta, typedAddress]
	);

	// Prices for what is on screen only (the CoW list has thousands of tokens), merged into a cache that outlives
	// each search so rows keep their price while the query refetches
	const visible = useMemo(() => [...(imported ? [imported] : []), ...results].map((t) => t.address.toLowerCase()), [imported, results]);
	const visibleKey = visible.join(',');
	const known = useRef<Record<string, number>>({});
	const { data: fetched } = useQuery({
		queryKey: ['zap-prices', visibleKey],
		queryFn: async () => (await (await fetch(`/api/zap/prices?tokens=${visibleKey}`)).json()).prices as Record<string, number>,
		enabled: isOpen && !!showPrices && visible.length > 0,
		staleTime: 60_000,
	});
	useEffect(() => {
		if (fetched) Object.assign(known.current, fetched);
	}, [fetched]);
	const priceOf = (address: string) => (fetched ?? known.current)[address.toLowerCase()] ?? known.current[address.toLowerCase()];

	const pick = (token: TokenOption) => {
		onSelect(token);
		setQuery('');
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
			<div className="space-y-4">
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={allowCustom ? 'Search name, symbol or paste address' : 'Search name or symbol'}
					className="w-full rounded-lg border-2 border-input-border bg-transparent px-3 py-2 text-text-primary outline-none placeholder:text-input-empty focus:border-brand"
					autoFocus
				/>

				<div className="max-h-96 overflow-y-auto space-y-1">
					{imported && <TokenRow token={imported} price={priceOf(imported.address)} onClick={() => pick(imported)} />}
					{importable && !imported && (
						<p className="px-3 py-2 text-sm text-text-secondary">
							{isReadingMeta ? 'Reading token...' : 'This address is not an ERC-20 token on Ethereum.'}
						</p>
					)}
					{results.map((t) => (
						<TokenRow key={t.address} token={t} price={priceOf(t.address)} onClick={() => pick(t)} />
					))}
					{!imported && !importable && results.length === 0 && (
						<p className="px-3 py-2 text-sm text-text-secondary">{isLoading ? 'Loading tokens...' : 'No tokens found.'}</p>
					)}
				</div>
			</div>
		</Modal>
	);
}
