import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faLayerGroup, faPercent, faCoins, faTag } from '@fortawesome/free-solid-svg-icons';
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/contexts/AuthContext';
import { useRewardStreams } from '@/hooks/useRewardStreams';
import { useStreamerVaultPosition } from '@/hooks/useStreamerVaultPosition';
import { useStreamerVault } from '@/hooks/useStreamerVault';
import { PageHeader } from '@/components/ui/layout';
import { TokenInput, ButtonInput, TabInput } from '@/components/ui/input';
import { StatGrid } from '@/components/ui/stats';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import NotFound from '@/components/ui/NotFound';
import { formatCompactNumber } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const TABS = ['Stake', 'Unstake'];

function StrategyDetailPageContent() {
	const router = useRouter();
	const vaultParam = typeof router.query.address === 'string' ? router.query.address.toLowerCase() : undefined;

	const { isConnected, address } = useAuth();
	const { open } = useAppKit();

	const { streams, isLoading: isLoadingStreams } = useRewardStreams();
	const stream = streams.find((s) => s.vault.toLowerCase() === vaultParam);

	const [tab, setTab] = useState(TABS[0]!);
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

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 4 }}
				stats={[
					{ icon: faLayerGroup, label: 'Staked', value: `${formatCompactNumber(stream.staked, 1, '')} ${currency}` },
					{ icon: faPercent, label: 'APR', value: `${stream.apr.toFixed(2)}%` },
					{
						icon: faTag,
						label: `${stream.symbol} Price`,
						value: `${Number(formatUnits(position.priceRaw, 18)).toFixed(4)} ${currency}`,
					},
					{
						icon: faCoins,
						label: 'Your Stake',
						value: isConnected ? `${formatCompactNumber(formatUnits(position.stakedRaw, 18), 1, '')} ${currency}` : '—',
					},
				]}
			/>

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
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Stream</h3>

					<DetailRow label="Locked Rewards" value={`${formatCompactNumber(stream.locked, 1, '')} ${currency}`} />
					<DetailRow label="Rate / Day" value={`${formatCompactNumber(stream.ratePerDay, 1, '')} ${currency}`} />
					<DetailRow label="Ends In" value={stream.daysLeft > 0 ? `${stream.daysLeft} days` : 'No active stream'} />

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
