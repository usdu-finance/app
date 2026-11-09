import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faArrowTrendUp, faGavel, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { useSort } from '@/hooks/ui/useSort';
import { useNow } from '@/hooks/ui/useNow';
import { useBorrowMarkets } from '@/hooks/useBorrowMarkets';
import { useBorrowPositions, type BorrowPositionView } from '@/hooks/useBorrowPositions';
import { useBorrowChallenges, type BorrowChallengeView } from '@/hooks/useBorrowChallenges';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import { Badge } from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import HeroSteps from '@/components/ui/HeroSteps';
import { auctionPrice, debtDue } from '@/lib/borrow/math';
import {
	STATUS_COLOR,
	STATUS_LABEL,
	fmtCollateral,
	fmtDuration,
	fmtPercent,
	fmtPrice,
	fmtShare,
	isCrossMarket,
	stableFormat,
	utilization,
} from '@/lib/borrow/format';
import { ALL, CURRENCIES } from '@/lib/borrow/mock';
import { cn } from '@/lib/utils';
import type { BorrowMarket } from '@/lib/borrow/types';
import { formatTimestampLocale } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const MARKET_HEADERS = ['Collateral', 'Rate', 'Reserve', 'Maturity', 'Utilization', 'Available'];
const POSITION_HEADERS = ['Position', 'Collateral', 'Debt', 'Price', 'Maturity', 'Status'];
const CHALLENGE_HEADERS = ['Challenge', 'Size', 'Auction Price', 'Phase', 'Time Left'];
const EXPIRED_HEADERS = ['Position', 'Collateral', 'Debt', 'Auction Price', 'Phase', 'Time Left'];

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

const available = (m: BorrowMarket) => (m.limit > m.borrowed ? m.limit - m.borrowed : 0n);

function compareMarkets(tab: string, a: BorrowMarket, b: BorrowMarket): number {
	switch (tab) {
		case 'Rate':
			return compareBigint(b.rate, a.rate);
		case 'Reserve':
			return compareBigint(b.reserve, a.reserve);
		case 'Maturity':
			return b.maturity - a.maturity;
		case 'Utilization':
			return utilization(b) - utilization(a);
		case 'Available':
			return compareBigint(available(b), available(a));
		default:
			return a.collateralSymbol.localeCompare(b.collateralSymbol);
	}
}

function comparePositions(tab: string, a: BorrowPositionView, b: BorrowPositionView): number {
	switch (tab) {
		case 'Collateral':
			return compareBigint(b.balance, a.balance);
		case 'Debt':
			return compareBigint(b.borrowed, a.borrowed);
		case 'Price':
			return compareBigint(b.price, a.price);
		case 'Maturity':
			return b.maturity - a.maturity;
		case 'Status':
			return a.status.localeCompare(b.status);
		default:
			return b.positionId - a.positionId;
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faCoins} className="w-3 h-3 text-usdu-card" />,
		title: 'Cross-borrow',
		description:
			'Post one native stablecoin, borrow another, at a fixed rate and maturity. No oracle, you set your own liquidation price.',
	},
	{
		icon: <FontAwesomeIcon icon={faArrowTrendUp} className="w-3 h-3 text-usdu-card" />,
		title: 'Leverage',
		description: 'Loop borrow, swap and deposit in one transaction, to take a larger position in a currency or earn its carry.',
	},
	{
		icon: <FontAwesomeIcon icon={faGavel} className="w-3 h-3 text-usdu-card" />,
		title: 'Challenge and bid',
		description:
			'Challenge a position priced too high and earn a reward, bid on running auctions, or buy the collateral of matured positions.',
	},
];

/** Shared by "My positions" and "All positions". */
function PositionsTable({ positions, emptyText }: { positions: BorrowPositionView[]; emptyText: string }) {
	const router = useRouter();
	const { sortTab, sortReverse, handleSort } = useSort('Position');

	const sorted = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...positions].sort((a, b) => dir * comparePositions(sortTab, a, b));
	}, [positions, sortTab, sortReverse]);

	return (
		<Table>
			<TableHead headers={POSITION_HEADERS} colSpan={6} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
			<TableBody>
				{sorted.length === 0 ? (
					<TableRowEmpty>{emptyText}</TableRowEmpty>
				) : (
					sorted.map((p) => (
						<TableRow
							key={`${p.market.currency}-${p.positionId}`}
							headers={POSITION_HEADERS}
							colSpan={6}
							tab={sortTab}
							onClick={() => router.push(`/dashboard/borrow/${p.market.currency}/position/${p.positionId}`)}
						>
							<div className="flex items-center gap-2">
								<TokenLogo currency={p.market.collateralSymbol} size={6} className="-mr-2" />
								<TokenLogo currency={p.market.currency} size={6} />
								<span>#{p.positionId}</span>
								{p.isMine && <Badge text="You" size="sm" />}
							</div>
							<span>{fmtCollateral(p.market, p.balance)}</span>
							<span>{stableFormat(p.market.currency).fmtStable(p.borrowed)}</span>
							<span>{fmtPrice(p.market, p.price)}</span>
							<span>{formatTimestampLocale(p.maturity)}</span>
							<span>
								<Badge text={STATUS_LABEL[p.status]} variant="custom" size="md" {...STATUS_COLOR[p.status]} />
							</span>
						</TableRow>
					))
				)}
			</TableBody>
		</Table>
	);
}

interface MarketsSectionProps {
	title: string;
	description: string;
	markets: BorrowMarket[];
	isLoading: boolean;
	error: string | null;
	emptyText: string;
}

function MarketsSection({ title, description, markets, isLoading, error, emptyText }: MarketsSectionProps) {
	const router = useRouter();
	const { sortTab, sortReverse, handleSort } = useSort('Collateral');

	const sorted = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...markets].sort((a, b) => dir * compareMarkets(sortTab, a, b));
	}, [markets, sortTab, sortReverse]);

	return (
		<Card variant="panel" className="space-y-8">
			<PageHeader title={title} description={description} />
			<Table>
				<TableHead headers={MARKET_HEADERS} colSpan={6} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
				<TableBody>
					{isLoading ? (
						<TableRowEmpty>Loading markets...</TableRowEmpty>
					) : error ? (
						<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
					) : sorted.length === 0 ? (
						<TableRowEmpty>{emptyText}</TableRowEmpty>
					) : (
						sorted.map((m) => (
							<TableRow
								key={`${m.currency}-${m.marketId}`}
								headers={MARKET_HEADERS}
								colSpan={6}
								tab={sortTab}
								onClick={() => router.push(`/dashboard/borrow/${m.currency}/${m.marketId}`)}
							>
								<div className="flex items-center gap-2">
									<TokenLogo currency={m.collateralSymbol} size={6} className="-mr-2" />
									<TokenLogo currency={m.currency} size={6} />
									<span>
										{m.collateralSymbol} → {m.currency}
									</span>
								</div>
								<span>{fmtShare(m.rate)} APR</span>
								<span>{fmtShare(m.reserve, 0)}</span>
								<span>{formatTimestampLocale(m.maturity)}</span>
								<span>{fmtPercent(utilization(m), 0)}</span>
								<span>{stableFormat(m.currency).fmtStable(available(m), false)}</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</Card>
	);
}

function MarketsTab({ currency }: { currency: string }) {
	const { markets, isLoading, error } = useBorrowMarkets(currency);
	const all = currency === ALL;
	const others = CURRENCIES.filter((c) => c !== currency).join(' and ');

	return (
		<>
			<MarketsSection
				title="Cross Markets"
				description={
					all
						? 'Post one native stablecoin and borrow another. Same-ecosystem collateral means tight prices, low rates and high leverage.'
						: `Post ${others} and borrow ${currency}, against the other native stablecoins. Same-ecosystem collateral means tight prices, low rates and high leverage.`
				}
				markets={markets.filter(isCrossMarket)}
				isLoading={isLoading}
				error={error}
				emptyText="No cross markets available."
			/>
			<MarketsSection
				title="Asset Markets"
				description={`Borrow ${all ? 'stablecoins' : currency} against volatile collateral, with a lower price and a higher reserve.`}
				markets={markets.filter((m) => !isCrossMarket(m))}
				isLoading={isLoading}
				error={error}
				emptyText="No asset markets available."
			/>
		</>
	);
}

function AuctionsTab({ currency }: { currency: string }) {
	const router = useRouter();
	const now = useNow();
	const { challenges, expired, isLoading, error } = useBorrowChallenges(currency);

	const challengeSort = useSort('Challenge');
	const expiredSort = useSort('Position');

	const sortedChallenges = useMemo(() => {
		const dir = challengeSort.sortReverse ? -1 : 1;
		const cmp = (a: BorrowChallengeView, b: BorrowChallengeView) => {
			const ap = auctionPrice(a.startTime, a.position.market.auction, a.position.price, now);
			const bp = auctionPrice(b.startTime, b.position.market.auction, b.position.price, now);
			switch (challengeSort.sortTab) {
				case 'Size':
					return compareBigint(b.collateralSize, a.collateralSize);
				case 'Auction Price':
					return compareBigint(bp, ap);
				case 'Phase':
					return Number(bp >= b.position.price) - Number(ap >= a.position.price);
				case 'Time Left':
					return a.startTime + a.position.market.auction - (b.startTime + b.position.market.auction);
				default:
					return b.challengeId - a.challengeId;
			}
		};
		return [...challenges].sort((a, b) => dir * cmp(a, b));
	}, [challenges, challengeSort.sortTab, challengeSort.sortReverse, now]);

	const sortedExpired = useMemo(() => {
		const dir = expiredSort.sortReverse ? -1 : 1;
		const cmp = (a: BorrowPositionView, b: BorrowPositionView) => {
			const ap = auctionPrice(a.maturity, a.market.auction, a.price, now);
			const bp = auctionPrice(b.maturity, b.market.auction, b.price, now);
			switch (expiredSort.sortTab) {
				case 'Collateral':
					return compareBigint(b.balance, a.balance);
				case 'Debt':
					return compareBigint(b.borrowed, a.borrowed);
				case 'Auction Price':
					return compareBigint(bp, ap);
				case 'Phase':
					return Number(bp >= b.price) - Number(ap >= a.price);
				case 'Time Left':
					return a.maturity + a.market.auction - (b.maturity + b.market.auction);
				default:
					return b.positionId - a.positionId;
			}
		};
		return [...expired].sort((a, b) => dir * cmp(a, b));
	}, [expired, expiredSort.sortTab, expiredSort.sortReverse, now]);

	return (
		<>
			<Card variant="panel" className="space-y-8">
				<PageHeader
					title="Challenge Auctions"
					description="Running challenges. The price starts at 10x the position price and falls to zero. At or above the position price a bid averts the challenge, below it the challenge succeeds and the position's collateral is sold."
				/>
				<Table>
					<TableHead
						headers={CHALLENGE_HEADERS}
						colSpan={5}
						tab={challengeSort.sortTab}
						reverse={challengeSort.sortReverse}
						tabOnChange={challengeSort.handleSort}
					/>
					<TableBody>
						{isLoading ? (
							<TableRowEmpty>Loading challenges...</TableRowEmpty>
						) : error ? (
							<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
						) : sortedChallenges.length === 0 ? (
							<TableRowEmpty>No running challenges.</TableRowEmpty>
						) : (
							sortedChallenges.map((c) => {
								const m = c.position.market;
								const price = auctionPrice(c.startTime, m.auction, c.position.price, now);
								const averting = price >= c.position.price;
								return (
									<TableRow
										key={`${m.currency}-${c.challengeId}`}
										headers={CHALLENGE_HEADERS}
										colSpan={5}
										tab={challengeSort.sortTab}
										onClick={() => router.push(`/dashboard/borrow/${m.currency}/auction/${c.challengeId}`)}
									>
										<div className="flex items-center gap-2">
											<TokenLogo currency={m.collateralSymbol} size={6} className="-mr-2" />
											<TokenLogo currency={m.currency} size={6} />
											<span>
												#{c.challengeId} on #{c.position.positionId}
											</span>
											{c.isMine && <Badge text="You" size="sm" />}
										</div>
										<span>{fmtCollateral(m, c.collateralSize)}</span>
										<span>{fmtPrice(m, price)}</span>
										<span>
											<Badge
												text={averting ? 'Averting' : 'Liquidating'}
												variant="custom"
												size="md"
												customColor={averting ? 'text-success' : 'text-error'}
												customBgColor={averting ? 'bg-success-bg' : 'bg-error-bg'}
											/>
										</span>
										<span>{fmtDuration(c.startTime + m.auction - now)}</span>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</Card>

			<Card variant="panel" className="space-y-8">
				<PageHeader
					title="Force Sell"
					description="Positions past their maturity. Anyone can buy their collateral from the same falling auction, the debt is settled out of the proceeds."
				/>
				<Table>
					<TableHead
						headers={EXPIRED_HEADERS}
						colSpan={6}
						tab={expiredSort.sortTab}
						reverse={expiredSort.sortReverse}
						tabOnChange={expiredSort.handleSort}
					/>
					<TableBody>
						{isLoading ? (
							<TableRowEmpty>Loading expired positions...</TableRowEmpty>
						) : sortedExpired.length === 0 ? (
							<TableRowEmpty>No expired positions.</TableRowEmpty>
						) : (
							sortedExpired.map((p) => {
								const price = auctionPrice(p.maturity, p.market.auction, p.price, now);
								const aboveEnd = now < p.maturity + p.market.auction;
								const averting = price >= p.price;
								return (
									<TableRow
										key={`${p.market.currency}-${p.positionId}`}
										headers={EXPIRED_HEADERS}
										colSpan={6}
										tab={expiredSort.sortTab}
										onClick={() => router.push(`/dashboard/borrow/${p.market.currency}/position/${p.positionId}`)}
									>
										<div className="flex items-center gap-2">
											<TokenLogo currency={p.market.collateralSymbol} size={6} className="-mr-2" />
											<TokenLogo currency={p.market.currency} size={6} />
											<span>#{p.positionId}</span>
										</div>
										<span>{fmtCollateral(p.market, p.balance)}</span>
										<span>{stableFormat(p.market.currency).fmtStable(debtDue(p))}</span>
										<span>{fmtPrice(p.market, price)}</span>
										<span>
											<Badge
												text={averting ? 'Fee only' : 'Forfeit'}
												variant="custom"
												size="md"
												customColor={averting ? 'text-success' : 'text-brand'}
												customBgColor={averting ? 'bg-success-bg' : 'bg-brand/20'}
											/>
										</span>
										<span>{aboveEnd ? fmtDuration(p.maturity + p.market.auction - now) : 'Ended'}</span>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</Card>
		</>
	);
}

const TABS = ['Markets', 'My Positions', 'All Positions', 'Auctions'] as const;

function BorrowListPageContent() {
	const router = useRouter();
	const [tab, setTab] = useState<(typeof TABS)[number]>('Markets');

	// the stablecoin lives in the url, so a view can be shared
	const queryCurrency = typeof router.query.currency === 'string' ? router.query.currency.toUpperCase() : '';
	const currency = (CURRENCIES as readonly string[]).includes(queryCurrency) ? queryCurrency : ALL;

	const { positions, mine } = useBorrowPositions(currency);
	const { challenges, expired } = useBorrowChallenges(currency);
	const auctionCount = challenges.length + expired.length;
	const badges: Partial<Record<(typeof TABS)[number], number>> = { 'My Positions': mine.length, Auctions: auctionCount };

	return (
		<div className="space-y-8">
			<PageHeader
				title="Borrow"
				description="Each native stablecoin runs its own borrow market, with the other native stablecoins as primary collateral. Borrow at a fixed rate and maturity. There is no price oracle: every position sets its own price, and anyone can challenge it through a Dutch auction."
			/>

			<HeroSteps steps={STEPS} />

			<div className="flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
				{/* View */}
				<div className="flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-usdu-surface bg-usdu-bg p-1 md:w-auto">
					{TABS.map((t) => (
						<button
							key={t}
							onClick={() => setTab(t)}
							className={cn(
								'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all md:flex-none',
								t === tab ? 'bg-usdu-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
							)}
						>
							{t}
							{!!badges[t] && (
								<span
									className={cn(
										'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-none',
										t === 'Auctions' ? 'bg-brand text-white' : 'bg-usdu-surface text-text-primary'
									)}
								>
									{badges[t]}
								</span>
							)}
						</button>
					))}
				</div>

				{/* Stablecoin, one borrow contract each */}
				<div className="flex w-full gap-1 rounded-xl border border-usdu-surface bg-usdu-bg p-1 md:w-auto">
					{[ALL, ...CURRENCIES].map((c) => (
						<button
							key={c}
							onClick={() => router.replace({ query: { currency: c } }, undefined, { shallow: true })}
							className={cn(
								'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all md:flex-none',
								c === currency ? 'bg-usdu-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
							)}
						>
							{c === ALL ? (
								<span className="flex h-5 w-5 items-center justify-center rounded-full bg-usdu-black">
									<FontAwesomeIcon icon={faLayerGroup} className="h-2.5 w-2.5 text-usdu-card" />
								</span>
							) : (
								<TokenLogo currency={c} size={5} />
							)}
							{c === ALL ? 'All' : c}
						</button>
					))}
				</div>
			</div>

			{tab === 'Markets' && <MarketsTab currency={currency} />}
			{tab === 'My Positions' && (
				<Card variant="panel" className="space-y-8">
					<PageHeader
						title="My Positions"
						description="Positions you own. Select one to manage its collateral, debt and price."
					/>
					<PositionsTable positions={mine} emptyText="No positions yet. Pick a market to open one." />
				</Card>
			)}
			{tab === 'All Positions' && (
				<Card variant="panel" className="space-y-8">
					<PageHeader
						title="All Positions"
						description="Every position of this borrow market. A position price far above the market price is a candidate for a challenge."
					/>
					<PositionsTable positions={positions} emptyText="No positions yet." />
				</Card>
			)}
			{tab === 'Auctions' && <AuctionsTab currency={currency} />}
		</div>
	);
}

export default function BorrowListPage() {
	return (
		<>
			<NextSeo title={SEO.borrow.title} description={SEO.borrow.description} openGraph={SEO.borrow.openGraph} />
			<BorrowListPageContent />
		</>
	);
}
