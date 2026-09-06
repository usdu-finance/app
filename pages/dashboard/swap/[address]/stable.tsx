import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faArrowRightToBracket, faArrowRightFromBracket, faPercent, faSackDollar } from '@fortawesome/free-solid-svg-icons';
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/contexts/AuthContext';
import { useSwapModules } from '@/hooks/useSwapModules';
import { useSwapBalances } from '@/hooks/useSwapBalances';
import { useSwap } from '@/hooks/useSwap';
import { PageHeader } from '@/components/ui/layout';
import { TokenInput, ButtonInput, TabInput } from '@/components/ui/input';
import { StatGrid } from '@/components/ui/stats';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import NotFound from '@/components/ui/NotFound';
import { formatCompactNumber, formatTimestampLocale, formatAddress } from '@/lib/utils';

const fmtStable = (currency: string, value: bigint, round: boolean = true) =>
	`${formatCompactNumber(formatUnits(value, 18), 1, '', '', round)} ${currency}`;

type SwapDirection = 'in' | 'out';

export default function SwapDetailPage() {
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

	const { approve, swapIn, swapOut, isPending, isConfirming, isConfirmed, reset } = useSwap();
	const [pendingStep, setPendingStep] = useState<'approve' | 'swap' | null>(null);

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
	const needsApproval = amountRaw > 0n && allowanceRaw < amountRaw;
	const insufficientBalance = amountRaw > 0n && amountRaw > inputBalanceRaw;
	const exceedsCapacity = amountRaw > 0n && amountRaw > moduleCapacityRaw;
	const isBusy = isPending || isConfirming;

	const handleAction = async () => {
		if (!selectedModule || amountRaw === 0n) return;

		try {
			if (needsApproval) {
				setPendingStep('approve');
				const token = direction === 'in' ? selectedModule.coinAddress : selectedModule.targetAddress;
				await approve(token, selectedModule.routerAddress, amountRaw);
				return;
			}

			setPendingStep('swap');
			if (direction === 'in') {
				await swapIn(selectedModule.routerAddress, selectedModule.moduleAddress, amountRaw);
			} else {
				await swapOut(selectedModule.routerAddress, selectedModule.moduleAddress, amountRaw);
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
				: 'Swapping...'
			: needsApproval
				? `Approve ${inputSymbol}`
				: 'Swap';

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

	const moduleLabel = `${selectedModule.coinSymbol} · ${selectedModule.vaultName || formatAddress(selectedModule.moduleAddress)}`;

	return (
		<div className="space-y-8">
			<PageHeader
				title={moduleLabel}
				description="Mint fresh stablecoins for an equal amount of backed asset, or redeem them back into the backed asset, through this swap router."
				breadcrumbs={[{ label: 'Swap', href: '/dashboard/swap' }, { label: moduleLabel }]}
			/>

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 4 }}
				stats={[
					{
						icon: faArrowRightToBracket,
						label: 'Available In',
						value: fmtStable(selectedModule.currency, selectedModule.mintable, false),
					},
					{
						icon: faArrowRightFromBracket,
						label: 'Available Out',
						value: `${formatCompactNumber(formatUnits(selectedModule.totalMinted, 18), 1, '')} ${selectedModule.coinSymbol}`,
					},
					{
						icon: faPercent,
						label: 'Fees In / Fees Out',
						value: `${(selectedModule.swapInFeePPM / 10_000).toFixed(2)} / ${(selectedModule.swapOutFeePPM / 10_000).toFixed(2)}`,
					},
					{
						icon: faSackDollar,
						label: 'Revenue',
						value: fmtStable(selectedModule.currency, selectedModule.totalRevenue),
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

					<ButtonInput
						label={actionLabel}
						size="lg"
						className="w-full"
						disabled={isConnected && (amountRaw === 0n || insufficientBalance || exceedsCapacity || isBusy)}
						loading={isConnected && isBusy}
						onClick={isConnected ? handleAction : () => open()}
						icon={!isConnected ? <FontAwesomeIcon icon={faWallet} className="w-4 h-4" /> : undefined}
					/>
				</div>

				{/* Details */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface h-full flex flex-col">
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Details</h3>

					<DetailRow label="Strategy" value={selectedModule.vaultName || '—'} />
					<DetailRow label="Expiration" value={formatTimestampLocale(selectedModule.expiresAt)} />

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

					<p className="mt-10 lg:mt-auto text-sm text-text-secondary">
						The input token is deposited into the strategy vault, generating additional revenue for the protocol.
					</p>
				</div>
			</div>
		</div>
	);
}
