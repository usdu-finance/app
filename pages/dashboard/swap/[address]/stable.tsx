import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightToBracket, faArrowRightFromBracket, faVault } from '@fortawesome/free-solid-svg-icons';
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/contexts/AuthContext';
import { useSwapModules } from '@/hooks/useSwapModules';
import { useSwapBalances } from '@/hooks/useSwapBalances';
import { useTx } from '@/hooks/useTx';
import { approveCall, reconcileCall, swapInCall, swapOutCall } from '@/lib/tx/calls';
import { useModuleDaily } from '@/hooks/useModuleDaily';
import { useModuleSwapHistory, type ModuleSwapEntry } from '@/hooks/useModuleSwapHistory';
import { useSort } from '@/hooks/ui/useSort';
import { PageHeader } from '@/components/ui/layout';
import Card from '@/components/ui/Card';
import { TokenInput, ApproveActionInput, TabInput } from '@/components/ui/input';
import { TimeSeriesChart } from '@/components/ui/charts';
import HeroSteps from '@/components/ui/HeroSteps';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import AppLink from '@/components/ui/AppLink';
import { getSwapStrategyMeta } from '@/lib/swap-strategies';
import { getBlockExplorerUrl } from '@/lib/web3/config';
import { revenueSeries, tvlSeries, volumeSeries, withLive } from '@/lib/module-series';
import NotFound from '@/components/ui/NotFound';
import { formatCompactNumber, formatTimestampLocale, formatAddress } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const fmtStable = (currency: string, value: bigint, round: boolean = true) =>
	`${formatCompactNumber(formatUnits(value, 18), 1, '', '', round)} ${currency}`;

type SwapDirection = 'in' | 'out';

const CHART_TABS = ['TVL', 'Volume', 'Revenue'];
// the last reconcile is stale after a week, from then on it can be claimed
const RECONCILE_STALE = 7 * 24 * 60 * 60;
const HISTORY_HEADERS = ['Date', 'Type', 'Coin', 'Stablecoin', 'Fee'];

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function compareSwaps(tab: string, a: ModuleSwapEntry, b: ModuleSwapEntry): number {
	switch (tab) {
		case 'Type':
			return a.kind.localeCompare(b.kind);
		case 'Coin':
			return compareBigint(BigInt(b.amountCoin), BigInt(a.amountCoin));
		case 'Stablecoin':
			return compareBigint(BigInt(b.amountStable), BigInt(a.amountStable));
		case 'Fee':
			return compareBigint(BigInt(b.fee), BigInt(a.fee));
		default:
			return compareBigint(BigInt(b.created), BigInt(a.created)); // 'Date', newest first
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faArrowRightToBracket} className="w-3 h-3 text-usdu-card" />,
		title: 'Swap in',
		description: 'Deposit the backed asset and mint the same amount of stablecoin, minus the swap-in fee.',
	},
	{
		icon: <FontAwesomeIcon icon={faVault} className="w-3 h-3 text-usdu-card" />,
		title: 'Backed by a strategy',
		description: 'The asset is deposited into a strategy vault. Its yield is protocol revenue, not paid to swappers.',
	},
	{
		icon: <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-3 h-3 text-usdu-card" />,
		title: 'Swap out',
		description: 'Burn stablecoin at any time to redeem the backed asset, minus the swap-out fee.',
	},
];

function SwapDetailPageContent() {
	const router = useRouter();
	const moduleAddressParam = typeof router.query.address === 'string' ? router.query.address.toLowerCase() : undefined;

	const { isConnected, address } = useAuth();
	const { open } = useAppKit();

	const { modules, isLoading: isLoadingModules, error: modulesError } = useSwapModules();
	const selectedModule = modules.find((m) => m.moduleAddress.toLowerCase() === moduleAddressParam);

	const directionTabs = selectedModule
		? [`${selectedModule.coinSymbol} → ${selectedModule.currency}`, `${selectedModule.currency} → ${selectedModule.coinSymbol}`]
		: [];
	const [directionTab, setDirectionTab] = useState('');
	const direction: SwapDirection = directionTab === directionTabs[1] ? 'out' : 'in';

	const [amountRawInput, setAmountRawInput] = useState('');

	// Reset the direction tab and amount whenever the selected module changes
	useEffect(() => {
		setDirectionTab(directionTabs[0] ?? '');
		setAmountRawInput('');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedModule?.key]);

	const balances = useSwapBalances(
		selectedModule?.coinAddress,
		selectedModule?.coinDecimals ?? 6,
		address as `0x${string}` | undefined,
		selectedModule?.routerAddress,
		selectedModule?.targetAddress
	);

	const [chartTab, setChartTab] = useState(CHART_TABS[0]!);
	const { snapshots, swapDays } = useModuleDaily(selectedModule?.moduleAddress);
	const {
		entries,
		isLoading: isLoadingSwaps,
		error: swapsError,
	} = useModuleSwapHistory(selectedModule?.moduleAddress, address ?? undefined);
	const { sortTab, sortReverse, handleSort } = useSort('Date');
	const sortedSwaps = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...entries].sort((a, b) => dir * compareSwaps(sortTab, a, b));
	}, [entries, sortTab, sortReverse]);

	const tx = useTx();

	const inputDecimals = direction === 'in' ? (selectedModule?.coinDecimals ?? 6) : 18;
	const outputDecimals = direction === 'in' ? 18 : (selectedModule?.coinDecimals ?? 6);
	const inputSymbol = direction === 'in' ? (selectedModule?.coinSymbol ?? '') : (selectedModule?.currency ?? '');
	const outputSymbol = direction === 'in' ? (selectedModule?.currency ?? '') : (selectedModule?.coinSymbol ?? '');
	const inputBalanceRaw = direction === 'in' ? balances.coinBalanceRaw : balances.targetBalanceRaw;
	const outputBalanceRaw = direction === 'in' ? balances.targetBalanceRaw : balances.coinBalanceRaw;

	const amountRaw = amountRawInput ? BigInt(amountRawInput) : 0n;

	const outputPreview = useMemo(() => {
		if (!selectedModule || amountRaw === 0n) return null;

		if (direction === 'in') {
			// amountStable = amount * 1e18 / 10**coinDecimals; fee = amountStable * feePPM / 1e6
			const amountStable = (amountRaw * 10n ** 18n) / 10n ** BigInt(selectedModule.coinDecimals);
			const fee = (amountStable * BigInt(selectedModule.swapInFeePPM)) / 1_000_000n;
			return { output: amountStable - fee, fee, feePPM: selectedModule.swapInFeePPM, decimals: 18 };
		}

		// fee (18-decimal stablecoin) = amount * feePPM / 1e6; both the payout and the fee itself are then
		// converted from the stablecoin to coin decimals, mirroring SwapBridgeMorphoV1._swapOut's feeCoin calc —
		// fee must not be formatted with coinDecimals while still in 18-decimal stablecoin units.
		const feeStable = (amountRaw * BigInt(selectedModule.swapOutFeePPM)) / 1_000_000n;
		const amountCoin = ((amountRaw - feeStable) * 10n ** BigInt(selectedModule.coinDecimals)) / 10n ** 18n;
		const feeCoin = (feeStable * 10n ** BigInt(selectedModule.coinDecimals)) / 10n ** 18n;
		return {
			output: amountCoin,
			fee: feeCoin,
			feePPM: selectedModule.swapOutFeePPM,
			decimals: selectedModule.coinDecimals,
		};
	}, [selectedModule, amountRaw, direction]);

	// Swap-in mints (amountStable - fee) against mintCap (see SwapBridgeMorphoV1._swapIn), so the max coin
	// amount that can be swapped in is bounded by remaining module capacity, not just wallet balance.
	const maxMintableCoinRaw = useMemo(() => {
		if (!selectedModule || selectedModule.swapInFeePPM >= 1_000_000) return 0n;
		const maxMintableStable = (selectedModule.mintable * 1_000_000n) / BigInt(1_000_000 - selectedModule.swapInFeePPM);
		return (maxMintableStable * 10n ** BigInt(selectedModule.coinDecimals)) / 10n ** 18n;
	}, [selectedModule]);

	// Swap-out burns `amount` of the target stablecoin and decrements totalMinted (see
	// SwapBridgeMorphoV1._swapOut), which would underflow/revert past totalMinted — so the max amount that
	// can be swapped out is capped by totalMinted, not just wallet balance.
	const moduleCapacityRaw = direction === 'in' ? maxMintableCoinRaw : (selectedModule?.totalMinted ?? 0n);
	const walletMaxRaw = isConnected ? inputBalanceRaw : undefined;
	const maxRaw = walletMaxRaw !== undefined ? (walletMaxRaw < moduleCapacityRaw ? walletMaxRaw : moduleCapacityRaw) : undefined;

	const allowanceRaw = direction === 'in' ? balances.coinAllowanceRaw : balances.targetAllowanceRaw;
	const insufficientBalance = amountRaw > 0n && amountRaw > inputBalanceRaw;
	const exceedsCapacity = amountRaw > 0n && amountRaw > moduleCapacityRaw;
	const claiming = tx.batches.some((b) => b.title === 'Claim revenue');

	// the approval (if missing) and the swap go out as one batch, the form is free again once the wallet signed
	const handleAction = async () => {
		if (!selectedModule || amountRaw === 0n) return;
		const token = direction === 'in' ? selectedModule.coinAddress : selectedModule.targetAddress;
		const symbol = direction === 'in' ? selectedModule.coinSymbol : selectedModule.currency;
		const { routerAddress, moduleAddress } = selectedModule;

		try {
			await tx.submit(
				[
					allowanceRaw < amountRaw && approveCall(token, routerAddress, amountRaw, symbol),
					direction === 'in' ? swapInCall(routerAddress, moduleAddress, amountRaw) : swapOutCall(routerAddress, moduleAddress, amountRaw),
				],
				{ title: `Swap ${inputSymbol} to ${outputSymbol}`, onConfirmed: balances.refetch }
			);
			setAmountRawInput('');
		} catch {
			// the user declined, the toast shows it
		}
	};

	if (!router.isReady || isLoadingModules) {
		return (
			<div className="space-y-8">
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-text-secondary">Loading swap modules...</p>
					</div>
				</div>
			</div>
		);
	}

	if (modulesError) {
		return (
			<div className="space-y-8">
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-red-500">Error: {modulesError}</p>
					</div>
				</div>
			</div>
		);
	}

	if (!selectedModule) {
		return (
			<NotFound
				title="Module Not Found"
				description="This swap module doesn't exist or isn't available."
				ctaLabel="Back to Swap"
				ctaHref="/dashboard/swap"
			/>
		);
	}

	const swapStrategyMeta = getSwapStrategyMeta(selectedModule.moduleAddress, selectedModule.vaultAddress);
	const moduleLabel = `${selectedModule.coinSymbol} · ${selectedModule.vaultName || formatAddress(selectedModule.moduleAddress)}`;

	const currency = selectedModule.currency;

	// reconcile is permissionless, so once the last one is a week old anyone can claim
	const lastReconcileLabel = selectedModule.lastReconciledAt === 0n ? 'Never' : formatTimestampLocale(selectedModule.lastReconciledAt);
	const claimable = Math.floor(Date.now() / 1000) - Number(selectedModule.lastReconciledAt) > RECONCILE_STALE;
	const claim = () => tx.submit([reconcileCall(selectedModule.moduleAddress)], { title: 'Claim revenue' }).catch(() => {});
	const fmtAmount = (v: number) => `${formatCompactNumber(v, 1, '')} ${currency}`;

	// indexer snapshots plus the live on-chain value as the latest point
	const dailyPoints = withLive(snapshots, {
		totalMinted: Number(formatUnits(selectedModule.totalMinted, 18)),
		totalRevenue: Number(formatUnits(selectedModule.totalRevenue, 18)),
	});
	// TVL as a share of the mint limit per day. The indexer keeps no history of the limit, so today's limit is used for every day.
	const mintCap = Number(formatUnits(selectedModule.mintCap, 18));
	const allocationPoints = tvlSeries(dailyPoints).map((p) => ({ t: p.t, v: mintCap > 0 ? Math.min((p.v / mintCap) * 100, 100) : 0 }));
	const fmtPercent = (v: number) => `${v.toFixed(1)}%`;
	const lifetimeVolume = swapDays.reduce((sum, d) => sum + d.volume, 0);
	const chart = {
		TVL: {
			points: allocationPoints,
			variant: 'line' as const,
			headline: fmtAmount(Number(formatUnits(selectedModule.totalMinted, 18))),
			subtitle: `Minted against the ${fmtAmount(mintCap)} mint limit of this module, per day`,
		},
		Revenue: {
			points: revenueSeries(dailyPoints),
			variant: 'area' as const,
			headline: fmtAmount(Number(formatUnits(selectedModule.totalRevenue, 18))),
			subtitle: 'Accumulated revenue: swap fees and strategy yield',
		},
		Volume: {
			points: volumeSeries(dailyPoints, swapDays),
			variant: 'bars' as const,
			headline: fmtAmount(lifetimeVolume),
			subtitle: 'Lifetime swap volume, per day',
		},
	}[chartTab]!;

	return (
		<div className="space-y-8">
			<PageHeader
				title={moduleLabel}
				description="Mint fresh stablecoins for an equal amount of backed asset, or redeem them back into the backed asset, through this swap router."
				breadcrumbs={[{ label: 'Swap', href: '/dashboard/swap' }, { label: moduleLabel }]}
			/>

			<HeroSteps steps={STEPS} />

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* TVL / Revenue / Volume over time */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-4">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h3 className="font-semibold text-usdu-black text-lg">{chartTab}</h3>
							<p className="text-sm text-text-secondary">{chart.subtitle}</p>
						</div>
						<p className="text-2xl font-bold text-text-primary text-right">{chart.headline}</p>
					</div>

					{chart.points.length > 1 || (chart.variant === 'bars' && chart.points.length > 0) ? (
						<TimeSeriesChart
							points={chart.points}
							variant={chart.variant}
							zeroBased={chartTab === 'TVL'}
							formatValue={chartTab === 'TVL' ? fmtPercent : fmtAmount}
							formatTick={chartTab === 'TVL' ? (v) => `${Math.round(v)}%` : (v) => formatCompactNumber(v, 1, '')}
						/>
					) : (
						<p className="py-12 text-center text-text-secondary">Not enough data yet.</p>
					)}

					<TabInput tabs={CHART_TABS} tab={chartTab} setTab={setChartTab} />
				</div>

				{/* Module info */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface h-full flex flex-col">
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Module</h3>

					<DetailRow label="Strategy">
						{swapStrategyMeta ? (
							<AppLink href={swapStrategyMeta.url}>{selectedModule.vaultName || swapStrategyMeta.provider}</AppLink>
						) : (
							<span>{selectedModule.vaultName || '—'}</span>
						)}
					</DetailRow>
					<DetailRow label="Available In" value={fmtStable(currency, selectedModule.mintable, false)} />
					<DetailRow
						label="Available Out"
						value={`${formatCompactNumber(formatUnits(selectedModule.totalMinted, 18), 1, '')} ${selectedModule.coinSymbol}`}
					/>
					<DetailRow
						label="Fees In / Fees Out"
						value={`${(selectedModule.swapInFeePPM / 10_000).toFixed(2)}% / ${(selectedModule.swapOutFeePPM / 10_000).toFixed(2)}%`}
					/>
					<DetailRow label="Total Revenue" value={fmtStable(currency, selectedModule.totalRevenue)} />
					<DetailRow label="Unclaimed Revenue" value={fmtStable(currency, selectedModule.unclaimed)} />
					<DetailRow label="Last Reconcile">
						{claimable ? (
							<button
								type="button"
								disabled={tx.isSigning || claiming}
								onClick={() => (isConnected ? claim() : open())}
								title="Recognize the accrued yield as revenue"
								className="text-brand font-medium hover:underline disabled:opacity-50 disabled:no-underline"
							>
								{claiming ? 'Claiming...' : `${lastReconcileLabel} · Claim`}
							</button>
						) : (
							<span>{lastReconcileLabel}</span>
						)}
					</DetailRow>
					<DetailRow
						label="Expiration"
						value={selectedModule.expiresAt === 0n ? 'Pending DAO approval' : formatTimestampLocale(selectedModule.expiresAt)}
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Swap */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
					<h3 className="font-semibold text-usdu-black text-lg">Swap</h3>

					{/* Direction toggle */}
					<TabInput tabs={directionTabs} tab={directionTab} setTab={setDirectionTab} />

					{/* Amount input */}
					<TokenInput
						label="You pay"
						symbol={inputSymbol}
						digit={inputDecimals}
						value={amountRawInput}
						onChange={setAmountRawInput}
						max={maxRaw}
						reset={isConnected ? 0n : undefined}
						onReset={() => setAmountRawInput('')}
						limitLabel={isConnected ? 'Balance' : undefined}
						limit={inputBalanceRaw}
						limitDigit={inputDecimals}
						error={
							exceedsCapacity
								? `Exceeds module capacity — max ${formatUnits(moduleCapacityRaw, inputDecimals)} ${inputSymbol}.`
								: insufficientBalance
									? `Insufficient ${inputSymbol} balance.`
									: undefined
						}
					/>

					{/* Output preview */}
					<TokenInput
						label="You receive (estimated)"
						symbol={outputSymbol}
						output={outputPreview ? formatUnits(outputPreview.output, outputPreview.decimals) : '0.0'}
						disabled
						limitLabel={isConnected ? 'Balance' : undefined}
						limit={outputBalanceRaw}
						limitDigit={outputDecimals}
						note={
							outputPreview
								? `Fee: ${(outputPreview.feePPM / 10_000).toFixed(2)}% (${formatUnits(outputPreview.fee, outputPreview.decimals)} ${outputSymbol})`
								: undefined
						}
					/>

					<ApproveActionInput
						actionLabel="Swap"
						approvals={[
							{
								tokenSymbol: inputSymbol,
								needsApproval: amountRaw === 0n || allowanceRaw < amountRaw,
							},
						]}
						isActing={tx.isSigning}
						disabled={amountRaw === 0n || insufficientBalance || exceedsCapacity || tx.isSigning}
						onAction={handleAction}
						isConnected={isConnected}
						onConnect={() => open()}
					/>
				</div>

				{/* Your details and addresses */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface h-full flex flex-col">
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Your Details</h3>

					<DetailRow
						label={`Your ${selectedModule.coinSymbol}`}
						value={
							isConnected
								? `${formatCompactNumber(formatUnits(balances.coinBalanceRaw, selectedModule.coinDecimals), 2, '')} ${selectedModule.coinSymbol}`
								: '—'
						}
					/>
					<DetailRow label={`Your ${currency}`} value={isConnected ? fmtStable(currency, balances.targetBalanceRaw) : '—'} />

					<h3 className="font-semibold text-usdu-black text-lg mt-10 mb-3">Addresses</h3>

					<DetailRow label="Swap Router">
						<AddressLink address={selectedModule.routerAddress} />
					</DetailRow>
					<DetailRow label="Bridge Module">
						<AddressLink address={selectedModule.moduleAddress} />
					</DetailRow>
					<DetailRow label="Input Token">
						<AddressLink address={selectedModule.coinAddress} />
					</DetailRow>
					<DetailRow label="Strategy Vault">
						<AddressLink address={selectedModule.vaultAddress} />
					</DetailRow>

					<p className="mt-6 lg:mt-auto pt-4 text-sm text-text-secondary">
						The input token is deposited into the strategy vault. Its yield is protocol revenue and is not paid to swappers.
					</p>
				</div>
			</div>

			<Card variant="panel" className="space-y-8">
				<PageHeader
					title="History"
					description={`Your swaps between ${selectedModule.coinSymbol} and ${currency} on this module.`}
				/>
				<Table>
					<TableHead headers={HISTORY_HEADERS} colSpan={5} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
					<TableBody>
						{!isConnected ? (
							<TableRowEmpty>Connect your wallet to see your history.</TableRowEmpty>
						) : isLoadingSwaps ? (
							<TableRowEmpty>Loading history...</TableRowEmpty>
						) : swapsError && entries.length === 0 ? (
							<TableRowEmpty>{`Error: ${swapsError}`}</TableRowEmpty>
						) : sortedSwaps.length === 0 ? (
							<TableRowEmpty>No swaps yet.</TableRowEmpty>
						) : (
							sortedSwaps.map((e) => (
								<TableRow key={`${e.txHash}-${e.logIndex}`} headers={HISTORY_HEADERS} colSpan={5} tab={sortTab}>
									<AppLink href={getBlockExplorerUrl(`tx/${e.txHash}`)}>
										{formatTimestampLocale(BigInt(e.created))}
									</AppLink>
									<span>{e.kind === 'SwapIn' ? 'Swap In' : 'Swap Out'}</span>
									<span>{`${formatCompactNumber(formatUnits(BigInt(e.amountCoin), selectedModule.coinDecimals), 2, '')} ${selectedModule.coinSymbol}`}</span>
									<span>{fmtStable(currency, BigInt(e.amountStable))}</span>
									<span>{fmtStable(currency, BigInt(e.fee))}</span>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

export default function SwapDetailPage() {
	return (
		<>
			<NextSeo title={SEO.swapModule.title} description={SEO.swapModule.description} openGraph={SEO.swapModule.openGraph} />
			<SwapDetailPageContent />
		</>
	);
}
