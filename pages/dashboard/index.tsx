import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faGift, faHandHoldingDollar, faBolt, faArrowRightArrowLeft, faSeedling } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import { useAuth } from '@/contexts/AuthContext';
import { useWalletAssets, type WalletAsset, type StablecoinGroup } from '@/hooks/useWalletAssets';
import { useCryptoAssets } from '@/hooks/useCryptoAssets';
import { useRewardStreams } from '@/hooks/useRewardStreams';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { StatCard } from '@/components/ui/stats';
import { DonutChart, type DonutSlice } from '@/components/ui/charts';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import { PillTabs, CurrencyTabs } from '@/components/ui/input';
import { useCurrencyFilter } from '@/hooks/ui/useCurrencyFilter';
import { useQueryTab } from '@/hooks/ui/useQueryTab';
import Card from '@/components/ui/Card';
import { formatCompactNumber } from '@/lib/utils';
import { SEO } from '@/lib/constants';
import { withDemoBalances } from '@/lib/demo/dashboard';

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

// The U-stable of each peg group; staking it gives the matching reward vault share (r + symbol)
const STABLE_OF: Record<StablecoinGroup, string> = { USD: 'USDU', EUR: 'EURU', CHF: 'CHFU' };

// The zap page prefilled to spend the whole balance of `from`
const zapHref = (from: string, to?: string) => `/dashboard/zap/swap?from=${from}${to ? `&to=${to}` : ''}&amount=max`;

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

const TABS = ['Stablecoins', 'Crypto', 'Rewards'] as const;

function DashboardPageContent() {
	const [tab, setTab] = useQueryTab(TABS);
	const { currency, all, setCurrency, currencies } = useCurrencyFilter();
	const { isConnected, address } = useAuth();
	const { assets: walletAssets, isLoading, error } = useWalletAssets(address as `0x${string}` | undefined);
	const { assets: walletCrypto, isLoading: isLoadingCrypto } = useCryptoAssets(address as `0x${string}` | undefined);
	const { streams } = useRewardStreams();
	const { sortTab, sortReverse, handleSort } = useSort('Value');
	const [showZero, setShowZero] = useState(false);

	// Visitors without a wallet get a preview with demo balances at live prices
	const isDemo = !isConnected;
	const assets = useMemo(() => (isDemo ? withDemoBalances(walletAssets) : walletAssets), [isDemo, walletAssets]);
	const cryptoAll = useMemo(() => (isDemo ? withDemoBalances(walletCrypto) : walletCrypto), [isDemo, walletCrypto]);

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
	const stablecoinTotal = assets.filter((a) => a.group).reduce((sum, a) => sum + a.value, 0);
	const rewardsTotal = rewards.reduce((sum, r) => sum + r.value, 0);
	// the currency switcher narrows the rewards card to one vault, its shares are named r + the stablecoin
	const visibleRewards = rewards.filter((r) => all || r.symbol === `r${currency}`);
	const visibleRewardsTotal = visibleRewards.reduce((sum, r) => sum + r.value, 0);
	const rewardSlices: DonutSlice[] = visibleRewards.map((r) => ({ key: r.key, label: r.symbol, value: r.value, className: r.color }));

	// pure stablecoins per peg group, unheld coins included so the user sees everything the protocol supports
	const stableGroups = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return STABLE_GROUPS.filter((g) => all || STABLE_OF[g.group] === currency)
			.map((g) => ({
				...g,
				assets: assets
					.filter((a) => a.group === g.group && (showZero || a.balance > 0))
					.sort((a, b) => dir * compareAssets(sortTab, a, b)),
			}))
			.filter((g) => showZero || g.assets.length > 0);
	}, [assets, sortTab, sortReverse, showZero, all, currency]);

	const cryptoAssets = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return cryptoAll.filter((a) => showZero || a.balance > 0).sort((a, b) => dir * compareAssets(sortTab, a, b));
	}, [cryptoAll, sortTab, sortReverse, showZero]);

	return (
		<div className="space-y-8">
			<PageHeader title="Dashboard" description="Your wallet at a glance: every asset the protocol recognizes, valued in USDU." />

			{isDemo && (
				<p className="rounded-lg border border-usdu-surface bg-usdu-bg px-4 py-3 text-sm text-text-secondary">
					Preview with demo balances at live prices. Connect your wallet to see your own assets.
				</p>
			)}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<StatCard
					icon={faCoins}
					label="Stablecoin Assets"
					value={formatCompactNumber(stablecoinTotal, 2, '', ' USDU')}
					loading={isLoading}
				/>
				<StatCard
					icon={faGift}
					label="Reward Assets"
					value={formatCompactNumber(rewardsTotal, 2, '', ' USDU')}
					loading={isLoading}
				/>
				{/* Borrowing isn't wired into the dashboard yet */}
				<StatCard icon={faHandHoldingDollar} label="Borrow Assets" value={formatCompactNumber(0, 2, '', ' USDU')} />
			</div>

			<div className="flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
				<PillTabs value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t, label: t }))} />
				{/* crypto assets are not tied to a stablecoin */}
				<CurrencyTabs currencies={currencies} value={currency} onChange={setCurrency} disabled={tab === 'Crypto'} />
			</div>

			{tab === 'Stablecoins' && (
				<Card variant="panel" className="space-y-8">
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

					{isLoading || error || stableGroups.length === 0 ? (
						<Table>
							<TableHead headers={HEADERS} colSpan={4} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
							<TableBody>
								<TableRowEmpty>
									{isLoading
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
													<div className="flex items-center justify-end gap-1">
														{[
															{
																label: 'Swap',
																icon: faArrowRightArrowLeft,
																to: a.symbol === STABLE_OF[g.group] ? undefined : STABLE_OF[g.group],
															},
															{ label: 'Stake', icon: faSeedling, to: `r${STABLE_OF[g.group]}` },
														].map((action) => (
															<Link
																key={action.label}
																href={zapHref(a.address, action.to)}
																title={`${action.label} ${a.symbol}`}
																aria-label={`${action.label} ${a.symbol}`}
																className="flex items-center justify-center w-9 h-9 rounded-lg border border-usdu-orange text-usdu-orange hover:bg-usdu-orange hover:text-white transition-colors"
															>
																<FontAwesomeIcon icon={action.icon} className="w-4 h-4" />
															</Link>
														))}
													</div>
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
				</Card>
			)}

			{tab === 'Crypto' && (
				<Card variant="panel" className="space-y-8">
					<PageHeader
						title="Crypto Assets"
						description="The largest crypto assets in your wallet, valued in USDU. Swap or stake them straight into a stablecoin or reward vault."
					/>

					<Table>
						<TableHead headers={HEADERS} colSpan={4} actionCol tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
						<TableBody>
							{isLoadingCrypto || cryptoAssets.length === 0 ? (
								<TableRowEmpty>
									{isLoadingCrypto ? 'Loading crypto assets...' : 'No crypto assets in this wallet.'}
								</TableRowEmpty>
							) : (
								cryptoAssets.map((a) => (
									<TableRow
										key={a.key}
										headers={HEADERS}
										colSpan={4}
										tab={sortTab}
										actionCol={
											<div className="flex items-center justify-end gap-1">
												{[
													{ label: 'Swap', icon: faArrowRightArrowLeft, to: 'USDU' },
													{ label: 'Stake', icon: faSeedling, to: 'rUSDU' },
												].map((action) => (
													<Link
														key={action.label}
														href={zapHref(a.address, action.to)}
														title={`${action.label} ${a.symbol}`}
														aria-label={`${action.label} ${a.symbol}`}
														className="flex items-center justify-center w-9 h-9 rounded-lg border border-usdu-orange text-usdu-orange hover:bg-usdu-orange hover:text-white transition-colors"
													>
														<FontAwesomeIcon icon={action.icon} className="w-4 h-4" />
													</Link>
												))}
											</div>
										}
									>
										<div className="flex items-center gap-2">
											<TokenLogo logoURI={a.logoURI} currency={a.symbol} size={6} />
											<span>{a.name}</span>
										</div>
										<span>{formatCompactNumber(a.balance, a.balance < 1 ? 6 : 4, '', ` ${a.symbol}`)}</span>
										<span>
											{a.price > 0 ? `${a.price.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDU` : '-'}
										</span>
										<span>{a.price > 0 ? formatCompactNumber(a.value, 2, '', ' USDU') : '-'}</span>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</Card>
			)}

			{tab === 'Rewards' && (
				<Card variant="panel" className="space-y-8">
					<PageHeader
						title="Stablecoin Rewards"
						description="Your stake in the USDU, EURU and CHFU reward vaults, including the rewards streamed to you so far."
					/>

					<div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
						<div className="flex justify-center">
							<DonutChart
								slices={rewardSlices}
								centerLabel="Total staked"
								centerValue={formatCompactNumber(visibleRewardsTotal, 2, '', ' USDU')}
								size={240}
							/>
						</div>

						<div className="w-full divide-y divide-usdu-surface">
							{visibleRewards.map((r) => (
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
											{visibleRewardsTotal > 0 ? `${((r.value / visibleRewardsTotal) * 100).toFixed(1)}%` : '0%'}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</Card>
			)}
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
