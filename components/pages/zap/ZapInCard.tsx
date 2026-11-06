import { useEffect, useMemo, useState } from 'react';
import { erc20Abi, formatUnits, isAddress, parseUnits, type Address } from 'viem';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useBalance, useReadContracts } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/contexts/AuthContext';
import { useZapperSwap, type ZapperSwapStepJson } from '@/hooks/useZapperSwap';
import { ZAPPER_SWAP_ADDRESS } from '@/lib/constants';
import { TOKENS } from '@/lib/tokens/config';
import { TokenInput, ApproveActionInput, TokenSelectModal, type TokenOption } from '@/components/ui/input';
import { fetchCowTokenList, getMergedTokenList } from '@/lib/tokens/cow-service';
import { DetailRow } from '@/components/ui/modal';
import { TokenLogo } from '@/components/ui/logo';
import AddressLink from '@/components/ui/AddressLink';

const NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const ZAP_STABLES = ['USDU', 'EURU', 'CHFU'];
const PROTOCOL_SYMBOLS = [...ZAP_STABLES, 'rUSDU', 'rEURU', 'rCHFU'];

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

export interface ZapInPrefill {
	/** Pay token: a symbol (e.g. USDC) or an address. */
	from?: string;
	/** Receive token: any token in the list (symbol or address), e.g. USDU, rEURU, ETH, USDC. */
	to?: string;
	/** A decimal amount like "1.5", or "max" for the whole wallet balance. */
	amount?: string;
}

export default function ZapInCard({
	prefill,
	onTokensChange,
}: {
	prefill?: ZapInPrefill;
	/** Called with the current pair on mount and whenever either token changes. */
	onTokensChange?: (pay: TokenOption, receive: TokenOption) => void;
}) {
	const { isConnected, address } = useAuth();
	const { open } = useAppKit();

	const { data: cowTokens, isLoading: isLoadingTokenList } = useQuery({
		queryKey: ['cow-token-list'],
		queryFn: fetchCowTokenList,
		staleTime: 60 * 60 * 1000,
	});

	// One list for both sides: protocol stables, reward shares and ETH first, then the whole CoW list (search also takes a pasted address)
	const tokens = useMemo<TokenOption[]>(() => {
		const protocol = [...ZAP_STABLES, 'rUSDU', 'rEURU', 'rCHFU', 'ETH'].map((s) => asOption(TOKENS[s]));
		const merged = getMergedTokenList(cowTokens ?? [], 1).map(asOption);
		const seen = new Set(protocol.map((t) => t.address.toLowerCase()));
		return [...protocol, ...merged.filter((t) => !seen.has(t.address.toLowerCase()))];
	}, [cowTokens]);

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

	// Prefill from the URL, applied once: tokens first, then the amount ("max" waits for the wallet balance)
	const prefillKey = `${prefill?.from}|${prefill?.to}|${prefill?.amount}`;
	const [applied, setApplied] = useState<{ key: string; tokens: boolean; amount: boolean }>({ key: '', tokens: false, amount: false });
	const prefillState = applied.key === prefillKey ? applied : { key: prefillKey, tokens: false, amount: false };
	const matchToken = (list: TokenOption[], q?: string) =>
		q ? list.find((t) => t.address.toLowerCase() === q.toLowerCase() || t.symbol.toLowerCase() === q.toLowerCase()) : undefined;

	// A pay token outside every list can still be addressed by its contract address
	const unknownFrom = !!prefill?.from && isAddress(prefill.from) && !matchToken(tokens, prefill.from);
	const { data: fromMeta, isFetched: fromMetaFetched } = useReadContracts({
		contracts: unknownFrom
			? [
					{ address: prefill!.from as Address, abi: erc20Abi, functionName: 'symbol' as const },
					{ address: prefill!.from as Address, abi: erc20Abi, functionName: 'decimals' as const },
					{ address: prefill!.from as Address, abi: erc20Abi, functionName: 'name' as const },
				]
			: [],
		query: { enabled: unknownFrom },
	});

	const listsReady = !isLoadingTokenList && (!unknownFrom || fromMetaFetched);
	useEffect(() => {
		if (!prefill || prefillState.tokens || !listsReady) return;
		const from =
			matchToken(tokens, prefill.from) ??
			(unknownFrom && fromMeta?.[0]?.result
				? asOption({
						address: prefill.from!,
						symbol: fromMeta![0].result as string,
						decimals: Number(fromMeta![1]?.result),
						name: (fromMeta![2]?.result as string) ?? undefined,
					})
				: undefined);
		const to = matchToken(tokens, prefill.to);
		const nextPay = from ?? payToken;
		let nextReceive = to ?? receiveToken;
		if (nextPay.address.toLowerCase() === nextReceive.address.toLowerCase()) {
			nextReceive = tokens.find((r) => r.address.toLowerCase() !== nextPay.address.toLowerCase()) ?? nextReceive;
		}
		setPayToken(nextPay);
		setReceiveToken(nextReceive);
		setApplied({ key: prefillKey, tokens: true, amount: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [prefillKey, listsReady, tokens, fromMeta]);

	useEffect(() => {
		onTokensChange?.(payToken, receiveToken);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [payToken, receiveToken]);

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
	const inProtocol = (t: TokenOption) => PROTOCOL_SYMBOLS.includes(t.symbol);
	// Into the protocol is a zap in, out of it a zap out, and anything else is a plain swap through Enso
	const action = inProtocol(receiveToken) ? 'Zap In' : inProtocol(payToken) ? 'Zap Out' : 'Swap';
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
							args: [address as Address, ZAPPER_SWAP_ADDRESS],
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

	const receivesEth = receiveToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();
	const { data: receiveBalanceData, refetch: refetchReceiveToken } = useReadContracts({
		contracts:
			address && !receivesEth
				? [{ address: receiveToken.address as Address, abi: erc20Abi, functionName: 'balanceOf' as const, args: [address as Address] }]
				: [],
		query: { enabled: !!address && !receivesEth, refetchInterval: 30_000 },
	});
	const receiveEth = useBalance({ address: address as Address, query: { enabled: receivesEth && !!address } });
	const receiveBalanceRaw = receivesEth
		? (receiveEth.data?.value ?? 0n)
		: ((receiveBalanceData?.[0]?.result as bigint | undefined) ?? 0n);
	const refetchReceive = () => {
		refetchReceiveToken();
		receiveEth.refetch();
	};

	useEffect(() => {
		if (!prefill?.amount || !prefillState.tokens || prefillState.amount) return;
		if (prefill.amount.toLowerCase() === 'max') {
			if (balanceRaw === 0n) return; // wait for the wallet (or stay empty when not connected / nothing to spend)
			setAmountRawInput(balanceRaw.toString());
		} else {
			try {
				const raw = parseUnits(prefill.amount, payToken.decimals);
				if (raw > 0n) setAmountRawInput(raw.toString());
			} catch {
				// not a number: leave the input empty
			}
		}
		setApplied({ ...prefillState, amount: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [prefillState.tokens, prefillState.amount, balanceRaw, payToken.address]);

	const { approve, zap, isPending, isConfirming, isConfirmed, reset } = useZapperSwap();
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
			setReceiveToken(tokens.find((r) => r.address.toLowerCase() !== t.address.toLowerCase()) ?? receiveToken);
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
			? `${payToken.symbol} to ${receiveToken.symbol} goes outside the protocol, so it needs Enso routing, which is not configured on this server yet.`
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
						<h3 className="font-semibold text-usdu-black text-lg">{action}</h3>
						<p className="text-text-secondary">
							Pay with any token and end up in USDU, EURU, CHFU, their reward vaults or any other token, in a single
							transaction.
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
							hasQuote
								? `Min. received: ${fmtAmount(routeMinOut, receiveToken.decimals)} ${receiveToken.symbol} (0.5% slippage)`
								: undefined
						}
						error={noRoute ? noRouteReason : undefined}
					/>

					<ApproveActionInput
						actionLabel={action}
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
						disabled={!hasQuote || amountRaw === 0n || insufficientBalance || isBusy}
						onAction={handleAction}
						isConnected={isConnected}
						onConnect={() => open()}
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
						<DetailRow label="Zapper">
							<AddressLink address={ZAPPER_SWAP_ADDRESS} />
						</DetailRow>
					</div>
				</div>
			</div>

			<TokenSelectModal
				isOpen={picker === 'pay'}
				onClose={() => setPicker(null)}
				onSelect={selectPay}
				tokens={tokens}
				title="You pay"
				allowCustom
				showPrices
				isLoading={isLoadingTokenList}
			/>
			<TokenSelectModal
				isOpen={picker === 'receive'}
				onClose={() => setPicker(null)}
				onSelect={setReceiveToken}
				tokens={tokens}
				exclude={[payToken.address]}
				title="You receive"
				allowCustom
				showPrices
				isLoading={isLoadingTokenList}
			/>
		</>
	);
}
