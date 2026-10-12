import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faHourglassHalf, faArrowRightFromBracket, faArrowRightToBracket } from '@fortawesome/free-solid-svg-icons';
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/contexts/AuthContext';
import { useRewardStreams } from '@/hooks/useRewardStreams';
import { useStreamerVaultPosition } from '@/hooks/useStreamerVaultPosition';
import { useStreamerVault } from '@/hooks/useStreamerVault';
import { aprSeries, yieldSeries } from '@/lib/vault-series';
import { useStreamerVaultDaily } from '@/hooks/useStreamerVaultDaily';
import { useStreamerVaultHistory, type VaultHistoryEntry } from '@/hooks/useStreamerVaultHistory';
import { useSort } from '@/hooks/ui/useSort';
import { PageHeader } from '@/components/ui/layout';
import Card from '@/components/ui/Card';
import { TokenInput, ButtonInput, TabInput } from '@/components/ui/input';
import { TimeSeriesChart } from '@/components/ui/charts';
import HeroSteps from '@/components/ui/HeroSteps';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import AppLink from '@/components/ui/AppLink';
import { getBlockExplorerUrl } from '@/lib/web3/config';
import NotFound from '@/components/ui/NotFound';
import { formatCompactNumber, formatTimestampLocale } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const TABS = ['Stake', 'Unstake'];
const CHART_TABS = ['TVL', 'Yield', 'APR'];
const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faArrowRightToBracket} className="w-3 h-3 text-usdu-card" />,
		title: 'Stake',
		description: 'Deposit a USDU stablecoin into its reward vault and receive vault shares.',
	},
	{
		icon: <FontAwesomeIcon icon={faHourglassHalf} className="w-3 h-3 text-usdu-card" />,
		title: 'Earn',
		description: 'Protocol rewards stream to all stakers, so each share is worth more over time.',
	},
	{
		icon: <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-3 h-3 text-usdu-card" />,
		title: 'Unstake',
		description: 'Redeem your shares at any time for your stake plus the rewards streamed so far.',
	},
];

const HISTORY_HEADERS = ['Date', 'Type', 'Amount', 'Shares', 'Price'];

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

// share price paid or received in a deposit/withdraw (assets per share)
function entryPrice(e: VaultHistoryEntry): number {
	const shares = BigInt(e.shares);
	return shares > 0n ? Number(formatUnits((BigInt(e.assets) * 10n ** 18n) / shares, 18)) : 0;
}

function compareHistory(tab: string, a: VaultHistoryEntry, b: VaultHistoryEntry): number {
	switch (tab) {
		case 'Type':
			return a.kind.localeCompare(b.kind);
		case 'Amount':
			return compareBigint(BigInt(b.assets), BigInt(a.assets));
		case 'Shares':
			return compareBigint(BigInt(b.shares), BigInt(a.shares));
		case 'Price':
			return entryPrice(b) - entryPrice(a);
		default:
			return compareBigint(BigInt(b.created), BigInt(a.created)); // 'Date', newest first
	}
}

function StrategyDetailPageContent() {
	const router = useRouter();
	const vaultParam = typeof router.query.address === 'string' ? router.query.address.toLowerCase() : undefined;

	const { isConnected, address } = useAuth();
	const { open } = useAppKit();

	const { streams, isLoading: isLoadingStreams } = useRewardStreams();
	const stream = streams.find((s) => s.vault.toLowerCase() === vaultParam);

	const [tab, setTab] = useState(TABS[0]!);
	const [chartTab, setChartTab] = useState(CHART_TABS[0]!);
	const isStake = tab === 'Stake';
	const [amountRawInput, setAmountRawInput] = useState('');
	const amountRaw = amountRawInput ? BigInt(amountRawInput) : 0n;

	// Reset the form whenever the vault or the direction changes
	useEffect(() => {
		setAmountRawInput('');
	}, [vaultParam, tab]);

	const position = useStreamerVaultPosition(
		stream?.vault,
		stream?.asset,
		address as `0x${string}` | undefined,
		isStake ? amountRaw : 0n,
		isStake ? 0n : amountRaw
	);

	const { approve, deposit, redeem, isPending, isConfirming, isConfirmed, reset } = useStreamerVault();
	const [pendingStep, setPendingStep] = useState<'approve' | 'action' | null>(null);

	// Refetch the position and clear the input once a submitted transaction confirms
	useEffect(() => {
		if (isConfirmed) {
			position.refetch();
			if (pendingStep === 'action') setAmountRawInput('');
			setPendingStep(null);
			reset();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isConfirmed]);

	const {
		entries,
		isLoading: isLoadingHistory,
		error: historyError,
	} = useStreamerVaultHistory(address ? stream?.vault : undefined, address ?? undefined);
	const { logs } = useStreamerVaultDaily(stream?.vault);
	const { sortTab, sortReverse, handleSort } = useSort('Date');
	const sortedEntries = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...entries].sort((a, b) => dir * compareHistory(sortTab, a, b));
	}, [entries, sortTab, sortReverse]);

	if (!router.isReady || isLoadingStreams) {
		return (
			<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface text-center py-8">
				<p className="text-text-secondary">Loading vault...</p>
			</div>
		);
	}

	if (!stream) {
		return (
			<NotFound
				title="Vault Not Found"
				description="This reward vault doesn't exist or isn't available."
				ctaLabel="Back to Strategy"
				ctaHref="/dashboard/strategy"
			/>
		);
	}

	const currency = stream.currency;
	const fmtAmount = (v: number) => `${formatCompactNumber(v, 1, '')} ${currency}`;

	// daily logs from the indexer plus the live on-chain value as the latest point
	const now = Math.floor(Date.now() / 1000);
	const dailyPoints = [...logs, { day: now, tvl: stream.staked, price: stream.price, supply: stream.supply }];

	const tvlPoints = dailyPoints.map((p) => ({ t: p.day, v: p.tvl }));
	const yieldPoints = yieldSeries(dailyPoints);
	const aprPoints = aprSeries(dailyPoints);

	const lastApr = aprPoints[aprPoints.length - 1];
	const recentYield = yieldPoints.slice(-7);
	const avgYield = recentYield.length > 0 ? recentYield.reduce((sum, p) => sum + p.v, 0) / recentYield.length : 0;

	const fmtPercent = (v: number) => `${v.toFixed(2)}%`;
	const chart = {
		TVL: { points: tvlPoints, variant: 'area' as const, headline: fmtAmount(stream.staked), format: fmtAmount },
		Yield: {
			points: yieldPoints,
			variant: 'bars' as const,
			headline: `${fmtAmount(avgYield)} / day`,
			format: (v: number) => `${formatCompactNumber(v, 2, '')} ${currency}`,
		},
		APR: { points: aprPoints, variant: 'area' as const, headline: lastApr ? fmtPercent(lastApr.v) : '—', format: fmtPercent },
	}[chartTab]!;
	const chartSubtitle = { TVL: 'Total value locked', Yield: 'Average rewards per day, last 7 days', APR: 'Realized, 7-day rolling' }[
		chartTab
	];
	const realizedDays = Math.min(Math.floor((now - (dailyPoints[0]?.day ?? now)) / 86_400), 7);
	const realizedApr = lastApr ? fmtPercent(lastApr.v) : '—';
	const inputSymbol = isStake ? currency : stream.symbol;
	const outputSymbol = isStake ? stream.symbol : currency;
	const inputBalanceRaw = isStake ? position.assetBalanceRaw : position.sharesRaw;
	const outputBalanceRaw = isStake ? position.sharesRaw : position.assetBalanceRaw;
	const outputPreviewRaw = isStake ? position.previewShares : position.previewAssets;

	const needsApproval = isStake && amountRaw > 0n && position.allowanceRaw < amountRaw;
	const insufficientBalance = amountRaw > 0n && amountRaw > inputBalanceRaw;
	const isBusy = isPending || isConfirming;

	const handleAction = async () => {
		if (!address || amountRaw === 0n) return;
		const account = address as `0x${string}`;

		try {
			if (needsApproval) {
				setPendingStep('approve');
				await approve(stream.asset, stream.vault, amountRaw);
				return;
			}

			setPendingStep('action');
			if (isStake) {
				await deposit(stream.vault, amountRaw, account);
			} else {
				await redeem(stream.vault, amountRaw, account);
			}
		} catch {
			setPendingStep(null);
		}
	};

	const actionLabel = !isConnected
		? 'Connect Wallet'
		: isBusy
			? pendingStep === 'approve'
				? 'Approving...'
				: isStake
					? 'Staking...'
					: 'Unstaking...'
			: needsApproval
				? `Approve ${currency}`
				: isStake
					? 'Stake'
					: 'Unstake';

	return (
		<div className="space-y-8">
			<PageHeader
				title={stream.name}
				description={`Stake ${currency} to receive ${stream.symbol}. Protocol rewards are streamed linearly to all stakers, so each ${stream.symbol} becomes redeemable for more ${currency} over time. Stake and unstake at any time.`}
				breadcrumbs={[{ label: 'Strategy', href: '/dashboard/strategy' }, { label: stream.name }]}
			/>

			<HeroSteps steps={STEPS} />

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* TVL / Yield / APR over time */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-4">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h3 className="font-semibold text-usdu-black text-lg">{chartTab}</h3>
							<p className="text-sm text-text-secondary">{chartSubtitle}</p>
						</div>
						<p className="text-2xl font-bold text-text-primary text-right">{chart.headline}</p>
					</div>

					{chart.points.length > 1 || (chart.variant === 'bars' && chart.points.length > 0) ? (
						<TimeSeriesChart
							points={chart.points}
							variant={chart.variant}
							formatValue={chart.format}
							formatTick={chartTab === 'APR' ? (v) => `${v.toFixed(1)}%` : (v) => formatCompactNumber(v, 1, '')}
						/>
					) : (
						<p className="py-12 text-center text-text-secondary">Not enough data yet.</p>
					)}

					<TabInput tabs={CHART_TABS} tab={chartTab} setTab={setChartTab} />
				</div>

				{/* APR / total / unlocked / streaming */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface flex flex-col">
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Rewards</h3>

					<DetailRow label="APR (current stream)" value={`${stream.apr.toFixed(2)}%`} />
					<DetailRow label={`APR (realized, ${realizedDays > 0 ? `${realizedDays}d` : 'n/a'})`} value={realizedApr} />
					<DetailRow label="Unlocked" value={fmtAmount(stream.unlocked)} />
					<DetailRow label="Streaming" value={fmtAmount(stream.locked)} />
					<DetailRow label="Rate / Day" value={fmtAmount(stream.ratePerDay)} />
					<DetailRow label="Ends In" value={stream.daysLeft > 0 ? `${stream.daysLeft} days` : 'No active stream'} />

					<p className="mt-6 lg:mt-auto pt-4 text-sm text-text-secondary">
						Unlocked rewards are already part of the {stream.symbol} price. Streaming rewards are still being paid out to
						stakers.
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
					<h3 className="font-semibold text-usdu-black text-lg">{tab}</h3>

					<TabInput tabs={TABS} tab={tab} setTab={setTab} />

					<TokenInput
						label={isStake ? 'You stake' : 'You unstake'}
						symbol={inputSymbol}
						digit={18}
						value={amountRawInput}
						onChange={setAmountRawInput}
						max={isConnected ? inputBalanceRaw : undefined}
						reset={isConnected ? 0n : undefined}
						onReset={() => setAmountRawInput('')}
						limitLabel={isConnected ? 'Balance' : undefined}
						limit={inputBalanceRaw}
						limitDigit={18}
						error={insufficientBalance ? `Insufficient ${inputSymbol} balance.` : undefined}
					/>

					<TokenInput
						label="You receive (estimated)"
						symbol={outputSymbol}
						output={formatUnits(outputPreviewRaw, 18)}
						disabled
						limitLabel={isConnected ? 'Balance' : undefined}
						limit={outputBalanceRaw}
						limitDigit={18}
					/>

					<ButtonInput
						label={actionLabel}
						size="lg"
						className="w-full"
						disabled={isConnected && (amountRaw === 0n || insufficientBalance || isBusy)}
						loading={isConnected && isBusy}
						onClick={isConnected ? handleAction : () => open()}
						icon={!isConnected ? <FontAwesomeIcon icon={faWallet} className="w-4 h-4" /> : undefined}
					/>
				</div>

				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface h-full flex flex-col">
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Position</h3>

					<DetailRow label={`${stream.symbol} Price`} value={`${stream.price.toFixed(4)} ${currency}`} />
					<DetailRow
						label="Your Stake"
						value={isConnected ? `${formatCompactNumber(formatUnits(position.sharesRaw, 18), 2, '')} ${stream.symbol}` : '—'}
					/>
					<DetailRow label="Your Value" value={isConnected ? fmtAmount(Number(formatUnits(position.stakedRaw, 18))) : '—'} />

					<h3 className="font-semibold text-usdu-black text-lg mt-10 mb-3">Addresses</h3>

					<DetailRow label="Reward Vault">
						<AddressLink address={stream.vault} />
					</DetailRow>
					<DetailRow label="Staked Token">
						<AddressLink address={stream.asset} />
					</DetailRow>

					<p className="mt-10 lg:mt-auto text-sm text-text-secondary">
						Unstaking redeems your {stream.symbol} for the {currency} it represents, including all rewards streamed so far.
					</p>
				</div>
			</div>

			<Card variant="panel" className="space-y-8">
				<PageHeader title="History" description={`Your stake and unstake transactions in the ${stream.symbol} vault.`} />
				<Table>
					<TableHead headers={HISTORY_HEADERS} colSpan={5} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
					<TableBody>
						{!isConnected ? (
							<TableRowEmpty>Connect your wallet to see your history.</TableRowEmpty>
						) : isLoadingHistory ? (
							<TableRowEmpty>Loading history...</TableRowEmpty>
						) : historyError && entries.length === 0 ? (
							<TableRowEmpty>{`Error: ${historyError}`}</TableRowEmpty>
						) : sortedEntries.length === 0 ? (
							<TableRowEmpty>No stake or unstake transactions yet.</TableRowEmpty>
						) : (
							sortedEntries.map((e) => (
								<TableRow key={`${e.txHash}-${e.count}`} headers={HISTORY_HEADERS} colSpan={5} tab={sortTab}>
									<AppLink href={getBlockExplorerUrl(`tx/${e.txHash}`)}>
										{formatTimestampLocale(BigInt(e.created))}
									</AppLink>
									<span>{e.kind === 'Deposit' ? 'Stake' : 'Unstake'}</span>
									<span>{formatCompactNumber(formatUnits(BigInt(e.assets), 18), 2, '', ` ${currency}`)}</span>
									<span>{formatCompactNumber(formatUnits(BigInt(e.shares), 18), 2, '', ` ${stream.symbol}`)}</span>
									<span>{`${entryPrice(e).toFixed(4)} ${currency}`}</span>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

export default function StrategyDetailPage() {
	return (
		<>
			<NextSeo
				title={SEO.strategyDetail.title}
				description={SEO.strategyDetail.description}
				openGraph={SEO.strategyDetail.openGraph}
			/>
			<StrategyDetailPageContent />
		</>
	);
}
