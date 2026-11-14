import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { faGavel, faTag, faCoins, faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/contexts/AuthContext';
import { useNow } from '@/hooks/ui/useNow';
import { useBorrowChallenge } from '@/hooks/useBorrowChallenges';
import { useBorrowBalance } from '@/hooks/useBorrowBalance';
import { useBorrowActions } from '@/hooks/useBorrowActions';
import { PageHeader } from '@/components/ui/layout';
import { Badge } from '@/components/ui/Badge';
import { TokenInput, ApproveActionInput } from '@/components/ui/input';
import { TimeSeriesChart } from '@/components/ui/charts';
import { StatGrid } from '@/components/ui/stats';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import NotFound from '@/components/ui/NotFound';
import { AUCTION_PRICE_FACTOR, ONE, auctionPrice, auctionTurningPoint, priceToNumber } from '@/lib/borrow/math';
import { fmtCollateral, fmtDuration, fmtPercent, fmtPrice, stableFormat } from '@/lib/borrow/format';
import { formatCompactNumber } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const CURVE_POINTS = 48;

function BorrowAuctionPageContent() {
	const router = useRouter();
	const challengeId = typeof router.query.id === 'string' ? Number(router.query.id) : undefined;
	const currency = typeof router.query.currency === 'string' ? router.query.currency : 'USDU';
	const { fmtStable } = stableFormat(currency);

	const { isConnected } = useAuth();
	const { open } = useAppKit();
	const now = useNow();
	const { challenge: c } = useBorrowChallenge(currency, challengeId);
	const balance = useBorrowBalance(c?.position.market);
	const actions = useBorrowActions();

	const [input, setInput] = useState('');
	const [approved, setApproved] = useState(false);

	useEffect(() => {
		setInput('');
		setApproved(false);
	}, [challengeId]);

	// the whole price path of the auction, so bidders see where they are on the curve
	const curve = useMemo(() => {
		if (!c) return [];
		const { market, price } = c.position;
		return Array.from({ length: CURVE_POINTS + 1 }, (_, i) => {
			const t = c.startTime + Math.round((market.auction * i) / CURVE_POINTS);
			return { t, v: priceToNumber(auctionPrice(c.startTime, market.auction, price, t), market.collateralDecimals) };
		});
	}, [c]);

	if (!router.isReady) return null;

	if (!c) {
		return (
			<NotFound
				title="Auction Not Found"
				description="This challenge doesn't exist or has already ended."
				ctaLabel="Back to Borrow"
				ctaHref={`/dashboard/borrow?currency=${currency}`}
			/>
		);
	}

	const p = c.position;
	const m = p.market;
	const price = auctionPrice(c.startTime, m.auction, p.price, now);
	const averting = price >= p.price;
	const endsAt = c.startTime + m.auction;
	const size = input ? BigInt(input) : 0n;
	const bidSize = size < c.collateralSize ? size : c.collateralSize;
	const cost = (price * bidSize) / ONE;
	const vsMarket = m.refPrice === 0n ? 0 : Number((price * 10000n) / m.refPrice) / 10000 - 1;
	const needsApproval = !approved && size > 0n;
	const insufficient = isConnected && cost > balance.stable;

	const handleApprove = async () => {
		await actions.approve('stable');
		setApproved(true);
	};

	// the approval goes out together with the bid, like in the real flows
	const handleBid = async () => {
		if (needsApproval) await handleApprove();
		await actions.bid(c.challengeId, bidSize);
		setInput('');
	};

	return (
		<div className="space-y-8">
			<PageHeader
				title={`Challenge #${c.challengeId}`}
				description={`A challenge against ${m.collateralSymbol} position #${p.positionId}. The price falls with every second, bid when it suits you.`}
				breadcrumbs={[
					{ label: 'Borrow', href: `/dashboard/borrow?currency=${currency}` },
					{ label: 'Auctions', href: `/dashboard/borrow?currency=${currency}` },
					{ label: `Challenge #${c.challengeId}` },
				]}
				badge={{ text: averting ? 'Averting' : 'Liquidating', variant: averting ? 'success' : 'error' }}
			/>

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 4 }}
				stats={[
					{ icon: faGavel, label: 'Auction Price', value: fmtPrice(m, price) },
					{ icon: faTag, label: 'Position Price', value: fmtPrice(m, p.price) },
					{ icon: faCoins, label: 'Challenge Size', value: fmtCollateral(m, c.collateralSize) },
					{ icon: faHourglassHalf, label: 'Time Left', value: now < endsAt ? fmtDuration(endsAt - now) : 'Ended' },
				]}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Bid */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
					<h3 className="font-semibold text-usdu-black text-lg">Bid</h3>

					<div className="flex items-start gap-3">
						<Badge
							text={averting ? 'At or above position price' : 'Below position price'}
							variant="custom"
							size="md"
							customColor={averting ? 'text-success' : 'text-error'}
							customBgColor={averting ? 'bg-success-bg' : 'bg-error-bg'}
						/>
					</div>
					<p className="text-sm text-text-secondary">
						{averting
							? `Your bid averts the challenge. You pay the challenger and receive their ${m.collateralSymbol}, the position is left untouched and goes into a cooldown.`
							: `The challenge succeeded. You buy the collateral of position #${p.positionId}, its debt is settled from your payment and the challenger gets their ${m.collateralSymbol} back plus a reward.`}
					</p>

					<TokenInput
						label="Collateral to buy"
						symbol={m.collateralSymbol}
						digit={m.collateralDecimals}
						value={input}
						onChange={setInput}
						max={c.collateralSize}
						reset={0n}
						onReset={() => setInput('')}
						limitLabel="Available"
						limit={c.collateralSize}
						limitDigit={m.collateralDecimals}
						error={insufficient ? `Insufficient ${currency} balance.` : undefined}
					/>

					<div className="space-y-1">
						<DetailRow label="You pay" value={fmtStable(cost)} />
						<DetailRow label="Price vs. market" value={`${vsMarket >= 0 ? '+' : ''}${fmtPercent(vsMarket, 1)}`} />
						<DetailRow label="Your balance" value={isConnected ? fmtStable(balance.stable) : '—'} />
					</div>

					<ApproveActionInput
						actionLabel={averting ? 'Bid and avert' : 'Bid'}
						approvals={[
							{
								tokenSymbol: currency,
								needsApproval,
							},
						]}
						isActing={actions.isPending}
						disabled={size === 0n || insufficient || now >= endsAt || actions.isPending}
						onAction={handleBid}
						isConnected={isConnected}
						onConnect={() => open()}
						hint="The price keeps falling until you confirm, so a later block can only be cheaper."
					/>
				</div>

				{/* Curve and details */}
				<div className="space-y-6">
					<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-4">
						<div>
							<h3 className="font-semibold text-usdu-black text-lg">Price Curve</h3>
							<p className="text-sm text-text-secondary">
								Starts at {String(AUCTION_PRICE_FACTOR)}x the position price and falls to zero. It crosses the position
								price after {fmtDuration(m.auction * auctionTurningPoint())}.
							</p>
						</div>
						<TimeSeriesChart
							points={curve}
							variant="line"
							formatValue={(v) => `${v.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${currency}`}
							formatTick={(v) => formatCompactNumber(v, 1, '')}
						/>
					</div>

					<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
						<h3 className="font-semibold text-usdu-black text-lg mb-3">Details</h3>
						<DetailRow label="Position">
							<Link className="text-brand hover:underline" href={`/dashboard/borrow/${currency}/position/${p.positionId}`}>
								#{p.positionId}
							</Link>
						</DetailRow>
						<DetailRow label="Challenger">
							<AddressLink address={c.challenger} />
						</DetailRow>
						<DetailRow label="Position owner">
							<AddressLink address={p.owner} />
						</DetailRow>
						<DetailRow label="Position debt" value={fmtStable(p.borrowed)} />
						<DetailRow label="Auction duration" value={fmtDuration(m.auction)} />
					</div>
				</div>
			</div>
		</div>
	);
}

export default function BorrowAuctionPage() {
	return (
		<>
			<NextSeo title={SEO.borrowAuction.title} description={SEO.borrowAuction.description} openGraph={SEO.borrowAuction.openGraph} />
			<BorrowAuctionPageContent />
		</>
	);
}
