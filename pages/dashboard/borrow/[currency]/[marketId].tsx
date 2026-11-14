import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { formatUnits, parseUnits } from 'viem';
import { faGaugeHigh, faPercent, faCalendarDays, faTag } from '@fortawesome/free-solid-svg-icons';
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/contexts/AuthContext';
import { useBorrowMarket } from '@/hooks/useBorrowMarkets';
import { useBorrowBalance } from '@/hooks/useBorrowBalance';
import { useBorrowActions } from '@/hooks/useBorrowActions';
import { PageHeader } from '@/components/ui/layout';
import { TokenInput, ApproveActionInput, TabInput, ButtonInput } from '@/components/ui/input';
import SliderInput from '@/components/ui/input/SliderInput';
import { StatGrid } from '@/components/ui/stats';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import NotFound from '@/components/ui/NotFound';
import { maxBorrow, maxLeverage, nowSeconds, priceToNumber, quoteLeverage, splitMint, feeRate } from '@/lib/borrow/math';
import { fmtCollateral, fmtDuration, fmtPercent, fmtPrice, fmtShare, isCrossMarket, stableFormat } from '@/lib/borrow/format';
import { formatTimestampLocale } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const MODES = ['Borrow', 'Leverage'];
const DAY = 86400;

function BorrowMarketPageContent() {
	const router = useRouter();
	const marketId = typeof router.query.marketId === 'string' ? Number(router.query.marketId) : undefined;
	const currency = typeof router.query.currency === 'string' ? router.query.currency : 'USDU';
	const { fmtStable, fmtStableNumber } = stableFormat(currency);

	const { isConnected } = useAuth();
	const { open } = useAppKit();
	const { market } = useBorrowMarket(currency, marketId);
	const balance = useBorrowBalance(market);
	const actions = useBorrowActions();

	const [mode, setMode] = useState(MODES[0]!);
	const [collateralInput, setCollateralInput] = useState('');
	const [days, setDays] = useState(90);
	const [borrowPct, setBorrowPct] = useState(60);
	const [leverage, setLeverage] = useState(1.5);
	const [approved, setApproved] = useState(false);

	const maxDays = market ? Math.max(1, Math.floor((market.maturity - nowSeconds()) / DAY)) : 1;
	const chosenDays = Math.min(days, maxDays);
	// the last day of the slider is the market's own maturity, anything else counts from now
	const maturity = market ? (chosenDays >= maxDays ? market.maturity : nowSeconds() + chosenDays * DAY) : 0;

	const lev = useMemo(() => (market ? maxLeverage(market, maturity) : 1), [market, maturity]);
	const levMax = Math.max(1, Math.floor(lev * 0.95 * 10) / 10);
	const levValue = Math.min(Math.max(leverage, 1.1), levMax);

	// reset the form when switching markets
	useEffect(() => {
		setCollateralInput('');
		setApproved(false);
		setMode(MODES[0]!);
	}, [marketId]);

	if (!router.isReady) return null;

	if (!market) {
		return (
			<NotFound
				title="Market Not Found"
				description="This borrow market doesn't exist or isn't available."
				ctaLabel="Back to Borrow"
				ctaHref={`/dashboard/borrow?currency=${currency}`}
			/>
		);
	}

	const amount = collateralInput ? BigInt(collateralInput) : 0n;
	const belowMin = amount > 0n && amount < market.minBalance;
	const insufficientBalance = isConnected && amount > balance.collateral;
	const isLeverage = mode === 'Leverage';

	// simple borrow
	const maxDebt = maxBorrow(market, amount);
	const debt = (maxDebt * BigInt(borrowPct)) / 100n;
	const split = splitMint(market, debt, maturity);

	// leverage
	const baseNumber = Number(formatUnits(amount, market.collateralDecimals));
	const quote = quoteLeverage(market, baseNumber, levValue, maturity);
	const quoteDebt = parseUnits(quote.debt.toFixed(6), 18);
	const exceedsLimit = isLeverage && quoteDebt > market.limit - market.borrowed;
	const leverageUnavailable = levMax < 1.1;

	const spot = priceToNumber(market.refPrice, market.collateralDecimals);
	const cushion = 1 - priceToNumber(market.price, market.collateralDecimals) / spot;
	const fee = feeRate(market, maturity);
	const needsApproval = !approved && amount > 0n;
	const hasBorrow = isLeverage ? quote.debt > 0 : debt > 0n;
	const disabled =
		amount === 0n || belowMin || insufficientBalance || exceedsLimit || (isLeverage && leverageUnavailable) || actions.isPending;

	const handleApprove = async () => {
		await actions.approve(market.collateral);
		setApproved(true);
	};

	// the approval goes out together with the action, like in the real flows
	const handleAction = async () => {
		if (needsApproval) await handleApprove();
		if (isLeverage) await actions.openLeveraged(market.marketId, amount, maturity, levValue);
		else await actions.open(market.marketId, amount, maturity, debt);
		setCollateralInput('');
	};

	const symbol = market.collateralSymbol;
	const cross = isCrossMarket(market);

	return (
		<div className="space-y-8">
			<PageHeader
				badge={{ text: 'Preview', variant: 'info' }}
				title={cross ? `${symbol} → ${currency} Cross Market` : `${symbol} / ${currency} Market`}
				description={`Borrow ${currency} against ${symbol} at ${fmtShare(market.rate)} APR, paid upfront until your chosen maturity. Your position price is yours to set, up to ${fmtPrice(market, market.price)}.`}
				breadcrumbs={[{ label: 'Borrow', href: `/dashboard/borrow?currency=${currency}` }, { label: `${symbol} Market` }]}
			/>

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 4 }}
				stats={[
					{ icon: faGaugeHigh, label: 'Available', value: fmtStable(market.limit - market.borrowed, false) },
					{ icon: faPercent, label: 'Rate', value: `${fmtShare(market.rate)} APR` },
					{ icon: faTag, label: 'Max Position Price', value: fmtPrice(market, market.price) },
					{ icon: faCalendarDays, label: 'Latest Maturity', value: formatTimestampLocale(market.maturity) },
				]}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Borrow / Leverage */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
					<h3 className="font-semibold text-usdu-black text-lg">{isLeverage ? 'Leveraged Borrow' : 'Borrow'}</h3>

					<TabInput tabs={MODES} tab={mode} setTab={setMode} />

					<TokenInput
						label={isLeverage ? 'Your collateral' : 'Collateral'}
						symbol={symbol}
						digit={market.collateralDecimals}
						value={collateralInput}
						onChange={setCollateralInput}
						max={isConnected ? balance.collateral : undefined}
						reset={isConnected ? 0n : undefined}
						onReset={() => setCollateralInput('')}
						limitLabel={isConnected ? 'Balance' : undefined}
						limit={balance.collateral}
						limitDigit={market.collateralDecimals}
						note={`Minimum ${fmtCollateral(market, market.minBalance)}`}
						error={
							belowMin
								? `Below the minimum of ${fmtCollateral(market, market.minBalance)}.`
								: insufficientBalance
									? `Insufficient ${symbol} balance.`
									: undefined
						}
					/>

					<SliderInput
						label="Maturity"
						value={chosenDays}
						onChange={setDays}
						min={Math.min(7, maxDays)}
						max={maxDays}
						formatValue={(v) => `${v} days · ${formatTimestampLocale(v >= maxDays ? market.maturity : nowSeconds() + v * DAY)}`}
						hint={`Interest of ${fmtShare(fee)} is charged upfront. Repay before maturity, or the collateral is auctioned.`}
					/>

					{isLeverage ? (
						<SliderInput
							label="Leverage"
							value={levValue}
							onChange={setLeverage}
							min={1.1}
							max={Math.max(levMax, 1.1)}
							step={0.1}
							formatValue={(v) => `${v.toFixed(1)}x`}
							minLabel="1.1x"
							maxLabel={`${levMax.toFixed(1)}x`}
							hint={
								leverageUnavailable
									? 'The position price is too close to the market price to loop on this market.'
									: 'Borrow, swap into more collateral and deposit, repeated in one transaction.'
							}
						/>
					) : (
						<SliderInput
							label="Borrow"
							value={borrowPct}
							onChange={setBorrowPct}
							min={0}
							max={100}
							formatValue={(v) => `${v}% · ${fmtStable((maxDebt * BigInt(v)) / 100n)}`}
							minLabel="0"
							maxLabel={`Max ${fmtStable(maxDebt)}`}
							hint="The gross debt includes the reserve, which you get back when you repay."
						/>
					)}

					<div className="space-y-1">
						{isLeverage ? (
							<>
								<DetailRow label="Total collateral" value={`${+quote.collateral.toFixed(4)} ${symbol}`} />
								<DetailRow label="Collateral bought" value={`${+(quote.collateral - baseNumber).toFixed(4)} ${symbol}`} />
								<DetailRow label="Gross debt" value={fmtStableNumber(quote.debt)} />
								<DetailRow label="Reserve (returned on repay)" value={fmtStableNumber(quote.reserve)} />
								<DetailRow label="Upfront interest" value={fmtStableNumber(quote.fee)} />
								<DetailRow label="Repay to close" value={fmtStableNumber(quote.debt - quote.reserve)} />
								<DetailRow label="Price buffer" value={`${fmtPercent(quote.buffer, 0)} below market`} />
							</>
						) : (
							<>
								<DetailRow label="You receive" value={fmtStable(split.received)} />
								<DetailRow label="Reserve (returned on repay)" value={fmtStable(split.reserve)} />
								<DetailRow label="Upfront interest" value={fmtStable(split.fee)} />
								<DetailRow label="Repay to close" value={fmtStable(debt - split.reserve)} />
								<DetailRow label="Position price" value={fmtPrice(market, market.price)} />
								<DetailRow label="Price buffer" value={`${fmtPercent(cushion, 0)} below market`} />
							</>
						)}
					</div>

					<ApproveActionInput
						actionLabel={isLeverage ? 'Open leveraged position' : hasBorrow ? 'Borrow' : 'Open position'}
						approvals={[
							{
								tokenSymbol: symbol,
								needsApproval,
							},
						]}
						isActing={actions.isPending}
						disabled={disabled}
						onAction={handleAction}
						isConnected={isConnected}
						onConnect={() => open()}
						hint={isLeverage ? 'Swap slippage is not included in this estimate.' : undefined}
					/>
				</div>

				{/* Details */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface h-full flex flex-col">
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Market</h3>

					<DetailRow label={cross ? 'Exchange rate' : 'Market price'} value={fmtPrice(market, market.refPrice)} />
					<DetailRow label="Max position price" value={fmtPrice(market, market.price)} />
					<DetailRow label="Rate" value={`${fmtShare(market.rate)} APR, upfront`} />
					<DetailRow label="Reserve" value={fmtShare(market.reserve, 0)} />
					<DetailRow label="Minimum collateral" value={fmtCollateral(market, market.minBalance)} />
					<DetailRow label="Auction duration" value={fmtDuration(market.auction)} />
					<DetailRow label="Latest maturity" value={formatTimestampLocale(market.maturity)} />
					<DetailRow label="Borrowed" value={fmtStable(market.borrowed)} />
					<DetailRow label="Limit" value={fmtStable(market.limit)} />
					<DetailRow label="Bad debt" value={fmtStable(market.badDebt)} />

					<h3 className="font-semibold text-usdu-black text-lg mt-10 mb-3">Addresses</h3>
					<DetailRow label="Collateral">
						<AddressLink address={market.collateral} />
					</DetailRow>

					{market.badDebt > 0n && (
						<div className="mt-6 pt-4 space-y-3">
							<p className="text-sm text-text-secondary">
								Liquidations of this market left unbacked debt behind. Covering it burns your USDU and frees the
								market&apos;s capacity again.
							</p>
							<ButtonInput
								label="Cover bad debt"
								variant="outline"
								disabled={!isConnected || balance.stable === 0n || actions.isPending}
								onClick={() => actions.coverBadDebt(market.marketId, market.badDebt)}
							/>
						</div>
					)}

					<p className="mt-6 lg:mt-auto pt-4 text-sm text-text-secondary">
						{cross
							? `${symbol} and ${currency} are both native stablecoins, so the exchange rate moves little and positions can run at high leverage. There is no oracle: a position price above the fair exchange rate can be challenged.`
							: 'There is no oracle. A position price above what the market would pay can be challenged: the collateral is then auctioned and the challenger earns a reward.'}
					</p>
				</div>
			</div>
		</div>
	);
}

export default function BorrowMarketPage() {
	return (
		<>
			<NextSeo title={SEO.borrowMarket.title} description={SEO.borrowMarket.description} openGraph={SEO.borrowMarket.openGraph} />
			<BorrowMarketPageContent />
		</>
	);
}
