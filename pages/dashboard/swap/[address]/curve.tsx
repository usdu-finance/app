import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faDroplet, faScaleBalanced, faLayerGroup, faTag } from '@fortawesome/free-solid-svg-icons';
import { useAppKit } from '@reown/appkit/react';
import { ICurveStableSwapNG_ABI, ITwocrypto_ABI } from '@usdu-finance/usdu-core';
import { useAuth } from '@/contexts/AuthContext';
import { useCurvePools } from '@/hooks/useCurvePools';
import { useSwapBalances } from '@/hooks/useSwapBalances';
import { useSwap } from '@/hooks/useSwap';
import { PageHeader } from '@/components/ui/layout';
import { TokenInput, ButtonInput, TabInput } from '@/components/ui/input';
import { StatGrid } from '@/components/ui/stats';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import AppLink from '@/components/ui/AppLink';
import NotFound from '@/components/ui/NotFound';
import { formatCompactNumber } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO, getCurvePoolUrl } from '@/lib/constants';

const SLIPPAGE_BPS = 50n; // 0.5%

function SwapCurveDetailPageContent() {
	const router = useRouter();
	const addressParam = typeof router.query.address === 'string' ? router.query.address.toLowerCase() : undefined;

	const { isConnected, address } = useAuth();
	const { open } = useAppKit();

	const { pools, isLoading, error } = useCurvePools();
	const selectedPool = pools.find((p) => p.poolAddress.toLowerCase() === addressParam);

	const [tok0, tok1] = selectedPool?.tokens ?? [];
	const directionTabs = selectedPool
		? [
				`${selectedPool.tokens[0].symbol} → ${selectedPool.tokens[1].symbol}`,
				`${selectedPool.tokens[1].symbol} → ${selectedPool.tokens[0].symbol}`,
			]
		: [];
	const [directionTab, setDirectionTab] = useState('');
	const zeroForOne = directionTab !== directionTabs[1]; // true: pay coin0, receive coin1

	const [amountRawInput, setAmountRawInput] = useState('');

	// Reset the direction tab and amount whenever the selected pool changes
	useEffect(() => {
		setDirectionTab(directionTabs[0] ?? '');
		setAmountRawInput('');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedPool?.key]);

	// The pool itself is the allowance spender (no router); balances hook treats coin0/coin1 as coin/target
	const balances = useSwapBalances(
		tok0?.address,
		tok0?.decimals ?? 18,
		address as `0x${string}` | undefined,
		selectedPool?.poolAddress,
		tok1?.address
	);

	const inTok = zeroForOne ? tok0 : tok1;
	const outTok = zeroForOne ? tok1 : tok0;
	const inputDecimals = inTok?.decimals ?? 18;
	const outputDecimals = outTok?.decimals ?? 18;
	const inputBalanceRaw = zeroForOne ? balances.coinBalanceRaw : balances.targetBalanceRaw;
	const outputBalanceRaw = zeroForOne ? balances.targetBalanceRaw : balances.coinBalanceRaw;
	const allowanceRaw = zeroForOne ? balances.coinAllowanceRaw : balances.targetAllowanceRaw;

	const amountRaw = amountRawInput ? BigInt(amountRawInput) : 0n;
	const i = zeroForOne ? 0n : 1n;
	const j = zeroForOne ? 1n : 0n;

	// Quote through the pool's own get_dy; stable and twocrypto pools have different ABIs
	const quoteEnabled = !!selectedPool && amountRaw > 0n && selectedPool.totalSupply > 0n;
	const { data: stableQuote } = useReadContract({
		address: selectedPool?.poolAddress,
		abi: ICurveStableSwapNG_ABI,
		functionName: 'get_dy',
		args: [i, j, amountRaw],
		query: { enabled: quoteEnabled && selectedPool?.kind === 'stable' },
	});
	const { data: twocryptoQuote } = useReadContract({
		address: selectedPool?.poolAddress,
		abi: ITwocrypto_ABI,
		functionName: 'get_dy',
		args: [i, j, amountRaw],
		query: { enabled: quoteEnabled && selectedPool?.kind === 'twocrypto' },
	});
	const quote = selectedPool?.kind === 'stable' ? stableQuote : twocryptoQuote;
	const outputRaw = amountRaw > 0n ? ((quote as bigint | undefined) ?? 0n) : 0n;

	// Price card: always 1 unit of coin1 quoted in coin0 (e.g. USDC per USDU), from a live 1-unit get_dy(1 -> 0)
	const priceDx = 10n ** BigInt(tok1?.decimals ?? 18);
	const priceEnabled = !!selectedPool && selectedPool.totalSupply > 0n;
	const { data: stablePrice } = useReadContract({
		address: selectedPool?.poolAddress,
		abi: ICurveStableSwapNG_ABI,
		functionName: 'get_dy',
		args: [1n, 0n, priceDx],
		query: { enabled: priceEnabled && selectedPool?.kind === 'stable' },
	});
	const { data: twocryptoPrice } = useReadContract({
		address: selectedPool?.poolAddress,
		abi: ITwocrypto_ABI,
		functionName: 'get_dy',
		args: [1n, 0n, priceDx],
		query: { enabled: priceEnabled && selectedPool?.kind === 'twocrypto' },
	});
	const priceRaw = (selectedPool?.kind === 'stable' ? stablePrice : twocryptoPrice) as bigint | undefined;

	const minOutRaw = (outputRaw * (10_000n - SLIPPAGE_BPS)) / 10_000n;

	const { approve, curveExchange, isPending, isConfirming, isConfirmed, reset } = useSwap();
	const [pendingStep, setPendingStep] = useState<'approve' | 'swap' | null>(null);
	const isBusy = isPending || isConfirming;

	// Refetch balances and reset input once a submitted transaction confirms
	useEffect(() => {
		if (isConfirmed) {
			balances.refetch();
			if (pendingStep === 'swap') {
				setAmountRawInput('');
			}
			setPendingStep(null);
			reset();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isConfirmed]);

	const needsApproval = amountRaw > 0n && allowanceRaw < amountRaw;
	const insufficientBalance = amountRaw > 0n && amountRaw > inputBalanceRaw;
	const noLiquidity = !!selectedPool && selectedPool.totalSupply === 0n;

	const handleAction = async () => {
		if (!selectedPool || amountRaw === 0n || minOutRaw === 0n) return;

		try {
			if (needsApproval) {
				setPendingStep('approve');
				await approve(selectedPool.tokens[zeroForOne ? 0 : 1].address, selectedPool.poolAddress, amountRaw);
				return;
			}

			setPendingStep('swap');
			await curveExchange(selectedPool.kind, selectedPool.poolAddress, i, j, amountRaw, minOutRaw);
		} catch {
			setPendingStep(null);
		}
	};

	const actionLabel = !isConnected
		? 'Connect Wallet'
		: noLiquidity
			? 'No Liquidity'
			: isBusy
				? pendingStep === 'approve'
					? 'Approving...'
					: 'Swapping...'
				: needsApproval
					? `Approve ${inTok?.symbol}`
					: 'Swap';

	if (!router.isReady || isLoading) {
		return (
			<div className="space-y-8">
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-text-secondary">Loading curve pools...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-8">
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-red-500">Error: {error}</p>
					</div>
				</div>
			</div>
		);
	}

	if (!selectedPool) {
		return (
			<NotFound
				title="Pool Not Found"
				description="This curve pool doesn't exist or isn't available."
				ctaLabel="Back to Swap"
				ctaHref="/dashboard/swap"
			/>
		);
	}

	const [token0, token1] = selectedPool.tokens;
	const inToken = zeroForOne ? token0 : token1;
	const outToken = zeroForOne ? token1 : token0;

	const compositionLabel =
		selectedPool.totalValue > 0 ? `${(selectedPool.ratios[0] * 100).toFixed(1)}% / ${(selectedPool.ratios[1] * 100).toFixed(1)}%` : '—';
	// Falls back to the pool's price scale (1 for stable pools) while there is no quote, e.g. an empty pool
	const price =
		priceRaw !== undefined ? parseFloat(formatUnits(priceRaw, token0.decimals)) : parseFloat(formatUnits(selectedPool.priceScale, 18));
	const priceLabel = `${price.toFixed(4)} ${token0.symbol}`;

	return (
		<div className="space-y-8">
			<PageHeader
				title={selectedPool.label}
				description={`Swap between ${token0.symbol} and ${token1.symbol} directly against this Curve pool.`}
				breadcrumbs={[{ label: 'Swap', href: '/dashboard/swap' }, { label: selectedPool.label }]}
			/>

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 4 }}
				stats={[
					{
						icon: faDroplet,
						label: 'Total Value Locked',
						value: formatCompactNumber(selectedPool.totalValue, 1, '', ' USDU'),
					},
					{
						icon: faScaleBalanced,
						label: `${token0.symbol} / ${token1.symbol}`,
						value: compositionLabel,
					},
					{
						icon: faLayerGroup,
						label: 'LP Supply',
						value: formatCompactNumber(formatUnits(selectedPool.totalSupply, 18), 1, '', ' LP'),
					},
					{
						icon: faTag,
						label: 'Price',
						value: priceLabel,
					},
				]}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Swap */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
					<h3 className="font-semibold text-usdu-black text-lg">Swap</h3>

					{/* Direction toggle */}
					<TabInput tabs={directionTabs} tab={directionTab} setTab={setDirectionTab} />

					{/* Amount input */}
					<TokenInput
						label="You pay"
						symbol={inToken.symbol}
						digit={inputDecimals}
						value={amountRawInput}
						onChange={setAmountRawInput}
						max={isConnected ? inputBalanceRaw : undefined}
						reset={isConnected ? 0n : undefined}
						onReset={() => setAmountRawInput('')}
						limitLabel={isConnected ? 'Balance' : undefined}
						limit={inputBalanceRaw}
						limitDigit={inputDecimals}
						error={insufficientBalance ? `Insufficient ${inToken.symbol} balance.` : undefined}
					/>

					{/* Output preview */}
					<TokenInput
						label="You receive (estimated)"
						symbol={outToken.symbol}
						output={formatUnits(outputRaw, outputDecimals)}
						disabled
						limitLabel={isConnected ? 'Balance' : undefined}
						limit={outputBalanceRaw}
						limitDigit={outputDecimals}
						note={
							outputRaw > 0n
								? `Min. received (${Number(SLIPPAGE_BPS) / 100}% slippage): ${formatUnits(minOutRaw, outputDecimals)} ${outToken.symbol}`
								: undefined
						}
					/>

					<ButtonInput
						label={actionLabel}
						size="lg"
						className="w-full"
						disabled={isConnected && (noLiquidity || amountRaw === 0n || outputRaw === 0n || insufficientBalance || isBusy)}
						loading={isConnected && isBusy}
						onClick={isConnected ? handleAction : () => open()}
						icon={!isConnected ? <FontAwesomeIcon icon={faWallet} className="w-4 h-4" /> : undefined}
					/>
				</div>

				{/* Details */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface h-full">
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Details</h3>

					<DetailRow label="Pool Type">
						<AppLink href={getCurvePoolUrl(selectedPool.poolAddress)}>
							{selectedPool.kind === 'stable' ? 'Curve StableSwap NG' : 'Curve Twocrypto NG'}
						</AppLink>
					</DetailRow>

					<h3 className="font-semibold text-usdu-black text-lg mt-10 mb-3">Addresses</h3>

					<DetailRow label="Curve Pool">
						<AddressLink address={selectedPool.poolAddress} />
					</DetailRow>
					<DetailRow label={token0.symbol}>
						<AddressLink address={token0.address} />
					</DetailRow>
					<DetailRow label={token1.symbol}>
						<AddressLink address={token1.address} />
					</DetailRow>
				</div>
			</div>
		</div>
	);
}

export default function SwapCurveDetailPage() {
	return (
		<>
			<NextSeo title={SEO.swapPool.title} description={SEO.swapPool.description} openGraph={SEO.swapPool.openGraph} />
			<SwapCurveDetailPageContent />
		</>
	);
}
