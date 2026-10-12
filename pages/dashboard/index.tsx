import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faGift, faHandHoldingDollar, faBolt } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import { useAuth } from '@/contexts/AuthContext';
import { useWalletAssets, type WalletAsset, type StablecoinGroup } from '@/hooks/useWalletAssets';
import { useRewardStreams } from '@/hooks/useRewardStreams';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { ButtonInput } from '@/components/ui/input';
import { StatCard } from '@/components/ui/stats';
import { DonutChart, type DonutSlice } from '@/components/ui/charts';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import { formatCompactNumber } from '@/lib/utils';
import { SEO } from '@/lib/constants';

const HEADERS = ['Asset', 'Balance', 'Price', 'Value'];

// reward vault share tokens (see useRewardStreams) and the donut color of the stablecoin they stake
const REWARD_SLICES: Record<string, { color: string; dot: string }> = {
	rUSDU: { color: 'stroke-usdu-black', dot: 'bg-usdu-black' },
	rEURU: { color: 'stroke-info', dot: 'bg-info' },
	rCHFU: { color: 'stroke-error', dot: 'bg-error' },
};

// Stablecoins are listed by peg group, each in its currency color (black USD, blue EUR, red CHF)
const STABLE_GROUPS: { group: StablecoinGroup; label: string; dot: string }[] = [
	{ group: 'USD', label: 'USD stablecoins', dot: 'bg-usdu-black' },
	{ group: 'EUR', label: 'EUR stablecoins', dot: 'bg-info' },
	{ group: 'CHF', label: 'CHF stablecoins', dot: 'bg-error' },
];

function compareAssets(tab: string, a: WalletAsset, b: WalletAsset): number {
	switch (tab) {
		case 'Balance':
			return b.balance - a.balance;
		case 'Price':
			return b.price - a.price;
		case 'Value':
			return b.value - a.value;
		default:
			return a.name.localeCompare(b.name); // 'Asset'
	}
}

function DashboardPageContent() {
	const { isConnected, address } = useAuth();
	const { assets, isLoading, error } = useWalletAssets(address as `0x${string}` | undefined);
	const { streams } = useRewardStreams();
	const { sortTab, sortReverse, handleSort } = useSort('Value');
	const [showZero, setShowZero] = useState(false);

	// every reward stream is listed, with 0 when the wallet holds none of its shares, largest position first
	// (the sort is stable, so equal values keep the stream order)
	const rewards = useMemo(
		() =>
			streams
				.map((s) => {
					const asset = assets.find((a) => a.key === s.symbol);
					return { ...s, balance: asset?.balance ?? 0, value: asset?.value ?? 0, ...REWARD_SLICES[s.symbol]! };
				})
				.sort((a, b) => b.value - a.value),
		[streams, assets]
	);
	// only the U-stables can be staked, each into its own reward vault
	const stakeVaults = useMemo(() => Object.fromEntries(streams.map((s) => [s.currency, s.vault])), [streams]);
	const stablecoinTotal = assets.filter((a) => a.group).reduce((sum, a) => sum + a.value, 0);
	const rewardsTotal = rewards.reduce((sum, r) => sum + r.value, 0);
	const rewardSlices: DonutSlice[] = rewards.map((r) => ({ key: r.key, label: r.symbol, value: r.value, className: r.color }));

	// pure stablecoins per peg group, unheld coins included so the user sees everything the protocol supports
	const stableGroups = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return STABLE_GROUPS.map((g) => ({
			...g,
			assets: assets
				.filter((a) => a.group === g.group && (showZero || a.balance > 0))
				.sort((a, b) => dir * compareAssets(sortTab, a, b)),
		})).filter((g) => showZero || g.assets.length > 0);
	}, [assets, sortTab, sortReverse, showZero]);

	return (
		<div className="space-y-8">
			<PageHeader title="Dashboard" description="Your wallet at a glance: every asset the protocol recognizes, valued in USDU." />

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<StatCard
					icon={faCoins}
					label="Stablecoin Assets"
					value={isConnected ? formatCompactNumber(stablecoinTotal, 2, '', ' USDU') : '—'}
					loading={isConnected && isLoading}
				/>
				<StatCard
					icon={faGift}
					label="Reward Assets"
					value={isConnected ? formatCompactNumber(rewardsTotal, 2, '', ' USDU') : '—'}
					loading={isConnected && isLoading}
				/>
				{/* Borrowing isn't wired into the dashboard yet */}
				<StatCard
					icon={faHandHoldingDollar}
					label="Borrow Assets"
					value={isConnected ? formatCompactNumber(0, 2, '', ' USDU') : '—'}
				/>
			</div>

			<PageHeader
				title="Stablecoin Assets"
				actions={
					<label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
						<span>Show zero balances</span>
						<button
							type="button"
							role="switch"
							aria-checked={showZero}
							onClick={() => setShowZero((v) => !v)}
							className={`relative w-9 h-5 rounded-full transition-colors ${showZero ? 'bg-usdu-orange' : 'bg-usdu-surface'}`}
						>
							<span
								className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showZero ? 'translate-x-4' : ''}`}
							/>
						</button>
					</label>
				}
				description="USDU, EURU and CHFU plus every stablecoin the protocol bridges or pools, grouped by currency and valued at par in USDU."
			/>

			{!isConnected || isLoading || error || stableGroups.length === 0 ? (
				<Table>
					<TableHead headers={HEADERS} colSpan={4} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
					<TableBody>
						<TableRowEmpty>
							{!isConnected
								? 'Connect your wallet to see your assets.'
								: isLoading
									? 'Loading stablecoin assets...'
									: error
										? `Error: ${error}`
										: 'No stablecoins in this wallet.'}
						</TableRowEmpty>
					</TableBody>
				</Table>
			) : (
				stableGroups.map((g) => (
					<div key={g.group} className="space-y-3">
						<div className="flex items-center gap-2">
							<span className={`w-2.5 h-2.5 rounded-full ${g.dot}`} />
							<h3 className="text-usdu-black font-semibold">{g.label}</h3>
						</div>
						<Table>
							<TableHead
								headers={HEADERS}
								colSpan={4}
								actionCol
								tab={sortTab}
								reverse={sortReverse}
								tabOnChange={handleSort}
							/>
							<TableBody>
								{g.assets.map((a) => (
									<TableRow
										key={a.key}
										headers={HEADERS}
										colSpan={4}
										tab={sortTab}
										actionCol={
											stakeVaults[a.symbol] ? (
												<ButtonInput
													label="Stake"
													href={`/dashboard/strategy/${stakeVaults[a.symbol]}/rewards`}
													variant="outline"
													size="sm"
													className="w-full"
												/>
											) : (
												// foreign stablecoins need wrapping into their U-stable first, not supported yet
												<ButtonInput label="Stake" variant="outline" size="sm" className="w-full" disabled />
											)
										}
									>
										<div className="flex items-center gap-2">
											<TokenLogo logoURI={a.logoURI} currency={a.symbol} size={6} />
											<span>{a.name}</span>
										</div>
										<span>{formatCompactNumber(a.balance, 2, '', ` ${a.symbol}`)}</span>
										<span>{`${a.price.toFixed(4)} USDU`}</span>
										<span>{formatCompactNumber(a.value, 2, '', ' USDU')}</span>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				))
			)}

			<PageHeader
				title="Stablecoin Rewards"
				description="Your stake in the USDU, EURU and CHFU reward vaults, including the rewards streamed to you so far."
			/>

			<div className="bg-usdu-bg border border-usdu-surface rounded-lg p-6 grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
				<div className="flex justify-center">
					<DonutChart
						slices={rewardSlices}
						centerLabel="Total staked"
						centerValue={isConnected ? formatCompactNumber(rewardsTotal, 2, '', ' USDU') : '—'}
						size={240}
					/>
				</div>

				<div className="w-full divide-y divide-usdu-surface">
					{!isConnected ? (
						<p className="text-text-secondary py-3">Connect your wallet to see your rewards.</p>
					) : (
						rewards.map((r) => (
							<div key={r.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
								<div className="flex items-center gap-3">
									<span className={`w-2.5 h-2.5 rounded-full ${r.dot}`} />
									<TokenLogo logoURI={r.logoURI} currency={r.symbol} size={6} />
									<div>
										<Link
											href={`/dashboard/strategy/${r.vault}/rewards`}
											className="text-usdu-black font-medium hover:text-usdu-orange hover:underline transition-colors"
										>
											{r.name}
										</Link>
										<p className="text-text-secondary text-sm flex items-center gap-1">
											<FontAwesomeIcon icon={faBolt} className="w-3 h-3 text-usdu-orange" />
											{`${r.apr.toFixed(2)}% APR`}
										</p>
									</div>
								</div>
								<div className="text-right">
									<p className="text-usdu-black font-medium">{formatCompactNumber(r.value, 2, '', ' USDU')}</p>
									<p className="text-text-secondary text-sm">
										{rewardsTotal > 0 ? `${((r.value / rewardsTotal) * 100).toFixed(1)}%` : '0%'}
									</p>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}

export default function DashboardPage() {
	return (
		<>
			<NextSeo title={SEO.dashboard.title} description={SEO.dashboard.description} openGraph={SEO.dashboard.openGraph} />
			<DashboardPageContent />
		</>
	);
}
