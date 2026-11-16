import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { decodeFunctionData, encodeFunctionData, erc20Abi, formatUnits, maxUint256, parseUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { NextSeo } from 'next-seo';
import { ADDRESS, ForeignSwapperV1_ABI, ISwapRouterV1_ABI, Stablecoin_ABI } from '@usdu-finance/usdu-core';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import { Modal } from '@/components/ui/modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faArrowRightArrowLeft,
	faBan,
	faBolt,
	faCircleCheck,
	faCoins,
	faCopy,
	faDownload,
	faHourglassHalf,
	faPlus,
	faRoute,
	faXmark,
} from '@fortawesome/free-solid-svg-icons';
import Card from '@/components/ui/Card';
import { PillTabs, TabsBar, TokenInput, TokenSelectModal } from '@/components/ui/input';
import HeroSteps from '@/components/ui/HeroSteps';
import { useQueryTab } from '@/hooks/ui/useQueryTab';
import { useSwapModules } from '@/hooks/useSwapModules';
import { useCurvePools } from '@/hooks/useCurvePools';
import {
	ERC4626_ABI,
	FOREIGN_TOKENS,
	SV_DEURO_ADDRESS,
	nextChoices,
	resolvePath,
	type PathToken,
	type StepChoice,
} from '@/lib/swapper/routes';
import { useTx } from '@/hooks/useTx';
import { APP_REFETCH, SEO } from '@/lib/constants';
import { TOKENS } from '@/lib/tokens/config';
import { formatCompactNumber } from '@/lib/utils';

const HEADERS = ['Token', 'Approved', 'Threshold', 'Rate', 'Receives'];
const COL_SPAN = HEADERS.length;

const ICON_BTN =
	'flex items-center justify-center w-9 h-9 rounded-lg border border-usdu-orange text-usdu-orange hover:bg-usdu-orange hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none';

interface OnchainRoute {
	enabled: boolean;
	tokenOut: `0x${string}`;
	minRate: bigint;
	maxAmount: bigint;
	minAmount: bigint;
	steps: readonly { target: `0x${string}`; tokenIn: `0x${string}`; tokenOut: `0x${string}`; data: `0x${string}` }[];
}

/** What the Set Route form holds for a token: digits of the 1e18 rate and of the amounts, and the picked steps. */
interface RouteDraft {
	choices: StepChoice[];
	rate: string;
	minAmount: string;
	maxAmount: string;
}

// one tab per kind of action taken on behalf of the DAO, more will follow
const TABS = ['Foreign Swapper'] as const;

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faCoins} className="w-3 h-3 text-usdu-card" />,
		title: 'Approve a token',
		description: 'The DAO approves the swapper for a foreign token it holds, like USDC, ZCHF or svDEURO.',
	},
	{
		icon: <FontAwesomeIcon icon={faRoute} className="w-3 h-3 text-usdu-card" />,
		title: 'Set a route',
		description: 'The curator chains an unwrap and Stable Bridges into a route, with a minimum rate as price protection.',
	},
	{
		icon: <FontAwesomeIcon icon={faBolt} className="w-3 h-3 text-usdu-card" />,
		title: 'Anyone converts',
		description: 'Anyone can trigger the swap. The result always lands back in the DAO.',
	},
];

const STABLE = ADDRESS[mainnet.id].usduStable;
const FOREIGN_SWAPPER = ADDRESS[mainnet.id].foreignSwapperV1;
const DAO = ADDRESS[mainnet.id].aragonDao;

function DaoPageContent() {
	const { address } = useAccount();
	const { submit, isSigning } = useTx();

	const { data: roles } = useReadContracts({
		contracts: [
			{ address: STABLE, abi: Stablecoin_ABI, functionName: 'curator' },
			{ address: STABLE, abi: Stablecoin_ABI, functionName: 'guardian' },
		],
		query: { refetchInterval: APP_REFETCH },
	});

	const dao = (roles?.[0]?.result as `0x${string}` | undefined) ?? DAO; // the swapper pulls from the curator

	const { data, error, isLoading } = useReadContracts({
		contracts: FOREIGN_TOKENS.flatMap((t) => [
			{
				address: FOREIGN_SWAPPER,
				abi: ForeignSwapperV1_ABI,
				functionName: 'getRoute' as const,
				args: [t.address],
			},
			{
				address: FOREIGN_SWAPPER,
				abi: ForeignSwapperV1_ABI,
				functionName: 'swappable' as const,
				args: [t.address],
			},
			{
				address: t.address,
				abi: erc20Abi,
				functionName: 'allowance' as const,
				args: [dao, FOREIGN_SWAPPER] as const, // what the DAO has approved the swapper to pull
			},
			{ address: t.address, abi: erc20Abi, functionName: 'balanceOf' as const, args: [dao] as const },
		]),
		query: { refetchInterval: APP_REFETCH },
	});

	const isRole = (i: 0 | 1) => {
		const holder = roles?.[i]?.result as string | undefined;
		return !!address && !!holder && holder.toLowerCase() === address.toLowerCase();
	};
	const canDisable = isRole(0) || isRole(1);

	const [tab, setTab] = useQueryTab(TABS);

	const rows = useMemo(
		() =>
			FOREIGN_TOKENS.map((token, i) => {
				const route = data?.[i * 4]?.result as
					| { enabled: boolean; tokenOut: `0x${string}`; minRate: bigint; maxAmount: bigint; minAmount: bigint }
					| undefined;
				const swappable = (data?.[i * 4 + 1]?.result as bigint | undefined) ?? 0n;
				const out = route && Object.values(TOKENS).find((t) => t.address.toLowerCase() === route.tokenOut.toLowerCase());
				const approved = (data?.[i * 4 + 2]?.result as bigint | undefined) ?? 0n;
				const balance = (data?.[i * 4 + 3]?.result as bigint | undefined) ?? 0n;
				return { token, route, swappable, approved, balance, out };
			}),
		[data]
	);

	const { data: quotes } = useQuery({
		queryKey: ['dao-foreign-prices'],
		queryFn: async () =>
			(await (await fetch(`/api/zap/prices?tokens=${FOREIGN_TOKENS.map((t) => t.address).join(',')}`)).json()).prices as Record<
				string,
				number
			>,
		staleTime: 60_000,
	});

	// dEURO trades 1:1 with EURC through its Stable Bridge, and a svDEURO share is worth `convertToAssets` dEURO
	const { data: svShare } = useReadContract({
		address: SV_DEURO_ADDRESS,
		abi: ERC4626_ABI,
		functionName: 'convertToAssets',
		args: [10n ** 18n],
		query: { refetchInterval: APP_REFETCH },
	});
	const prices = useMemo(() => {
		const out = { ...quotes };
		const addr = (symbol: string) => FOREIGN_TOKENS.find((t) => t.symbol === symbol)!.address.toLowerCase();
		const eurc = out[addr('EURC')];
		if (eurc !== undefined) {
			out[addr('dEURO')] = eurc;
			if (svShare !== undefined) out[addr('svDEURO')] = Number(formatUnits(svShare, 18)) * eurc;
		}
		return out;
	}, [quotes, svShare]);

	const fmt = (v: bigint, decimals: number, symbol: string) =>
		v === 0n ? '—' : formatCompactNumber(formatUnits(v, decimals), 1, '', ` ${symbol}`);

	const run = (functionName: 'swap' | 'disableRoute', symbol: string, token: string) =>
		submit(
			[
				{
					address: FOREIGN_SWAPPER,
					abi: ForeignSwapperV1_ABI,
					functionName,
					args: [token as `0x${string}`],
					label: `${functionName === 'swap' ? 'Swap' : 'Disable route'} ${symbol}`,
				},
			],
			{ title: `${functionName === 'swap' ? 'Swap' : 'Disable route'} ${symbol}` }
		).catch(() => undefined); // declined in the wallet

	// every token a swap can run for right now, sent as one batch of swaps
	const swappableRows = rows.filter((r) => r.route?.enabled && r.swappable > 0n);
	const batchSwap = () =>
		submit(
			swappableRows.map(({ token }) => ({
				address: FOREIGN_SWAPPER,
				abi: ForeignSwapperV1_ABI,
				functionName: 'swap' as const,
				args: [token.address] as const,
				label: `Swap ${token.symbol}`,
			})),
			{ title: `Swap ${swappableRows.map((r) => r.token.symbol).join(', ')}` }
		).catch(() => undefined); // declined in the wallet

	// --- set route (curator only) ---
	const { modules } = useSwapModules();
	const { pools } = useCurvePools();
	const [tokenSymbol, setTokenSymbol] = useState(FOREIGN_TOKENS[0]!.symbol);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [stepsOpen, setStepsOpen] = useState(false);
	const [edits, setEdits] = useState<Record<string, Partial<RouteDraft>>>({}); // per token, on top of the on-chain route
	const edit = edits[tokenSymbol] ?? {};

	// a click on a table row loads that token into the cards, starting from its live route and limits
	const selectToken = (symbol: string) => {
		setTokenSymbol(symbol);
		setEdits((e) => {
			const rest = { ...e };
			delete rest[symbol];
			return rest;
		});
		document.getElementById('set-route')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};
	const patch = (p: Partial<RouteDraft>) => setEdits((e) => ({ ...e, [tokenSymbol]: { ...e[tokenSymbol], ...p } }));

	const tokenIndex = FOREIGN_TOKENS.findIndex((t) => t.symbol === tokenSymbol);
	const routeToken = FOREIGN_TOKENS[tokenIndex]!;
	const onchain = data?.[tokenIndex * 4]?.result as OnchainRoute | undefined;

	// is the token an ERC-4626 vault? Then it can be unwrapped into its asset, worth `sharePrice` per share
	const { data: assetAddress } = useReadContract({
		address: routeToken.address,
		abi: ERC4626_ABI,
		functionName: 'asset',
		query: { retry: false },
	});
	const { data: assetMeta } = useReadContracts({
		contracts: [
			{ address: assetAddress, abi: erc20Abi, functionName: 'symbol' },
			{ address: assetAddress, abi: erc20Abi, functionName: 'decimals' },
		],
		query: { enabled: !!assetAddress },
	});
	const asset: PathToken | undefined =
		assetAddress && assetMeta?.[0].result && assetMeta[1].result !== undefined
			? { address: assetAddress, symbol: assetMeta[0].result as string, decimals: Number(assetMeta[1].result) }
			: undefined;
	const { data: sharePriceRaw } = useReadContract({
		address: routeToken.address,
		abi: ERC4626_ABI,
		functionName: 'convertToAssets',
		args: [10n ** BigInt(routeToken.decimals)],
		query: { enabled: !!asset, retry: false },
	});
	const sharePrice = sharePriceRaw !== undefined && asset ? Number(formatUnits(sharePriceRaw, asset.decimals)) : undefined;

	const ctx = { modules, pools, swapper: FOREIGN_SWAPPER, asset, sharePrice };

	// the route that is live now, as picked steps, so the form starts from it
	const loaded = useMemo(() => {
		if (!onchain?.enabled || modules.length === 0) return undefined;
		const picked: StepChoice[] = [];
		for (const step of onchain.steps) {
			if (step.target.toLowerCase() === routeToken.address.toLowerCase()) {
				picked.push('unwrap');
				continue;
			}
			const pool = pools.find((x) => x.poolAddress.toLowerCase() === step.target.toLowerCase());
			if (pool) {
				const i = pool.tokens.findIndex((t) => t.address.toLowerCase() === step.tokenIn.toLowerCase());
				if (i < 0) return undefined;
				picked.push(`fx:${pool.key}:${i === 0 ? '01' : '10'}`);
				continue;
			}
			try {
				const call = decodeFunctionData({ abi: ISwapRouterV1_ABI, data: step.data });
				const moduleAddress = (call.args?.[0] as string | undefined)?.toLowerCase();
				const m = modules.find((x) => x.moduleAddress.toLowerCase() === moduleAddress);
				if (!m || (call.functionName !== 'swapIn' && call.functionName !== 'swapOut')) return undefined;
				picked.push(`${call.functionName === 'swapIn' ? 'in' : 'out'}:${m.key}`);
			} catch {
				return undefined; // a step this form cannot show
			}
		}
		return picked;
	}, [onchain, modules, pools, routeToken.address]);

	const now = Math.floor(Date.now() / 1000);
	// no live route yet: start with the first step that fits, the unwrap for a vault token, else a Stable Bridge
	const firstStep = nextChoices(routeToken, resolvePath(routeToken, [], ctx), ctx, now)[0]?.value;
	const defaultChoices: StepChoice[] = data && !onchain?.enabled && firstStep ? [firstStep] : [];

	const choices = edit.choices ?? loaded ?? defaultChoices;
	const path = resolvePath(routeToken, choices, ctx);
	const options = nextChoices(routeToken, path, ctx, now);

	// raw units of the contract's rate <-> the whole-token rate the form shows (1e18 digits)
	const shift = path.end.decimals - routeToken.decimals;
	const toContractRate = (rate: bigint) => (shift >= 0 ? rate * 10n ** BigInt(shift) : rate / 10n ** BigInt(-shift));
	const fromContractRate = (rate: bigint) => (shift >= 0 ? rate / 10n ** BigInt(shift) : rate * 10n ** BigInt(-shift));

	// suggested floor: par after the module fees and the vault share price, minus 0.5% of slack
	const suggestedRate = path.steps.length ? BigInt(Math.floor(path.suggestedRate * 0.995 * 1e6)) * 10n ** 12n : 0n;
	const rate =
		edit.rate ??
		(edit.choices === undefined && loaded && onchain ? fromContractRate(onchain.minRate).toString() : suggestedRate.toString());
	// a token without a live route starts from 10 min and 1000 max, a live route keeps its own (empty for none / no cap)
	const defaultAmount = (whole: string) => parseUnits(whole, routeToken.decimals).toString();
	const live = onchain?.enabled ? onchain : undefined;
	const minAmount = edit.minAmount ?? (live ? (live.minAmount > 0n ? live.minAmount.toString() : '') : defaultAmount('10'));
	const maxAmount = edit.maxAmount ?? (live ? (live.maxAmount > 0n ? live.maxAmount.toString() : '') : defaultAmount('1000'));

	const maxBelowMin = !!maxAmount && !!minAmount && BigInt(maxAmount) < BigInt(minAmount);
	const canSet = path.steps.length > 0 && !path.error && BigInt(rate || '0') > 0n && !maxBelowMin;

	// --- DAO proposal: steps collected here are batched into one proposal in the Aragon app ---
	const [proposal, setProposal] = useState<{ label: string; to: `0x${string}`; data: `0x${string}` }[]>([]);
	const [copied, setCopied] = useState(false);
	const proposalJson = JSON.stringify(
		proposal.map(({ to, data }) => ({ to, value: '0', data })),
		null,
		2
	);

	// the DAO holds the tokens, so its own approval is needed, whatever the connected wallet has approved
	// capped to the route's max amount, a route without a cap needs an unlimited approval
	const approveAmount = maxAmount ? BigInt(maxAmount) : maxUint256;

	const addToProposal = () => {
		if (!canSet) return;
		setProposal((p) => [
			...p,
			{
				label: `Approve ${routeToken.symbol} for the swapper (${maxAmount ? formatUnits(approveAmount, routeToken.decimals) : 'unlimited'})`,
				to: routeToken.address,
				data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [FOREIGN_SWAPPER, approveAmount] }),
			},
			{
				label: `Set route ${routeToken.symbol} → ${path.end.symbol}`,
				to: FOREIGN_SWAPPER,
				data: encodeFunctionData({
					abi: ForeignSwapperV1_ABI,
					functionName: 'setRoute',
					args: [
						routeToken.address,
						{
							enabled: true,
							tokenOut: path.end.address,
							minRate: toContractRate(BigInt(rate)),
							maxAmount: BigInt(maxAmount || '0'),
							minAmount: BigInt(minAmount || '0'),
							steps: path.steps,
						},
					],
				}),
			},
		]);
	};

	const copyProposal = () => {
		navigator.clipboard
			.writeText(proposalJson)
			.then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			})
			.catch(() => undefined);
	};

	const downloadProposal = () => {
		const url = URL.createObjectURL(new Blob([proposalJson], { type: 'application/json' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = 'dao-proposal.json';
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-8">
			<PageHeader
				title="DAO"
				description="Foreign tokens held by the DAO are converted into ecosystem tokens along routes the curator configured. Anyone can trigger a conversion; the proceeds always go back to the DAO."
			/>

			<HeroSteps steps={STEPS} />

			<TabsBar>
				<PillTabs value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t, label: t }))} />
			</TabsBar>

			{tab === 'Foreign Swapper' && (
				<>
					<Card variant="panel" className="space-y-8">
						<PageHeader
							title="Foreign Swapper"
							description="A swap pulls the DAO's balance, bounded by its allowance and the route cap, and enforces the route's minimum rate. Only the curator can set a route; the guardian or curator can disable one."
						/>
						<Table>
							<TableHead headers={HEADERS} colSpan={COL_SPAN} actionCol />
							<TableBody>
								{isLoading ? (
									<TableRowEmpty>Loading routes...</TableRowEmpty>
								) : error ? (
									<TableRowEmpty>{`Error: ${error.message}`}</TableRowEmpty>
								) : (
									rows.map(({ token, route, swappable, approved, balance, out }) => {
										const enabled = !!route?.enabled;
										return (
											<TableRow
												key={token.symbol}
												headers={HEADERS}
												colSpan={COL_SPAN}
												onClick={() => selectToken(token.symbol)}
												actionCol={
													<div
														className="flex items-center justify-end gap-1"
														onClick={(e) => e.stopPropagation()}
													>
														<button
															type="button"
															title={`Swap ${token.symbol}`}
															aria-label={`Swap ${token.symbol}`}
															disabled={!address || !enabled || swappable === 0n || isSigning}
															onClick={() => run('swap', token.symbol, token.address)}
															className={ICON_BTN}
														>
															<FontAwesomeIcon icon={faArrowRightArrowLeft} className="w-4 h-4" />
														</button>
														{canDisable && enabled && (
															<button
																type="button"
																title={`Disable route ${token.symbol}`}
																aria-label={`Disable route ${token.symbol}`}
																disabled={isSigning}
																onClick={() => run('disableRoute', token.symbol, token.address)}
																className={ICON_BTN}
															>
																<FontAwesomeIcon icon={faBan} className="w-4 h-4" />
															</button>
														)}
													</div>
												}
											>
												<div className="flex items-center gap-3">
													<TokenLogo currency={token.symbol} size={8} />
													<div className="flex flex-col">
														<span>{token.symbol}</span>
														<span className="text-sm text-text-secondary">
															{formatCompactNumber(
																formatUnits(balance, token.decimals),
																2,
																'',
																` ${token.symbol}`
															)}
															{prices?.[token.address.toLowerCase()] !== undefined &&
																` • ${formatCompactNumber(Number(formatUnits(balance, token.decimals)) * prices[token.address.toLowerCase()]!)}`}
														</span>
													</div>
												</div>
												<span>
													{approved > maxUint256 / 2n ? 'Unlimited' : fmt(approved, token.decimals, token.symbol)}
												</span>
												<span className="flex items-center justify-end gap-2">
													{enabled && (
														<FontAwesomeIcon
															icon={swappable > 0n ? faCircleCheck : faHourglassHalf}
															title={
																swappable > 0n
																	? `A swap can run now: ${fmt(swappable, token.decimals, token.symbol)}`
																	: 'Route is set, but nothing can be swapped yet: no balance, no approval or below the min amount'
															}
															className={`w-4 h-4 ${swappable > 0n ? 'text-green-600' : 'text-text-muted'}`}
														/>
													)}
													{enabled && route && route.minAmount > 0n
														? formatCompactNumber(
																formatUnits(route.minAmount, token.decimals),
																1,
																'',
																` ${token.symbol}`
															)
														: enabled
															? 'none'
															: '—'}
												</span>
												<span>
													{enabled && route && out
														? formatCompactNumber(
																formatUnits(route.minRate, 18 + out.decimals - token.decimals),
																4,
																''
															)
														: '—'}
												</span>
												<span className="flex items-center justify-end gap-2">
													{enabled && out ? (
														<>
															<TokenLogo currency={out.symbol} size={6} />
															{out.symbol}
														</>
													) : enabled ? (
														'Unknown token'
													) : (
														'—'
													)}
												</span>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
						<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
							<div>
								<div className="font-semibold text-text-primary">Execute actions</div>
								<div className="text-text-secondary">
									Runs every swap that is possible right now, one signature each or a single bundle where the wallet
									supports it.
								</div>
							</div>
							<button
								type="button"
								disabled={!address || swappableRows.length === 0 || isSigning}
								onClick={batchSwap}
								className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-usdu-orange text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
							>
								<FontAwesomeIcon icon={faArrowRightArrowLeft} className="w-4 h-4" />
								{swappableRows.length > 0 ? `Batch swap (${swappableRows.length})` : 'Batch swap'}
							</button>
						</div>
					</Card>

					{
						<div id="set-route" className="grid gap-8 md:grid-cols-2 scroll-mt-8">
							<Card variant="panel" className="flex flex-col gap-6">
								<PageHeader
									title="Set Route"
									description="Curator only. Starts from the live route of the token; the minimum rate is what a swap must deliver per whole token, otherwise it reverts."
								/>
								<TokenInput
									label="Minimum rate"
									symbol={routeToken.symbol}
									value={rate === '0' ? '' : rate}
									onChange={(v) => patch({ rate: v })}
									onTokenClick={() => setPickerOpen(true)}
									digit={18}
									placeholder="0.00"
									disabled={path.steps.length === 0}
									note={path.steps.length ? `${path.end.symbol} per ${routeToken.symbol}` : 'Add a step first'}
								/>
								<div className="grid gap-6 md:grid-cols-2">
									<TokenInput
										label="Min amount"
										symbol={routeToken.symbol}
										value={minAmount}
										onChange={(v) => patch({ minAmount: v })}
										digit={routeToken.decimals}
										placeholder="None"
									/>
									<TokenInput
										label="Max amount"
										symbol={routeToken.symbol}
										value={maxAmount}
										onChange={(v) => patch({ maxAmount: v })}
										digit={routeToken.decimals}
										placeholder="No cap"
										error={maxBelowMin ? 'Below the min amount' : undefined}
									/>
								</div>
							</Card>

							<Card variant="panel" className="flex flex-col gap-6">
								<PageHeader
									title="Steps"
									description="Unwrap a vault token, convert through any active Stable Bridge, or swap between the USDU stablecoins on Curve, whichever takes the token on hand. Removing a step removes the ones after it."
								/>
								<div className="space-y-2">
									{path.hops.length === 0 && <div className="text-text-secondary">No steps yet.</div>}
									{path.hops.map((hop, i) => (
										<div key={i} className="flex items-center justify-between gap-4 rounded-lg bg-usdu-bg px-4 py-2">
											<span>
												<span className="text-text-muted">{i + 1}.</span> {hop.label}
											</span>
											<button
												type="button"
												title="Remove this and the following steps"
												aria-label={`Remove step ${i + 1}`}
												onClick={() => patch({ choices: choices.slice(0, i), rate: undefined })}
												className={ICON_BTN}
											>
												<FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
											</button>
										</div>
									))}
									{path.error && <div className="text-error">{path.error}</div>}
								</div>
								<div className="mt-auto flex flex-col gap-4 md:flex-row">
									<button
										type="button"
										disabled={options.length === 0 || path.steps.length >= 8}
										onClick={() => setStepsOpen(true)}
										className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-usdu-orange text-usdu-orange hover:bg-usdu-orange hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
									>
										<FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
										Add step
									</button>
									<button
										type="button"
										disabled={!canSet}
										onClick={addToProposal}
										className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-usdu-orange text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
									>
										<FontAwesomeIcon icon={faRoute} className="w-4 h-4" />
										Add {routeToken.symbol} route
									</button>
								</div>
							</Card>
						</div>
					}

					<Card variant="panel" className="flex flex-col gap-6">
						<PageHeader
							title="DAO Proposal"
							description="Collect steps here and paste the JSON into the Aragon app. All steps are batched into one transaction of the proposal and executed by the DAO."
						/>
						<div className="space-y-2">
							{proposal.length === 0 && (
								<div className="text-text-secondary">No steps yet. Build a route above and add it.</div>
							)}
							{proposal.map((step, i) => (
								<div key={i} className="flex items-center justify-between gap-4 rounded-lg bg-usdu-bg px-4 py-2">
									<span>
										<span className="text-text-muted">{i + 1}.</span> {step.label}
									</span>
									<button
										type="button"
										title="Remove this step"
										aria-label={`Remove proposal step ${i + 1}`}
										onClick={() => setProposal((p) => p.filter((_, j) => j !== i))}
										className={ICON_BTN}
									>
										<FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
									</button>
								</div>
							))}
						</div>
						{proposal.length > 0 && (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-text-secondary">Payload</span>
									<div className="flex items-center gap-6">
										<button
											type="button"
											onClick={copyProposal}
											className="flex items-center gap-2 text-usdu-orange hover:underline"
										>
											<FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
											{copied ? 'Copied' : 'Copy JSON'}
										</button>
										<button
											type="button"
											onClick={downloadProposal}
											className="flex items-center gap-2 text-usdu-orange hover:underline"
										>
											<FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
											Download JSON
										</button>
										<button
											type="button"
											onClick={() => setProposal([])}
											className="text-text-secondary hover:text-text-primary transition-colors"
										>
											Clear
										</button>
									</div>
								</div>
								<textarea
									readOnly
									value={proposalJson}
									rows={Math.min(proposalJson.split('\n').length, 16)}
									className="w-full rounded-lg bg-usdu-bg p-4 font-mono text-xs break-all"
								/>
							</div>
						)}
					</Card>
				</>
			)}
			<Modal
				isOpen={stepsOpen}
				onClose={() => setStepsOpen(false)}
				title={path.steps.length === 0 ? 'Add the first step' : `Add a step, holding ${path.end.symbol}`}
				size="sm"
			>
				<div className="space-y-3 max-h-96 overflow-y-auto">
					{options.map((o) => {
						const [kind, ...rest] = o.label.split(' · ');
						return (
							<button
								key={o.value}
								type="button"
								onClick={() => {
									patch({ choices: [...choices, o.value as StepChoice], rate: undefined });
									setStepsOpen(false);
								}}
								className="w-full rounded-lg bg-usdu-bg px-4 py-3 text-left border-2 border-transparent hover:border-usdu-orange transition-colors"
							>
								<div className="font-semibold text-text-primary">{kind}</div>
								<div className="text-sm text-text-secondary">{rest.join(' · ')}</div>
							</button>
						);
					})}
				</div>
			</Modal>
			<TokenSelectModal
				isOpen={pickerOpen}
				onClose={() => setPickerOpen(false)}
				onSelect={(t) => {
					setTokenSymbol(t.symbol);
					setPickerOpen(false);
				}}
				tokens={FOREIGN_TOKENS.map((t) => ({ ...t, name: t.symbol }))}
				title="Select token"
			/>
		</div>
	);
}

export default function DaoPage() {
	return (
		<>
			<NextSeo title={SEO.dao.title} description={SEO.dao.description} openGraph={SEO.dao.openGraph} />
			<DaoPageContent />
		</>
	);
}
