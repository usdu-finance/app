import { useMemo, useState } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { decodeFunctionData, erc20Abi, formatUnits, parseUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { NextSeo } from 'next-seo';
import { ADDRESS, ISwapRouterV1_ABI, Stablecoin_ABI } from '@usdu-finance/usdu-core';
// TODO: import ForeignSwapperV1_ABI from '@usdu-finance/usdu-core' once it is published, then delete lib/abis/ForeignSwapperV1.ts
import { ForeignSwapperV1_ABI } from '@/lib/abis/ForeignSwapperV1';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightArrowLeft, faBan, faBolt, faCoins, faRoute, faXmark } from '@fortawesome/free-solid-svg-icons';
import Card from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ButtonInput, PillTabs, SelectInput, TabsBar, TokenInput, TokenSelectModal } from '@/components/ui/input';
import HeroSteps from '@/components/ui/HeroSteps';
import { useQueryTab } from '@/hooks/ui/useQueryTab';
import { useSwapModules } from '@/hooks/useSwapModules';
import { ERC4626_ABI, FOREIGN_TOKENS, nextChoices, resolvePath, type PathToken, type StepChoice } from '@/lib/swapper/routes';
import { useTx } from '@/hooks/useTx';
import { APP_REFETCH, FOREIGN_SWAPPER_ADDRESS, SEO } from '@/lib/constants';
import { TOKENS } from '@/lib/tokens/config';
import { formatCompactNumber } from '@/lib/utils';

const HEADERS = ['Token', 'Swappable', 'Receives', 'Min / Max Amount', 'Status'];
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

	const { data, error, isLoading } = useReadContracts({
		contracts: FOREIGN_TOKENS.flatMap((t) => [
			{
				address: FOREIGN_SWAPPER_ADDRESS!,
				abi: ForeignSwapperV1_ABI,
				functionName: 'getRoute' as const,
				args: [t.address],
			},
			{
				address: FOREIGN_SWAPPER_ADDRESS!,
				abi: ForeignSwapperV1_ABI,
				functionName: 'swappable' as const,
				args: [t.address],
			},
		]),
		query: { enabled: !!FOREIGN_SWAPPER_ADDRESS, refetchInterval: APP_REFETCH },
	});

	const isRole = (i: 0 | 1) => {
		const holder = roles?.[i]?.result as string | undefined;
		return !!address && !!holder && holder.toLowerCase() === address.toLowerCase();
	};
	const canDisable = isRole(0) || isRole(1);

	const [tab, setTab] = useQueryTab(TABS);

	// TODO: temporary preview, the route cards are shown to everyone. Use `isRole(0)` once the UI is checked
	const canSetRoute = true || isRole(0);

	const rows = useMemo(
		() =>
			FOREIGN_TOKENS.map((token, i) => {
				const route = data?.[i * 2]?.result as
					| { enabled: boolean; tokenOut: `0x${string}`; minRate: bigint; maxAmount: bigint; minAmount: bigint }
					| undefined;
				const swappable = (data?.[i * 2 + 1]?.result as bigint | undefined) ?? 0n;
				const out = route && Object.values(TOKENS).find((t) => t.address.toLowerCase() === route.tokenOut.toLowerCase());
				return { token, route, swappable, out };
			}),
		[data]
	);

	const fmt = (v: bigint, decimals: number, symbol: string) =>
		v === 0n ? '—' : formatCompactNumber(formatUnits(v, decimals), 1, '', ` ${symbol}`);

	const run = (functionName: 'swap' | 'disableRoute', symbol: string, token: string) =>
		submit(
			[
				{
					address: FOREIGN_SWAPPER_ADDRESS!,
					abi: ForeignSwapperV1_ABI,
					functionName,
					args: [token as `0x${string}`],
					label: `${functionName === 'swap' ? 'Swap' : 'Disable route'} ${symbol}`,
				},
			],
			{ title: `${functionName === 'swap' ? 'Swap' : 'Disable route'} ${symbol}` }
		).catch(() => undefined); // declined in the wallet

	// --- set route (curator only) ---
	const { modules } = useSwapModules();
	const [tokenSymbol, setTokenSymbol] = useState(FOREIGN_TOKENS[0]!.symbol);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [edits, setEdits] = useState<Record<string, Partial<RouteDraft>>>({}); // per token, on top of the on-chain route
	const edit = edits[tokenSymbol] ?? {};
	const patch = (p: Partial<RouteDraft>) => setEdits((e) => ({ ...e, [tokenSymbol]: { ...e[tokenSymbol], ...p } }));

	const tokenIndex = FOREIGN_TOKENS.findIndex((t) => t.symbol === tokenSymbol);
	const routeToken = FOREIGN_TOKENS[tokenIndex]!;
	const onchain = data?.[tokenIndex * 2]?.result as OnchainRoute | undefined;

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

	const ctx = { modules, swapper: FOREIGN_SWAPPER_ADDRESS!, asset, sharePrice };

	// the route that is live now, as picked steps, so the form starts from it
	const loaded = useMemo(() => {
		if (!onchain?.enabled || modules.length === 0) return undefined;
		const picked: StepChoice[] = [];
		for (const step of onchain.steps) {
			if (step.target.toLowerCase() === routeToken.address.toLowerCase()) {
				picked.push('unwrap');
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
	}, [onchain, modules, routeToken.address]);

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

	const setRoute = () => {
		if (!canSet || !FOREIGN_SWAPPER_ADDRESS) return;
		return submit(
			[
				{
					address: FOREIGN_SWAPPER_ADDRESS,
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
					label: `Set route ${routeToken.symbol}`,
				},
			],
			{
				title: `Set route ${routeToken.symbol}`,
				onConfirmed: () =>
					setEdits((e) => {
						const rest = { ...e };
						delete rest[tokenSymbol]; // back to what is on-chain
						return rest;
					}),
			}
		).catch(() => undefined); // declined in the wallet
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
								{!FOREIGN_SWAPPER_ADDRESS ? (
									<TableRowEmpty>The foreign swapper is not deployed yet.</TableRowEmpty>
								) : isLoading ? (
									<TableRowEmpty>Loading routes...</TableRowEmpty>
								) : error ? (
									<TableRowEmpty>{`Error: ${error.message}`}</TableRowEmpty>
								) : (
									rows.map(({ token, route, swappable, out }) => {
										const enabled = !!route?.enabled;
										return (
											<TableRow
												key={token.symbol}
												headers={HEADERS}
												colSpan={COL_SPAN}
												actionCol={
													<div className="flex items-center justify-end gap-1">
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
												<div className="flex items-center gap-2">
													<TokenLogo currency={token.symbol} size={6} />
													<span>{token.symbol}</span>
												</div>
												<span>{fmt(swappable, token.decimals, token.symbol)}</span>
												<span>{enabled ? (out?.symbol ?? 'Unknown token') : '—'}</span>
												<span>
													{enabled && route
														? `${fmt(route.minAmount, token.decimals, '') === '—' ? 'none' : fmt(route.minAmount, token.decimals, token.symbol)} / ${route.maxAmount === 0n ? 'no cap' : fmt(route.maxAmount, token.decimals, token.symbol)}`
														: '—'}
												</span>
												<Badge text={enabled ? 'Active' : 'No route'} />
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</Card>

					{canSetRoute && !!FOREIGN_SWAPPER_ADDRESS && (
						<div className="grid gap-8 md:grid-cols-2">
							<Card variant="panel" className="space-y-6">
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
								<TokenInput
									label="Min amount per swap"
									symbol={routeToken.symbol}
									value={minAmount}
									onChange={(v) => patch({ minAmount: v })}
									digit={routeToken.decimals}
									placeholder="None"
								/>
								<TokenInput
									label="Max amount per swap"
									symbol={routeToken.symbol}
									value={maxAmount}
									onChange={(v) => patch({ maxAmount: v })}
									digit={routeToken.decimals}
									placeholder="No cap"
									error={maxBelowMin ? 'Below the min amount' : undefined}
								/>
							</Card>

							<Card variant="panel" className="space-y-6">
								<PageHeader
									title="Steps"
									description="Unwrap a vault token, or convert through any active Stable Bridge that takes the token on hand. Removing a step removes the ones after it."
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
								{path.steps.length < 8 && (
									<SelectInput
										label={path.steps.length === 0 ? 'Add the first step' : `Add a step, holding ${path.end.symbol}`}
										options={options}
										value=""
										placeholder={options.length ? 'Select a step…' : `No step available for ${path.end.symbol}`}
										disabled={options.length === 0}
										onChange={(v) => patch({ choices: [...choices, v as StepChoice], rate: undefined })}
									/>
								)}
								<ButtonInput label="Set route" disabled={!canSet || isSigning} onClick={setRoute} />
							</Card>
						</div>
					)}
				</>
			)}
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
