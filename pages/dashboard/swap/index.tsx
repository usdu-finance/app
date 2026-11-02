import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { erc20Abi, formatUnits, zeroAddress, type Address } from 'viem';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useBalance, useReadContracts } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/contexts/AuthContext';
import { useZapperSwap, type ZapperSwapStepJson } from '@/hooks/useZapperSwap';
import { ZAPPER_SWAP_ADDRESS } from '@/lib/constants';
import { TOKENS } from '@/lib/tokens/config';
import { TokenInput, ApproveActionInput, TokenSelectModal, type TokenOption } from '@/components/ui/input';
import { fetchCowTokenList, getMergedTokenList } from '@/lib/tokens/cow-service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faScaleBalanced, faBolt } from '@fortawesome/free-solid-svg-icons';
import { useSwapModules, type SwapModule } from '@/hooks/useSwapModules';
import { useCurvePools, isRedeemPool, type CurvePool } from '@/hooks/useCurvePools';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import Card from '@/components/ui/Card';
import AddressLink from '@/components/ui/AddressLink';
import { DetailRow } from '@/components/ui/modal';
import HeroSteps from '@/components/ui/HeroSteps';
import { formatCompactNumber } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const HEADERS = ['Coin', 'Available In', 'Available Out', 'Fees In / Out', 'Strategy'];
const POOL_HEADERS = ['Pool', 'TVL', 'Price', 'First Token', 'Second Token'];

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function compareModules(tab: string, a: SwapModule, b: SwapModule): number {
	switch (tab) {
		case 'Available In':
			return compareBigint(b.mintable, a.mintable);
		case 'Available Out':
			return compareBigint(b.totalMinted, a.totalMinted);
		case 'Fees In / Out':
			return b.swapInFeePPM + b.swapOutFeePPM - (a.swapInFeePPM + a.swapOutFeePPM);
		case 'Strategy':
			return a.vaultName.localeCompare(b.vaultName);
		default:
			return a.coinSymbol.localeCompare(b.coinSymbol);
	}
}

function compareNumber(a: number, b: number): number {
	return a - b;
}

function tokenAmount(p: CurvePool, index: 0 | 1): number {
	return parseFloat(formatUnits(p.balances[index], p.tokens[index].decimals));
}

function comparePools(tab: string, a: CurvePool, b: CurvePool): number {
	switch (tab) {
		case 'Price':
			return compareNumber(b.price, a.price);
		case 'TVL':
			return compareNumber(b.totalValue, a.totalValue);
		case 'First Token':
			return compareNumber(tokenAmount(b, 0), tokenAmount(a, 0));
		case 'Second Token':
			return compareNumber(tokenAmount(b, 1), tokenAmount(a, 1));
		default:
			return a.label.localeCompare(b.label); // 'Pool'
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faCoins} className="w-3 h-3 text-usdu-card" />,
		title: 'Pick a currency',
		description: 'USDU, EURU, and CHFU are all live today, each with their own set of swap modules.',
	},
	{
		icon: <FontAwesomeIcon icon={faScaleBalanced} className="w-3 h-3 text-usdu-card" />,
		title: 'Compare bridges',
		description: 'The same coin can be backed by more than one bridge, each with its own fees and mint capacity.',
	},
	{
		icon: <FontAwesomeIcon icon={faBolt} className="w-3 h-3 text-usdu-card" />,
		title: 'Swap instantly',
		description: 'Mint or redeem directly on-chain through the swap router — no order book, no slippage.',
	},
];

interface CurvePoolSectionProps {
	title: string;
	description: string;
	pools: CurvePool[];
	isLoading: boolean;
	error: string | null;
	emptyText: string;
}

function CurvePoolSection({ title, description, pools, isLoading, error, emptyText }: CurvePoolSectionProps) {
	const router = useRouter();
	const { sortTab, sortReverse, handleSort } = useSort('TVL');

	const sortedPools = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...pools].sort((a, b) => dir * comparePools(sortTab, a, b));
	}, [pools, sortTab, sortReverse]);

	return (
		<>
			<Card variant="panel" className="space-y-8">
				<PageHeader title={title} description={description} />
				<Table>
					<TableHead headers={POOL_HEADERS} colSpan={5} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
					<TableBody>
						{isLoading ? (
							<TableRowEmpty>Loading curve pools...</TableRowEmpty>
						) : error ? (
							<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
						) : sortedPools.length === 0 ? (
							<TableRowEmpty>{emptyText}</TableRowEmpty>
						) : (
							sortedPools.map((m) => (
								<TableRow
									key={m.key}
									headers={POOL_HEADERS}
									colSpan={5}
									tab={sortTab}
									onClick={() => router.push(`/dashboard/swap/${m.poolAddress}/curve`)}
								>
									<div className="flex items-center gap-2">
										<TokenLogo currency={m.tokens[0].symbol} size={6} className="-mr-2" />
										<TokenLogo currency={m.tokens[1].symbol} size={6} />
										<span>{m.label}</span>
									</div>
									<span>{formatCompactNumber(m.totalValue, 1, '', ' USDU')}</span>
									<span>{`${m.price.toFixed(4)} ${m.tokens[0].symbol}`}</span>
									<span>{formatCompactNumber(tokenAmount(m, 0), 1, '', ` ${m.tokens[0].symbol}`)}</span>
									<span>{formatCompactNumber(tokenAmount(m, 1), 1, '', ` ${m.tokens[1].symbol}`)}</span>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</Card>
		</>
	);
}

const NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const ZAP_STABLES = ['USDU', 'EURU', 'CHFU'];

interface ZapToken {
	symbol: string;
	address: Address;
	decimals: number;
}

interface ZapStep {
	kind: 'module' | 'curve' | 'vault' | 'enso';
	label: string;
	tokenIn: ZapToken;
	tokenOut: ZapToken;
	amountIn: string;
	amountOut: string;
	feePpm: number;
	priceImpact?: number | null;
	available: boolean;
	reason?: string;
}

interface ZapRoute {
	id: string;
	steps: ZapStep[];
	amountOut: string;
	minAmountOut: string;
	zapSteps: ZapperSwapStepJson[];
	available: boolean;
}

async function getJson<T>(url: string): Promise<T> {
	const res = await fetch(url);
	const body = await res.json();
	if (!res.ok) throw new Error(body?.error ?? 'Request failed');
	return body as T;
}

const asOption = (t: { address: string; symbol: string; name?: string; decimals: number; logoURI?: string }): TokenOption => ({
	address: t.address,
	symbol: t.symbol,
	name: t.name ?? t.symbol,
	decimals: t.decimals,
	logoURI: t.logoURI,
});

// Token amounts for display: enough precision to read small values, none of the 18-decimal noise
const fmtAmount = (raw: bigint, decimals: number) => {
	const n = parseFloat(formatUnits(raw, decimals));
	return n.toLocaleString('en-US', { maximumFractionDigits: n >= 1000 ? 2 : n >= 1 ? 4 : 6 });
};

// USD value of an amount, or "-" when the token has no known price
const fmtUsd = (raw: bigint, decimals: number, price?: number) => {
	if (price === undefined) return '-';
	const value = parseFloat(formatUnits(raw, decimals)) * price;
	if (value > 0 && value < 0.01) return '< $0.01';
	return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// A step's venue with its fee and price impact, e.g. "USDU / EURU Curve pool · 0.1% fee"
const stepDetails = (st: ZapStep) =>
	st.label +
	(st.feePpm > 0 ? ` · ${+(st.feePpm / 10_000).toFixed(2)}% fee` : '') +
	(st.priceImpact != null ? ` · ${(st.priceImpact / 100).toFixed(2)}% price impact` : '');

function ZapInCard() {
	const { isConnected, address } = useAuth();
	const { open } = useAppKit();

	const { data: registry } = useQuery({
		queryKey: ['zap-tokens'],
		queryFn: () => getJson<{ targets: ZapToken[]; enso: boolean }>('/api/zap/tokens'),
		staleTime: 30_000,
	});
	const { data: cowTokens, isLoading: isLoadingTokenList } = useQuery({
		queryKey: ['cow-token-list'],
		queryFn: fetchCowTokenList,
		staleTime: 60 * 60 * 1000,
	});

	// Pay list: protocol stables, reward shares and ETH first, then the whole CoW list (search also takes a pasted address)
	const payTokens = useMemo<TokenOption[]>(() => {
		const protocol = [...ZAP_STABLES, 'rUSDU', 'rEURU', 'rCHFU', 'ETH'].map((s) => asOption(TOKENS[s]));
		const merged = getMergedTokenList(cowTokens ?? [], 1).map(asOption);
		const seen = new Set(protocol.map((t) => t.address.toLowerCase()));
		return [...protocol, ...merged.filter((t) => !seen.has(t.address.toLowerCase()))];
	}, [cowTokens]);

	// Receive list: the three stablecoins and their reward vault shares, minus whatever is being paid with
	const receiveTokens = useMemo<TokenOption[]>(
		() => (registry?.targets ?? []).map((t) => asOption({ ...t, ...TOKENS[t.symbol], address: t.address })),
		[registry]
	);

	const [payToken, setPayToken] = useState<TokenOption>(() => asOption(TOKENS.USDC));
	const [receiveToken, setReceiveToken] = useState<TokenOption>(() => asOption(TOKENS.USDU));
	const [picker, setPicker] = useState<'pay' | 'receive' | null>(null);
	const [amountRawInput, setAmountRawInput] = useState('');
	const amountRaw = amountRawInput ? BigInt(amountRawInput) : 0n;

	// Debounce the amount so typing doesn't fire a quote per keystroke
	const [debouncedAmount, setDebouncedAmount] = useState(0n);
	useEffect(() => {
		const id = setTimeout(() => setDebouncedAmount(amountRaw), 400);
		return () => clearTimeout(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [amountRawInput]);

	const samePair = payToken.address.toLowerCase() === receiveToken.address.toLowerCase();

	const {
		data: quote,
		isFetching: isQuoting,
		error: quoteError,
	} = useQuery({
		queryKey: ['zap-quote', payToken.address, receiveToken.address, debouncedAmount.toString()],
		queryFn: () =>
			getJson<{ routes: ZapRoute[]; reason?: 'enso-not-configured' | 'no-route' }>(
				`/api/zap/quote?tokenIn=${payToken.address}&tokenOut=${receiveToken.address}&amountIn=${debouncedAmount}`
			),
		enabled: !samePair && debouncedAmount > 0n,
		retry: false,
		refetchInterval: 15_000,
	});

	const route = quote?.routes.find((r) => r.available);
	// Enso calldata encodes the exact input amount, so a route only counts once its quote matches what is typed
	const quoteMatchesInput = debouncedAmount === amountRaw;
	const hasQuote = !!route && BigInt(route.amountOut) > 0n && quoteMatchesInput;

	const isNativeEth = payToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();
	const { data: reads, refetch: refetchReads } = useReadContracts({
		contracts:
			address && !isNativeEth
				? [
						{
							address: payToken.address as Address,
							abi: erc20Abi,
							functionName: 'balanceOf' as const,
							args: [address as Address],
						},
						{
							address: payToken.address as Address,
							abi: erc20Abi,
							functionName: 'allowance' as const,
							args: [address as Address, ZAPPER_SWAP_ADDRESS ?? zeroAddress],
						},
					]
				: [],
		query: { enabled: !!address && !isNativeEth, refetchInterval: 30_000 },
	});
	const { data: ethBalance, refetch: refetchEth } = useBalance({
		address: address as Address,
		query: { enabled: isNativeEth && !!address },
	});
	const balanceRaw = isNativeEth ? (ethBalance?.value ?? 0n) : ((reads?.[0]?.result as bigint | undefined) ?? 0n);
	const allowanceRaw = (reads?.[1]?.result as bigint | undefined) ?? 0n;

	// The receive token is always an ERC-20 (a stablecoin or a reward share), never ETH
	const { data: receiveBalanceData, refetch: refetchReceive } = useReadContracts({
		contracts: address
			? [{ address: receiveToken.address as Address, abi: erc20Abi, functionName: 'balanceOf' as const, args: [address as Address] }]
			: [],
		query: { enabled: !!address, refetchInterval: 30_000 },
	});
	const receiveBalanceRaw = (receiveBalanceData?.[0]?.result as bigint | undefined) ?? 0n;

	const { isAvailable, approve, zap, isPending, isConfirming, isConfirmed, reset } = useZapperSwap();
	const [pendingStep, setPendingStep] = useState<'approve' | 'zap' | null>(null);
	const isBusy = isPending || isConfirming;

	useEffect(() => {
		if (isConfirmed) {
			refetchReads();
			refetchEth();
			refetchReceive();
			if (pendingStep === 'zap') setAmountRawInput('');
			setPendingStep(null);
			reset();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isConfirmed]);

	const selectPay = (t: TokenOption) => {
		setPayToken(t);
		setAmountRawInput('');
		// The receive side can't be the same coin; fall back to the first receive token that differs
		if (t.address.toLowerCase() === receiveToken.address.toLowerCase()) {
			setReceiveToken(receiveTokens.find((r) => r.address.toLowerCase() !== t.address.toLowerCase()) ?? receiveToken);
		}
	};

	const insufficientBalance = amountRaw > 0n && amountRaw > balanceRaw;
	const needsApproval = !isNativeEth && amountRaw > 0n && allowanceRaw < amountRaw;

	const handleApprove = async () => {
		try {
			setPendingStep('approve');
			await approve(payToken.address as Address, amountRaw);
		} catch {
			setPendingStep(null);
		}
	};

	const handleAction = async () => {
		if (!route || !address || amountRaw === 0n) return;
		try {
			setPendingStep('zap');
			await zap({
				tokenIn: payToken.address as Address,
				amountIn: amountRaw,
				steps: route.zapSteps,
				tokenOut: receiveToken.address as Address,
				minAmountOut: BigInt(route.minAmountOut),
				recipient: address as Address,
				value: isNativeEth ? amountRaw : undefined,
			});
		} catch {
			setPendingStep(null);
		}
	};

	const noRoute = !samePair && debouncedAmount > 0n && quoteMatchesInput && !isQuoting && !route;
	const noRouteReason = quoteError
		? 'Could not fetch a quote. Try again.'
		: quote?.reason === 'enso-not-configured'
			? `${payToken.symbol} is not part of the protocol, so it needs Enso routing, which is not configured on this server yet.`
			: (quote?.routes[0]?.steps.find((s) => !s.available)?.reason ?? 'No route found for this pair.');

	// USD prices for everything shown in the route: the pay and receive tokens and every token a step passes through
	const priceTokens = useMemo(
		() => [
			...new Set(
				[
					payToken.address,
					receiveToken.address,
					...(route?.steps.flatMap((st) => [st.tokenIn.address, st.tokenOut.address]) ?? []),
				].map((a) => a.toLowerCase())
			),
		],
		[payToken.address, receiveToken.address, route]
	);
	const { data: priceData } = useQuery({
		queryKey: ['zap-card-prices', priceTokens.join(',')],
		queryFn: () => getJson<{ prices: Record<string, number> }>(`/api/zap/prices?tokens=${priceTokens.join(',')}`),
		staleTime: 60_000,
		placeholderData: keepPreviousData,
	});
	const priceOf = (a: string) => priceData?.prices[a.toLowerCase()];

	const routeOut = hasQuote ? BigInt(route!.amountOut) : 0n;
	const routeMinOut = hasQuote ? BigInt(route!.minAmountOut) : 0n;
	// 1 pay token in receive tokens, from the quote itself so it includes every fee on the way
	const rate =
		hasQuote && amountRaw > 0n
			? parseFloat(formatUnits(routeOut, receiveToken.decimals)) / parseFloat(formatUnits(amountRaw, payToken.decimals))
			: undefined;
	const routeMessage = isQuoting
		? 'Finding the best route...'
		: noRoute
			? 'No route available for this pair.'
			: 'Enter an amount to see the route.';

	return (
		<>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Zap */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
					<div>
						<h3 className="font-semibold text-usdu-black text-lg">Zap In</h3>
						<p className="text-text-secondary">
							Pay with any token and end up in USDU, EURU, CHFU or their reward vaults, in a single transaction.
						</p>
					</div>

					<TokenInput
						label="You pay"
						symbol={payToken.symbol}
						logoURI={payToken.logoURI}
						digit={payToken.decimals}
						value={amountRawInput}
						onChange={setAmountRawInput}
						onTokenClick={() => setPicker('pay')}
						max={isConnected ? balanceRaw : undefined}
						reset={isConnected ? 0n : undefined}
						onReset={() => setAmountRawInput('')}
						limitLabel={isConnected ? 'Balance' : undefined}
						limit={balanceRaw}
						limitDigit={payToken.decimals}
						error={insufficientBalance ? `Insufficient ${payToken.symbol} balance.` : undefined}
					/>

					<TokenInput
						label="You receive (estimated)"
						symbol={receiveToken.symbol}
						logoURI={receiveToken.logoURI}
						output={hasQuote ? fmtAmount(routeOut, receiveToken.decimals) : '0'}
						onTokenClick={() => setPicker('receive')}
						limitLabel={isConnected ? 'Balance' : undefined}
						limit={receiveBalanceRaw}
						limitDigit={receiveToken.decimals}
						disabled
						note={
							hasQuote ? `Min. received: ${fmtAmount(routeMinOut, receiveToken.decimals)} ${receiveToken.symbol}` : undefined
						}
						error={noRoute ? noRouteReason : undefined}
					/>

					<ApproveActionInput
						actionLabel="Zap In"
						approvals={
							isNativeEth
								? []
								: [
										{
											tokenSymbol: payToken.symbol,
											needsApproval: amountRaw === 0n || needsApproval,
											isApproving: isBusy && pendingStep === 'approve',
											onApprove: handleApprove,
										},
									]
						}
						isActing={isBusy && pendingStep === 'zap'}
						disabled={!isAvailable || !hasQuote || amountRaw === 0n || insufficientBalance || isBusy}
						onAction={handleAction}
						isConnected={isConnected}
						onConnect={() => open()}
						hint={
							!isAvailable
								? 'The zapper contract is not deployed yet. You can preview routes, but not send a zap.'
								: undefined
						}
					/>
				</div>

				{/* Route and details */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface h-full space-y-6">
					<div>
						<h3 className="font-semibold text-usdu-black text-lg">Route</h3>
						<p className="text-text-secondary">
							{hasQuote
								? `${route!.steps.length} ${route!.steps.length === 1 ? 'swap' : 'swaps'}, executed in one transaction.`
								: 'The cheapest path through the swap modules, Curve pools and Enso.'}
						</p>
					</div>

					{hasQuote ? (
						<div className="rounded-lg bg-card divide-y divide-table-alt">
							{[
								{
									key: 'pay',
									label: 'You pay',
									token: payToken,
									raw: amountRaw,
									decimals: payToken.decimals,
								},
								// every step but the last lands in a token on the way; the last one is what you receive
								...route!.steps.slice(0, -1).map((st, i) => ({
									key: `hop-${i}`,
									label: stepDetails(st),
									token: {
										symbol: st.tokenOut.symbol,
										address: st.tokenOut.address,
										logoURI: undefined as string | undefined,
									},
									raw: BigInt(st.amountOut),
									decimals: st.tokenOut.decimals,
								})),
								{
									key: 'receive',
									label: 'You receive (est.)',
									token: receiveToken,
									raw: routeOut,
									decimals: receiveToken.decimals,
								},
							].map((row) => (
								<div key={row.key} className="flex items-center justify-between gap-4 p-4">
									<div className="flex items-center gap-3 min-w-0">
										<TokenLogo currency={row.token.symbol} logoURI={row.token.logoURI} size={8} />
										<div className="flex flex-col min-w-0">
											<span className="text-sm text-text-secondary">{row.label}</span>
											<span className="font-semibold text-text-primary">{row.token.symbol}</span>
										</div>
									</div>
									<div className="flex flex-col items-end flex-shrink-0">
										<span className="font-semibold text-text-primary">{fmtAmount(row.raw, row.decimals)}</span>
										<span className="text-sm text-text-secondary">
											{fmtUsd(row.raw, row.decimals, priceOf(row.token.address))}
										</span>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="py-12 text-center text-text-secondary">{routeMessage}</p>
					)}

					<div>
						<DetailRow
							label="Rate"
							value={
								rate !== undefined
									? `1 ${payToken.symbol} = ${rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${receiveToken.symbol}`
									: '-'
							}
						/>
						<DetailRow
							label="Min. received"
							value={
								hasQuote
									? `${fmtAmount(routeMinOut, receiveToken.decimals)} ${receiveToken.symbol} (${fmtUsd(routeMinOut, receiveToken.decimals, priceOf(receiveToken.address))})`
									: '-'
							}
						/>
						<DetailRow label="Slippage" value="0.5% per priced swap" />
						<DetailRow label="Zapper">
							{ZAPPER_SWAP_ADDRESS ? <AddressLink address={ZAPPER_SWAP_ADDRESS} /> : <span>Not deployed yet</span>}
						</DetailRow>
					</div>
				</div>
			</div>

			<TokenSelectModal
				isOpen={picker === 'pay'}
				onClose={() => setPicker(null)}
				onSelect={selectPay}
				tokens={payTokens}
				title="You pay"
				allowCustom
				showPrices
				isLoading={isLoadingTokenList}
			/>
			<TokenSelectModal
				isOpen={picker === 'receive'}
				onClose={() => setPicker(null)}
				onSelect={setReceiveToken}
				tokens={receiveTokens}
				exclude={[payToken.address]}
				showPrices
				title="You receive"
			/>
		</>
	);
}

function SwapListPageContent() {
	const router = useRouter();
	const { modules, isLoading, error } = useSwapModules();
	const { sortTab, sortReverse, handleSort } = useSort('Available In');

	const sortedModules = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...modules].sort((a, b) => dir * compareModules(sortTab, a, b));
	}, [modules, sortTab, sortReverse]);

	const { pools, isLoading: isLoadingPools, error: poolError } = useCurvePools();

	const { fxPools, redeemPools } = useMemo(
		() => ({
			fxPools: pools.filter((p) => !isRedeemPool(p)),
			redeemPools: pools.filter(isRedeemPool),
		}),
		[pools]
	);

	return (
		<div className="space-y-8">
			<PageHeader
				title="Swap"
				description="Swap between USDU stablecoins and their backing assets, at par through the swap router or at the market price through Curve pools. Select a coin or pool to get started."
			/>

			<HeroSteps steps={STEPS} />

			<ZapInCard />

			<Card variant="panel" className="space-y-8">
				<PageHeader
					title="Stable Swap"
					description="Mint fresh stablecoins, or redeem them back into their backed assets, through the swap router. Select a coin to get started."
				/>
				<Table>
					<TableHead headers={HEADERS} colSpan={5} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
					<TableBody>
						{isLoading ? (
							<TableRowEmpty>Loading swap modules...</TableRowEmpty>
						) : error ? (
							<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
						) : sortedModules.length === 0 ? (
							<TableRowEmpty>No swap modules available.</TableRowEmpty>
						) : (
							sortedModules.map((m) => (
								<TableRow
									key={m.key}
									headers={HEADERS}
									colSpan={5}
									tab={sortTab}
									onClick={() => router.push(`/dashboard/swap/${m.moduleAddress}/stable`)}
								>
									<div className="flex items-center gap-2">
										<TokenLogo currency={m.coinSymbol} size={6} className="-mr-2" />
										<TokenLogo currency={m.currency} size={6} />
										<span>
											{m.coinSymbol} / {m.currency}
										</span>
									</div>
									<span>
										{formatCompactNumber(formatUnits(m.mintable, 18), 1, '', '', false)} {m.currency}
									</span>
									<span>
										{formatCompactNumber(formatUnits(m.totalMinted, 18), 1, '')} {m.coinSymbol}
									</span>
									<span>{`${+(m.swapInFeePPM / 10_000).toFixed(2)}% / ${+(m.swapOutFeePPM / 10_000).toFixed(2)}%`}</span>
									<span>{m.vaultName || '—'}</span>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</Card>

			<CurvePoolSection
				title="FX Swap"
				description="Swap between the USDU stablecoins (USDU, EURU and CHFU) through Curve pools. These pools stay inside the ecosystem."
				pools={fxPools}
				isLoading={isLoadingPools}
				error={poolError}
				emptyText="No FX pools available."
			/>

			<CurvePoolSection
				title="Redeem Swap"
				description="Redeem out of the ecosystem into USDC through Curve pools. The USDU / USDC pool is the primary exit liquidity for USDU."
				pools={redeemPools}
				isLoading={isLoadingPools}
				error={poolError}
				emptyText="No redeem pools available."
			/>
		</div>
	);
}

export default function SwapListPage() {
	return (
		<>
			<NextSeo title={SEO.swap.title} description={SEO.swap.description} openGraph={SEO.swap.openGraph} />
			<SwapListPageContent />
		</>
	);
}
