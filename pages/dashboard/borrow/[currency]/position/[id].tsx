import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { faCoins, faScaleBalanced, faTag, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/contexts/AuthContext';
import { useNow } from '@/hooks/ui/useNow';
import { useBorrowPosition } from '@/hooks/useBorrowPositions';
import { useBorrowBalance } from '@/hooks/useBorrowBalance';
import { useBorrowActions } from '@/hooks/useBorrowActions';
import { PageHeader } from '@/components/ui/layout';
import { Badge } from '@/components/ui/Badge';
import { TokenInput, ApproveActionInput, TabInput } from '@/components/ui/input';
import SliderInput from '@/components/ui/input/SliderInput';
import { StatGrid } from '@/components/ui/stats';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import NotFound from '@/components/ui/NotFound';
import {
	AUCTION_PRICE_FACTOR,
	AUCTION_REWARD_SHARE,
	COOLDOWN_PRICE_INCREASE,
	MAX_PRICE_INCREASE,
	ONE,
	auctionPrice,
	auctionTurningPoint,
	debtDue,
	numberToPrice,
	priceToNumber,
	splitMint,
} from '@/lib/borrow/math';
import {
	RISK_LABEL,
	STATUS_COLOR,
	STATUS_LABEL,
	stableFormat,
	fmtCollateral,
	fmtDuration,
	fmtPercent,
	fmtPrice,
	fmtShare,
} from '@/lib/borrow/format';
import { formatTimestampLocale } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const OWNER_TABS = ['Deposit', 'Withdraw', 'Borrow', 'Repay', 'Price'];
const PUBLIC_TABS = ['Deposit', 'Repay'];
const RISK_BADGE = {
	low: { customColor: 'text-success', customBgColor: 'bg-success-bg' },
	medium: { customColor: 'text-yellow-400', customBgColor: 'bg-yellow-400/20' },
	high: { customColor: 'text-error', customBgColor: 'bg-error-bg' },
};

const ceilDiv = (a: bigint, b: bigint) => (b === 0n ? 0n : (a + b - 1n) / b);

function BorrowPositionPageContent() {
	const router = useRouter();
	const positionId = typeof router.query.id === 'string' ? Number(router.query.id) : undefined;
	const currency = typeof router.query.currency === 'string' ? router.query.currency : 'USDU';
	const { fmtStable } = stableFormat(currency);

	const { isConnected } = useAuth();
	const { open } = useAppKit();
	const now = useNow();
	const { position: p } = useBorrowPosition(currency, positionId);
	const balance = useBorrowBalance(p?.market);
	const actions = useBorrowActions();

	const [tab, setTab] = useState(OWNER_TABS[0]!);
	const [input, setInput] = useState('');
	const [priceInput, setPriceInput] = useState<number | null>(null);
	const [challengeInput, setChallengeInput] = useState('');
	const [forceInput, setForceInput] = useState('');
	const [approved, setApproved] = useState<Record<string, boolean>>({});

	useEffect(() => {
		setInput('');
		setPriceInput(null);
		setChallengeInput('');
		setForceInput('');
		setApproved({});
		setTab(OWNER_TABS[0]!);
	}, [positionId]);

	if (!router.isReady) return null;

	if (!p) {
		return (
			<NotFound
				title="Position Not Found"
				description="This borrow position doesn't exist."
				ctaLabel="Back to Borrow"
				ctaHref={`/dashboard/borrow?currency=${currency}`}
			/>
		);
	}

	const m = p.market;
	const symbol = m.collateralSymbol;
	const due = debtDue(p);
	const remaining = p.balance - p.challenged;
	const expired = p.status === 'expired';
	const locked = p.status === 'challenged' || p.status === 'hot' || expired;
	const tabs = p.isMine ? OWNER_TABS : PUBLIC_TABS;
	const activeTab = tabs.includes(tab) ? tab : tabs[0]!;
	const amount = input ? BigInt(input) : 0n;

	const approve = async (key: string, token: string) => {
		await actions.approve(token);
		setApproved((a) => ({ ...a, [key]: true }));
	};
	const done = (reset: () => void) => async (run: () => Promise<void>) => {
		await run();
		reset();
	};
	const finish = done(() => setInput(''));

	// --- manage tab ---------------------------------------------------------
	const minKeep = p.borrowed === 0n ? 0n : ceilDiv(p.borrowed * ONE, p.price);
	const keep = p.borrowed === 0n ? 0n : minKeep > m.minBalance ? minKeep : m.minBalance;
	const maxWithdraw = p.balance > keep ? p.balance - keep : 0n;
	const room = (() => {
		const covered = (p.balance * p.price) / ONE;
		const byPrice = covered > p.borrowed ? covered - p.borrowed : 0n;
		return byPrice < m.limit - m.borrowed ? byPrice : m.limit - m.borrowed;
	})();
	const mintSplit = splitMint(m, amount, p.maturity);
	const maxRepay = due < balance.stable ? due : balance.stable;

	const lowestPrice = p.balance === 0n ? 0n : ceilDiv(p.borrowed * ONE, p.balance);
	const priceMin = Math.max(priceToNumber(lowestPrice, m.collateralDecimals), priceToNumber(m.price, m.collateralDecimals) / 100);
	const priceMax = Math.min(
		priceToNumber(m.price, m.collateralDecimals),
		priceToNumber(p.price * MAX_PRICE_INCREASE, m.collateralDecimals)
	);
	const currentPrice = priceToNumber(p.price, m.collateralDecimals);
	const newPrice = Math.min(Math.max(priceInput ?? currentPrice, priceMin), priceMax);
	const raising = newPrice > currentPrice;

	let action: {
		label: string;
		disabled: boolean;
		error?: string;
		run: () => Promise<void>;
		approval?: { symbol: string; token: string };
	};
	switch (activeTab) {
		case 'Withdraw':
			action = {
				label: 'Withdraw',
				disabled: amount === 0n || amount > maxWithdraw || locked,
				run: () => actions.withdraw(p.positionId, amount),
			};
			break;
		case 'Borrow':
			action = {
				label: 'Borrow',
				disabled: amount === 0n || amount > room || locked,
				run: () => actions.mint(p.positionId, amount),
			};
			break;
		case 'Repay':
			action = {
				label: 'Repay',
				disabled: amount === 0n || amount > maxRepay,
				run: () => actions.repay(p.positionId, amount),
				approval: { symbol: currency, token: 'stable' },
			};
			break;
		case 'Price':
			action = {
				label: raising ? 'Raise price' : 'Lower price',
				disabled: newPrice === currentPrice || p.status === 'challenged' || expired || (raising && p.status === 'hot'),
				run: () => actions.setPrice(p.positionId, numberToPrice(newPrice, m.collateralDecimals)),
			};
			break;
		default:
			action = {
				label: 'Deposit',
				disabled: amount === 0n || amount > balance.collateral,
				run: () => actions.deposit(p.positionId, amount),
				approval: { symbol, token: 'collateral' },
			};
	}
	const needsApproval = !!action.approval && amount > 0n && !approved[action.approval.token];
	const isStableTab = activeTab === 'Borrow' || activeTab === 'Repay';
	const manageDigits = isStableTab ? 18 : m.collateralDecimals;
	const manageSymbol = isStableTab ? currency : symbol;
	const manageMax = { Deposit: balance.collateral, Withdraw: maxWithdraw, Borrow: room, Repay: maxRepay }[activeTab];

	// --- challenge ----------------------------------------------------------
	const challengeSize = challengeInput ? BigInt(challengeInput) : 0n;
	const tooSmall = challengeSize > 0n && challengeSize < m.minBalance && challengeSize < remaining;
	const tooLarge = challengeSize > remaining;
	const challengeApproved = !!approved['challenge'];
	const challengeNeedsApproval = challengeSize > 0n && !challengeApproved;
	const challengeMax = remaining < balance.collateral ? remaining : balance.collateral;

	// --- force sell ---------------------------------------------------------
	const forceSize = forceInput ? BigInt(forceInput) : 0n;
	const sellPrice = auctionPrice(p.maturity, m.auction, p.price, now);
	const sellCost = (sellPrice * (forceSize < p.balance ? forceSize : p.balance)) / ONE;
	const sellEnds = p.maturity + m.auction;
	const sellAbove = sellPrice >= p.price;
	const sellApproved = !!approved['force'];
	const sellNeedsApproval = forceSize > 0n && !sellApproved;
	const sellBlocked = p.challenged > 0n;

	const statusLabel = STATUS_LABEL[p.status];
	const riskBadge = RISK_BADGE[p.risk];

	return (
		<div className="space-y-8">
			<PageHeader
				title={`${symbol} Position #${p.positionId}`}
				description={
					expired
						? 'This position has matured. Its collateral is sold by a falling auction, anyone can buy it.'
						: p.isMine
							? 'Your position. Keep it repaid before maturity and priced below what the market would pay.'
							: 'Anyone can top up or repay a position. If its price looks too high, you can challenge it.'
				}
				breadcrumbs={[{ label: 'Borrow', href: `/dashboard/borrow?currency=${currency}` }, { label: `Position #${p.positionId}` }]}
				badge={{ text: statusLabel, variant: p.status === 'active' ? 'success' : p.status === 'hot' ? 'warning' : 'error' }}
			/>

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 4 }}
				stats={[
					{ icon: faCoins, label: 'Collateral', value: fmtCollateral(m, p.balance) },
					{ icon: faScaleBalanced, label: 'Repay to Close', value: fmtStable(due) },
					{ icon: faTag, label: 'Position Price', value: fmtPrice(m, p.price) },
					{
						icon: faCalendarDays,
						label: expired ? 'Matured' : 'Time to Maturity',
						value: expired ? formatTimestampLocale(p.maturity) : fmtDuration(p.maturity - now),
					},
				]}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="space-y-6">
					{/* Manage */}
					{!expired && (
						<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
							<h3 className="font-semibold text-usdu-black text-lg">{p.isMine ? 'Manage' : 'Support'}</h3>

							<TabInput
								tabs={tabs}
								tab={activeTab}
								setTab={(t) => {
									setTab(t);
									setInput('');
								}}
							/>

							{activeTab === 'Price' ? (
								<SliderInput
									label="Position price"
									value={newPrice}
									onChange={setPriceInput}
									min={priceMin}
									max={Math.max(priceMax, priceMin)}
									step={Math.max(+(priceMax / 500).toPrecision(1), 0.01)}
									formatValue={(v) => `${v.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`}
									minLabel="Lowest covered"
									maxLabel={`Max ${fmtPrice(m, numberToPrice(priceMax, m.collateralDecimals))}`}
									hint={
										raising
											? `Raising the price allows more borrowing, but starts a ${COOLDOWN_PRICE_INCREASE / 86400} day cooldown and can be at most ${MAX_PRICE_INCREASE}x per step.`
											: 'A lower price makes the position harder to challenge. It must still cover the debt.'
									}
								/>
							) : (
								<TokenInput
									label={
										{ Deposit: 'Add collateral', Withdraw: 'Remove collateral', Borrow: 'Borrow more', Repay: 'Repay' }[
											activeTab
										]
									}
									symbol={manageSymbol}
									digit={manageDigits}
									value={input}
									onChange={setInput}
									max={isConnected || activeTab === 'Withdraw' || activeTab === 'Borrow' ? manageMax : undefined}
									reset={0n}
									onReset={() => setInput('')}
									limitLabel={activeTab === 'Deposit' ? 'Balance' : activeTab === 'Repay' ? 'Debt' : 'Available'}
									limit={activeTab === 'Repay' ? due : activeTab === 'Deposit' ? balance.collateral : (manageMax ?? 0n)}
									limitDigit={manageDigits}
									error={
										amount > (manageMax ?? 0n)
											? activeTab === 'Deposit'
												? `Insufficient ${symbol} balance.`
												: `Exceeds the ${activeTab === 'Repay' ? 'open debt or your balance' : 'covered amount'}.`
											: undefined
									}
								/>
							)}

							{activeTab === 'Borrow' && amount > 0n && (
								<div className="space-y-1">
									<DetailRow label="You receive" value={fmtStable(mintSplit.received)} />
									<DetailRow label="Reserve" value={fmtStable(mintSplit.reserve)} />
									<DetailRow label="Upfront interest" value={fmtStable(mintSplit.fee)} />
								</div>
							)}

							{activeTab === 'Repay' && amount > 0n && p.borrowed > 0n && (
								<div className="space-y-1">
									<DetailRow label="Debt reduced by" value={fmtStable((amount * p.borrowed) / due)} />
									<DetailRow label="Reserve released" value={fmtStable((amount * p.borrowed) / due - amount)} />
								</div>
							)}

							{locked && activeTab !== 'Deposit' && activeTab !== 'Repay' && (
								<p className="text-sm text-text-secondary">
									{p.status === 'challenged'
										? 'Withdrawing, borrowing and price changes are suspended while the position is challenged.'
										: `Suspended during the cooldown, which ends in ${fmtDuration(p.cooldown - now)}.`}
								</p>
							)}

							<ApproveActionInput
								actionLabel={action.label}
								approvals={
									action.approval
										? [
												{
													tokenSymbol: action.approval.symbol,
													needsApproval,
													isApproving: actions.isPending && needsApproval,
													onApprove: () => approve(action.approval!.token, action.approval!.token),
												},
											]
										: []
								}
								isActing={actions.isPending && !needsApproval}
								disabled={action.disabled || actions.isPending}
								onAction={() => finish(action.run)}
								isConnected={isConnected}
								onConnect={() => open()}
							/>
						</div>
					)}

					{/* Force sell */}
					{expired && (
						<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
							<h3 className="font-semibold text-usdu-black text-lg">Force Sell</h3>

							<div className="flex items-end justify-between gap-4">
								<div>
									<p className="text-sm text-text-secondary">Current auction price</p>
									<p className="text-2xl font-bold text-text-primary">{fmtPrice(m, sellPrice)}</p>
								</div>
								<Badge
									text={sellAbove ? 'Above position price' : 'Below position price'}
									variant="custom"
									size="md"
									customColor={sellAbove ? 'text-success' : 'text-brand'}
									customBgColor={sellAbove ? 'bg-success-bg' : 'bg-brand/20'}
								/>
							</div>

							<TokenInput
								label="Collateral to buy"
								symbol={symbol}
								digit={m.collateralDecimals}
								value={forceInput}
								onChange={setForceInput}
								max={p.balance}
								reset={0n}
								onReset={() => setForceInput('')}
								limitLabel="In position"
								limit={p.balance}
								limitDigit={m.collateralDecimals}
								error={sellBlocked ? 'Wait for the running challenge to end first.' : undefined}
							/>

							<div className="space-y-1">
								<DetailRow label="You pay" value={fmtStable(sellCost)} />
								<DetailRow label="Debt covered" value={fmtStable(due)} />
								<DetailRow label="Auction ends in" value={now < sellEnds ? fmtDuration(sellEnds - now) : 'Ended'} />
							</div>
							<p className="text-sm text-text-secondary">
								{sellAbove
									? 'At or above the position price the owner keeps the surplus, and the curator takes a small expiry fee out of the proceeds.'
									: 'Below the position price the proceeds go to the debt first. The owner forfeits what is left over to the curator.'}
							</p>

							<ApproveActionInput
								actionLabel="Buy collateral"
								approvals={[
									{
										tokenSymbol: currency,
										needsApproval: sellNeedsApproval,
										isApproving: actions.isPending && sellNeedsApproval,
										onApprove: () => approve('force', 'stable'),
									},
								]}
								isActing={actions.isPending && !sellNeedsApproval}
								disabled={forceSize === 0n || sellBlocked || actions.isPending}
								onAction={() => done(() => setForceInput(''))(() => actions.buyExpired(p.positionId, forceSize))}
								isConnected={isConnected}
								onConnect={() => open()}
							/>
						</div>
					)}

					{/* Challenge */}
					{!expired && !p.isMine && (
						<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
							<h3 className="font-semibold text-usdu-black text-lg">Challenge</h3>
							<p className="text-sm text-text-secondary">
								Put up collateral to start an auction at {String(AUCTION_PRICE_FACTOR)}x the position price. If a bidder
								pays at least the position price, the position is safe and you sell your collateral at that price. If the
								price falls below, the position&apos;s collateral is sold instead and you earn{' '}
								{fmtShare((m.reserve * AUCTION_REWARD_SHARE) / ONE)} of the proceeds.
							</p>

							<TokenInput
								label="Challenge size"
								symbol={symbol}
								digit={m.collateralDecimals}
								value={challengeInput}
								onChange={setChallengeInput}
								max={isConnected ? challengeMax : undefined}
								reset={isConnected ? 0n : undefined}
								onReset={() => setChallengeInput('')}
								limitLabel="Challengeable"
								limit={remaining}
								limitDigit={m.collateralDecimals}
								error={
									tooSmall
										? `Below the minimum of ${fmtCollateral(m, m.minBalance)}.`
										: tooLarge
											? 'More than the position has left to challenge.'
											: undefined
								}
							/>

							<div className="space-y-1">
								<DetailRow label="Starting price" value={fmtPrice(m, p.price * AUCTION_PRICE_FACTOR)} />
								<DetailRow label="Reaches position price after" value={fmtDuration(m.auction * auctionTurningPoint())} />
								<DetailRow label="Auction duration" value={fmtDuration(m.auction)} />
								<DetailRow label="Minimum price (guard)" value={fmtPrice(m, p.price)} />
							</div>

							<ApproveActionInput
								actionLabel="Start challenge"
								approvals={[
									{
										tokenSymbol: symbol,
										needsApproval: challengeNeedsApproval,
										isApproving: actions.isPending && challengeNeedsApproval,
										onApprove: () => approve('challenge', m.collateral),
									},
								]}
								isActing={actions.isPending && !challengeNeedsApproval}
								disabled={
									challengeSize === 0n || tooSmall || tooLarge || challengeSize > balance.collateral || actions.isPending
								}
								onAction={() =>
									done(() => setChallengeInput(''))(() => actions.challenge(p.positionId, challengeSize, p.price))
								}
								isConnected={isConnected}
								onConnect={() => open()}
							/>
						</div>
					)}
				</div>

				{/* Details */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface h-full flex flex-col">
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Position</h3>

					<DetailRow label="Status">
						<Badge text={statusLabel} variant="custom" size="md" {...STATUS_COLOR[p.status]} />
					</DetailRow>
					<DetailRow label="Collateral" value={fmtCollateral(m, p.balance)} />
					<DetailRow label="Under challenge" value={fmtCollateral(m, p.challenged)} />
					<DetailRow label="Gross debt" value={fmtStable(p.borrowed)} />
					<DetailRow label="Reserve" value={fmtStable(p.reserve)} />
					<DetailRow label="Repay to close" value={fmtStable(due)} />
					<DetailRow label="Position price" value={fmtPrice(m, p.price)} />
					<DetailRow label="Market price" value={fmtPrice(m, m.refPrice)} />
					<DetailRow label="Price vs. market" value={fmtPercent(Number((p.price * 1000n) / m.refPrice) / 1000, 0)} />
					<DetailRow label="Challenge risk">
						<Badge text={RISK_LABEL[p.risk]} variant="custom" size="md" {...riskBadge} />
					</DetailRow>
					<DetailRow label="Maturity" value={formatTimestampLocale(p.maturity)} />
					<DetailRow label="Cooldown" value={p.cooldown > now ? `${fmtDuration(p.cooldown - now)} left` : 'None'} />

					<h3 className="font-semibold text-usdu-black text-lg mt-10 mb-3">Addresses</h3>
					<DetailRow label="Owner">
						<AddressLink address={p.owner} />
					</DetailRow>
					<DetailRow label="Collateral">
						<AddressLink address={m.collateral} />
					</DetailRow>

					<p className="mt-6 lg:mt-auto pt-4 text-sm text-text-secondary">
						The position is an NFT. Whoever holds it controls the collateral and debt, and can authorize other addresses to act
						for it.
					</p>
				</div>
			</div>
		</div>
	);
}

export default function BorrowPositionPage() {
	return (
		<>
			<NextSeo
				title={SEO.borrowPosition.title}
				description={SEO.borrowPosition.description}
				openGraph={SEO.borrowPosition.openGraph}
			/>
			<BorrowPositionPageContent />
		</>
	);
}
