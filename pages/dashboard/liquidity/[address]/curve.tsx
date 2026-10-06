import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { erc20Abi, formatUnits } from 'viem';
import { useReadContract } from 'wagmi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faDroplet, faScaleBalanced, faLayerGroup, faCoins } from '@fortawesome/free-solid-svg-icons';
import { useAppKit } from '@reown/appkit/react';
import { ICurveStableSwapNG_ABI, ITwocrypto_ABI } from '@usdu-finance/usdu-core';
import { useAuth } from '@/contexts/AuthContext';
import { useCurvePools } from '@/hooks/useCurvePools';
import { useSwapBalances } from '@/hooks/useSwapBalances';
import { useCurveLiquidity } from '@/hooks/useCurveLiquidity';
import { PageHeader } from '@/components/ui/layout';
import { TokenInput, ButtonInput, TabInput } from '@/components/ui/input';
import { StatGrid } from '@/components/ui/stats';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import NotFound from '@/components/ui/NotFound';
import { formatCompactNumber } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const SLIPPAGE_BPS = 50n; // 0.5%
const TABS = ['Add', 'Remove'];

const parseRaw = (v: string) => (v ? BigInt(v) : 0n);

function LiquidityCurveDetailPageContent() {
	const router = useRouter();
	const addressParam = typeof router.query.address === 'string' ? router.query.address.toLowerCase() : undefined;

	const { isConnected, address } = useAuth();
	const { open } = useAppKit();

	const { pools, isLoading, error } = useCurvePools();
	const selectedPool = pools.find((p) => p.poolAddress.toLowerCase() === addressParam);

	const [tab, setTab] = useState(TABS[0]);
	const isAdd = tab === TABS[0];
	const [amount0Input, setAmount0Input] = useState('');
	const [amount1Input, setAmount1Input] = useState('');
	const [lpInput, setLpInput] = useState('');

	// Reset the tab and amounts whenever the selected pool changes
	useEffect(() => {
		setTab(TABS[0]);
		setAmount0Input('');
		setAmount1Input('');
		setLpInput('');
	}, [selectedPool?.key]);

	// The pool itself is the allowance spender; balances hook treats coin0/coin1 as coin/target
	const balances = useSwapBalances(
		selectedPool?.tokens[0].address,
		selectedPool?.tokens[0].decimals ?? 18,
		address as `0x${string}` | undefined,
		selectedPool?.poolAddress,
		selectedPool?.tokens[1].address
	);

	// The pool contract is also its own LP token
	const { data: lpBalanceData, refetch: refetchLp } = useReadContract({
		address: selectedPool?.poolAddress,
		abi: erc20Abi,
		functionName: 'balanceOf',
		args: [address as `0x${string}`],
		query: { enabled: !!selectedPool && !!address },
	});
	const lpBalanceRaw = (lpBalanceData as bigint | undefined) ?? 0n;

	const amount0 = parseRaw(amount0Input);
	const amount1 = parseRaw(amount1Input);
	const lpAmount = parseRaw(lpInput);

	// Deposit preview via the pool's own calc_token_amount; stable and twocrypto pools have different ABIs
	const previewEnabled = !!selectedPool && isAdd && (amount0 > 0n || amount1 > 0n) && selectedPool.totalSupply > 0n;
	const { data: stableMint } = useReadContract({
		address: selectedPool?.poolAddress,
		abi: ICurveStableSwapNG_ABI,
		functionName: 'calc_token_amount',
		args: [[amount0, amount1], true],
		query: { enabled: previewEnabled && selectedPool?.kind === 'stable' },
	});
	const { data: twocryptoMint } = useReadContract({
		address: selectedPool?.poolAddress,
		abi: ITwocrypto_ABI,
		functionName: 'calc_token_amount',
		args: [[amount0, amount1], true],
		query: { enabled: previewEnabled && selectedPool?.kind === 'twocrypto' },
	});
	const mintRaw = previewEnabled ? (((selectedPool?.kind === 'stable' ? stableMint : twocryptoMint) as bigint | undefined) ?? 0n) : 0n;
	const minMintRaw = (mintRaw * (10_000n - SLIPPAGE_BPS)) / 10_000n;

	// Balanced withdrawal: pro-rata share of each pool balance
	const supply = selectedPool?.totalSupply ?? 0n;
	const withdrawRaw: [bigint, bigint] =
		selectedPool && supply > 0n && lpAmount > 0n
			? [(selectedPool.balances[0] * lpAmount) / supply, (selectedPool.balances[1] * lpAmount) / supply]
			: [0n, 0n];
	const minWithdrawRaw: [bigint, bigint] = [
		(withdrawRaw[0] * (10_000n - SLIPPAGE_BPS)) / 10_000n,
		(withdrawRaw[1] * (10_000n - SLIPPAGE_BPS)) / 10_000n,
	];

	const { approve, addLiquidity, removeLiquidity, isPending, isConfirming, isConfirmed, reset } = useCurveLiquidity();
	const [pendingStep, setPendingStep] = useState<'approve' | 'submit' | null>(null);
	const isBusy = isPending || isConfirming;

	// Refetch balances and reset inputs once a submitted transaction confirms
	useEffect(() => {
		if (isConfirmed) {
			balances.refetch();
			refetchLp();
			if (pendingStep === 'submit') {
				setAmount0Input('');
				setAmount1Input('');
				setLpInput('');
			}
			setPendingStep(null);
			reset();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isConfirmed]);

	const insufficient0 = isAdd && amount0 > balances.coinBalanceRaw;
	const insufficient1 = isAdd && amount1 > balances.targetBalanceRaw;
	const insufficientLp = !isAdd && lpAmount > lpBalanceRaw;
	const needsApproval0 = isAdd && amount0 > 0n && balances.coinAllowanceRaw < amount0;
	const needsApproval1 = isAdd && amount1 > 0n && balances.targetAllowanceRaw < amount1;
	const noInput = isAdd ? amount0 === 0n && amount1 === 0n : lpAmount === 0n;
	const noLiquidity = !!selectedPool && selectedPool.totalSupply === 0n;

	const handleAction = async () => {
		if (!selectedPool || noInput) return;

		try {
			if (isAdd) {
				if (needsApproval0) {
					setPendingStep('approve');
					await approve(selectedPool.tokens[0].address, selectedPool.poolAddress, amount0);
					return;
				}
				if (needsApproval1) {
					setPendingStep('approve');
					await approve(selectedPool.tokens[1].address, selectedPool.poolAddress, amount1);
					return;
				}
				setPendingStep('submit');
				await addLiquidity(selectedPool.kind, selectedPool.poolAddress, [amount0, amount1], minMintRaw);
			} else {
				setPendingStep('submit');
				await removeLiquidity(selectedPool.kind, selectedPool.poolAddress, lpAmount, minWithdrawRaw);
			}
		} catch {
			setPendingStep(null);
		}
	};

	const approvalSymbol = needsApproval0 ? selectedPool?.tokens[0].symbol : selectedPool?.tokens[1].symbol;
	const actionLabel = !isConnected
		? 'Connect Wallet'
		: isBusy
			? pendingStep === 'approve'
				? 'Approving...'
				: isAdd
					? 'Adding...'
					: 'Removing...'
			: isAdd && (needsApproval0 || needsApproval1)
				? `Approve ${approvalSymbol}`
				: isAdd
					? 'Add Liquidity'
					: 'Remove Liquidity';

	if (!router.isReady || isLoading) {
		return (
			<div className="space-y-8">
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-text-secondary">Loading curve pools...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-8">
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-red-500">Error: {error}</p>
					</div>
				</div>
			</div>
		);
	}

	if (!selectedPool) {
		return (
			<NotFound
				title="Pool Not Found"
				description="This curve pool doesn't exist or isn't available."
				ctaLabel="Back to Liquidity"
				ctaHref="/dashboard/liquidity"
			/>
		);
	}

	const [token0, token1] = selectedPool.tokens;
	const compositionLabel =
		selectedPool.totalValue > 0 ? `${(selectedPool.ratios[0] * 100).toFixed(1)}% / ${(selectedPool.ratios[1] * 100).toFixed(1)}%` : '—';

	return (
		<div className="space-y-8">
			<PageHeader
				title={selectedPool.label}
				description={`Provide or remove liquidity directly on the ${token0.symbol} / ${token1.symbol} Curve pool.`}
				breadcrumbs={[{ label: 'Liquidity', href: '/dashboard/liquidity' }, { label: selectedPool.label }]}
			/>

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 4 }}
				stats={[
					{
						icon: faDroplet,
						label: 'Total Value Locked',
						value: formatCompactNumber(selectedPool.totalValue, 1, '', ' USDU'),
					},
					{
						icon: faScaleBalanced,
						label: `${token0.symbol} / ${token1.symbol}`,
						value: compositionLabel,
					},
					{
						icon: faLayerGroup,
						label: 'LP Supply',
						value: formatCompactNumber(formatUnits(selectedPool.totalSupply, 18), 1, '', ' LP'),
					},
					{
						icon: faCoins,
						label: 'Your LP Balance',
						value: isConnected ? formatCompactNumber(formatUnits(lpBalanceRaw, 18), 1, '', ' LP') : '—',
					},
				]}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Liquidity */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
					<h3 className="font-semibold text-usdu-black text-lg">Liquidity</h3>

					<TabInput tabs={TABS} tab={tab} setTab={setTab} />

					{isAdd ? (
						<>
							<TokenInput
								label={`Deposit ${token0.symbol}`}
								symbol={token0.symbol}
								digit={token0.decimals}
								value={amount0Input}
								onChange={setAmount0Input}
								max={isConnected ? balances.coinBalanceRaw : undefined}
								reset={isConnected ? 0n : undefined}
								onReset={() => setAmount0Input('')}
								limitLabel={isConnected ? 'Balance' : undefined}
								limit={balances.coinBalanceRaw}
								limitDigit={token0.decimals}
								error={insufficient0 ? `Insufficient ${token0.symbol} balance.` : undefined}
							/>
							<TokenInput
								label={`Deposit ${token1.symbol}`}
								symbol={token1.symbol}
								digit={token1.decimals}
								value={amount1Input}
								onChange={setAmount1Input}
								max={isConnected ? balances.targetBalanceRaw : undefined}
								reset={isConnected ? 0n : undefined}
								onReset={() => setAmount1Input('')}
								limitLabel={isConnected ? 'Balance' : undefined}
								limit={balances.targetBalanceRaw}
								limitDigit={token1.decimals}
								error={insufficient1 ? `Insufficient ${token1.symbol} balance.` : undefined}
							/>
							<TokenInput
								label="You receive (estimated)"
								symbol="LP"
								output={formatUnits(mintRaw, 18)}
								disabled
								limitLabel={isConnected ? 'Balance' : undefined}
								limit={lpBalanceRaw}
								limitDigit={18}
								note={
									noLiquidity
										? 'Empty pool: your deposit sets the initial balance and the LP amount cannot be previewed.'
										: mintRaw > 0n
											? `Min. received (${Number(SLIPPAGE_BPS) / 100}% slippage): ${formatUnits(minMintRaw, 18)} LP`
											: undefined
								}
							/>
						</>
					) : (
						<>
							<TokenInput
								label="You burn"
								symbol="LP"
								digit={18}
								value={lpInput}
								onChange={setLpInput}
								max={isConnected ? lpBalanceRaw : undefined}
								reset={isConnected ? 0n : undefined}
								onReset={() => setLpInput('')}
								limitLabel={isConnected ? 'Balance' : undefined}
								limit={lpBalanceRaw}
								limitDigit={18}
								error={insufficientLp ? 'Insufficient LP balance.' : undefined}
							/>
							<TokenInput
								label={`You receive ${token0.symbol} (estimated)`}
								symbol={token0.symbol}
								output={formatUnits(withdrawRaw[0], token0.decimals)}
								disabled
								limitLabel={isConnected ? 'Balance' : undefined}
								limit={balances.coinBalanceRaw}
								limitDigit={token0.decimals}
							/>
							<TokenInput
								label={`You receive ${token1.symbol} (estimated)`}
								symbol={token1.symbol}
								output={formatUnits(withdrawRaw[1], token1.decimals)}
								disabled
								limitLabel={isConnected ? 'Balance' : undefined}
								limit={balances.targetBalanceRaw}
								limitDigit={token1.decimals}
								note={
									lpAmount > 0n
										? `Withdrawn proportionally in both tokens, ${Number(SLIPPAGE_BPS) / 100}% slippage tolerance.`
										: undefined
								}
							/>
						</>
					)}

					<ButtonInput
						label={actionLabel}
						size="lg"
						className="w-full"
						disabled={
							isConnected &&
							(noInput ||
								insufficient0 ||
								insufficient1 ||
								insufficientLp ||
								isBusy ||
								(isAdd && !noLiquidity && mintRaw === 0n))
						}
						loading={isConnected && isBusy}
						onClick={isConnected ? handleAction : () => open()}
						icon={!isConnected ? <FontAwesomeIcon icon={faWallet} className="w-4 h-4" /> : undefined}
					/>
				</div>

				{/* Details */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface h-full">
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Details</h3>

					<DetailRow label="Pool Type" value={selectedPool.kind === 'stable' ? 'Curve StableSwap NG' : 'Curve Twocrypto NG'} />

					<h3 className="font-semibold text-usdu-black text-lg mt-10 mb-3">Addresses</h3>

					<DetailRow label="Curve Pool / LP Token">
						<AddressLink address={selectedPool.poolAddress} />
					</DetailRow>
					<DetailRow label={token0.symbol}>
						<AddressLink address={token0.address} />
					</DetailRow>
					<DetailRow label={token1.symbol}>
						<AddressLink address={token1.address} />
					</DetailRow>
				</div>
			</div>
		</div>
	);
}

export default function LiquidityCurveDetailPage() {
	return (
		<>
			<NextSeo title={SEO.liquidityPool.title} description={SEO.liquidityPool.description} openGraph={SEO.liquidityPool.openGraph} />
			<LiquidityCurveDetailPageContent />
		</>
	);
}
