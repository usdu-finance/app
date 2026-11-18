import { useMemo, useState } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { encodeFunctionData, erc20Abi, formatUnits, maxUint256, parseAbi } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faCircleCheck, faCoins, faHourglassHalf, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import Card from '@/components/ui/Card';
import { PillTabs, TokenInput, TokenSelectModal } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ApyChart } from '@/components/ui/charts';
import { useTx } from '@/hooks/useTx';
import { APP_REFETCH } from '@/lib/constants';
import { formatCompactNumber } from '@/lib/utils';
// TODO: import from '@usdu-finance/usdu-core' once the package with StreamerDepositorV1 is published, see lib/streamer/depositor.ts
import { STREAMER_DEPOSITOR, STREAMER_DEPOSITOR_DEPLOYED, STREAMER_FLOWS, StreamerDepositorV1_ABI } from '@/lib/streamer/depositor';
import type { ProposalStep } from './ProposalCard';

const HEADERS = ['Token', 'Approved', 'Per period', 'Cap', 'Next deposit'];
const COL_SPAN = HEADERS.length;

const ICON_BTN =
	'flex items-center justify-center w-9 h-9 rounded-lg border border-usdu-orange text-usdu-orange hover:bg-usdu-orange hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none';

const DAY = 24 * 3600;
const PERIODS = { Weekly: 7 * DAY, Monthly: 30 * DAY } as const;
type Period = keyof typeof PERIODS;
const PERIOD_OPTIONS = Object.keys(PERIODS) as Period[];

const DECIMALS = 18; // USDU, EURU and CHFU
const DEFAULT_CAP = (10n * 10n ** BigInt(DECIMALS)).toString(); // 10 tokens, until a flow is set

const MAX_BPS = 10_000n;
const TARGET_APYS = [5, 10]; // % per year
const RATE_VIEWS = ['Flow rate', 'Capped flow rate'] as const; // the share of the balance, or the cap
type RateView = (typeof RATE_VIEWS)[number];
const TOTAL_ASSETS_ABI = parseAbi(['function totalAssets() view returns (uint256)']);

/** A number of periods as text, with years added once it gets long. */
const duration = (periods: number, period: Period) => {
	const unit = period === 'Weekly' ? 'week' : 'month';
	const n = Math.max(1, Math.ceil(periods));
	const years = (n * PERIODS[period]) / (365 * DAY);
	return `${n.toLocaleString('en-US')} ${unit}${n === 1 ? '' : 's'}${years >= 2 ? ` (~${years.toFixed(1)} years)` : ''}`;
};

const periodLabel = (seconds: number) =>
	seconds === PERIODS.Weekly ? 'weekly' : seconds === PERIODS.Monthly ? 'monthly' : `every ${Math.round(seconds / DAY)} days`;

const fmt = (v: bigint, symbol: string) => (v === 0n ? '—' : formatCompactNumber(formatUnits(v, DECIMALS), 1, '', ` ${symbol}`));

interface OnchainFlow {
	enabled: boolean;
	vault: `0x${string}`;
	bps: number;
	cooldown: bigint;
	flowCap: bigint;
	lastDeposit: bigint;
	totalDeposited: bigint;
}

/**
 * Streamer Depositor: the DAO approves the contract for the native stablecoins and sets, per stablecoin, how much of its
 * balance flows into the reward vault each period. The setup is collected as a DAO proposal payload, anyone can trigger
 * the deposits.
 */
export default function StreamerDepositorTab({
	dao,
	canDisable,
	addToProposal,
}: {
	dao: `0x${string}`;
	canDisable: boolean;
	addToProposal: (steps: ProposalStep[]) => void;
}) {
	const { address } = useAccount();
	const { submit, isSigning } = useTx();

	// the DAO's balances and approvals do not depend on the depositor being deployed
	const { data: tokenData } = useReadContracts({
		contracts: STREAMER_FLOWS.flatMap((f) => [
			{ address: f.token, abi: erc20Abi, functionName: 'allowance' as const, args: [dao, STREAMER_DEPOSITOR] as const },
			{ address: f.token, abi: erc20Abi, functionName: 'balanceOf' as const, args: [dao] as const },
			{ address: f.vault, abi: TOTAL_ASSETS_ABI, functionName: 'totalAssets' as const }, // the vault's TVL
		]),
		query: { refetchInterval: APP_REFETCH },
	});

	const { data, error, isLoading } = useReadContracts({
		contracts: STREAMER_FLOWS.flatMap((f) => [
			{ address: STREAMER_DEPOSITOR, abi: StreamerDepositorV1_ABI, functionName: 'getFlow' as const, args: [f.token] as const },
			{ address: STREAMER_DEPOSITOR, abi: StreamerDepositorV1_ABI, functionName: 'depositable' as const, args: [f.token] as const },
			{ address: STREAMER_DEPOSITOR, abi: StreamerDepositorV1_ABI, functionName: 'nextDepositAt' as const, args: [f.token] as const },
		]),
		query: { enabled: STREAMER_DEPOSITOR_DEPLOYED, refetchInterval: APP_REFETCH },
	});

	const rows = useMemo(
		() =>
			STREAMER_FLOWS.map((flow, i) => ({
				flow,
				onchain: data?.[i * 3]?.result as OnchainFlow | undefined,
				depositable: (data?.[i * 3 + 1]?.result as bigint | undefined) ?? 0n,
				nextAt: (data?.[i * 3 + 2]?.result as bigint | undefined) ?? 0n,
				approved: (tokenData?.[i * 3]?.result as bigint | undefined) ?? 0n,
				balance: (tokenData?.[i * 3 + 1]?.result as bigint | undefined) ?? 0n,
				tvl: (tokenData?.[i * 3 + 2]?.result as bigint | undefined) ?? 0n,
			})),
		[data, tokenData]
	);

	// --- set flow form, starting from the live flow of the selected stablecoin ---
	const [symbol, setSymbol] = useState<(typeof STREAMER_FLOWS)[number]['symbol']>(STREAMER_FLOWS[0]!.symbol);
	const [edits, setEdits] = useState<Record<string, { bps?: string; period?: Period; cap?: string }>>({});
	const row = rows.find((r) => r.flow.symbol === symbol)!;
	const edit = edits[symbol] ?? {};
	const patch = (p: typeof edit) => setEdits((e) => ({ ...e, [symbol]: { ...e[symbol], ...p } }));

	// a click on a table row loads that stablecoin into the form, starting from its live flow
	const selectFlow = (next: typeof symbol) => {
		setSymbol(next);
		setEdits((e) => {
			const rest = { ...e };
			delete rest[next];
			return rest;
		});
	};

	const live = row.onchain?.enabled ? row.onchain : undefined;
	// basis points as digits of a 2-decimal input: 100 is 1.00%
	const bpsDigits = edit.bps ?? (live ? String(live.bps) : '100');
	const percent = String(Number(bpsDigits || '0') / 100);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [periodOpen, setPeriodOpen] = useState(false);
	const [rateView, setRateView] = useState<RateView>('Flow rate');
	const period: Period = edit.period ?? (live && Number(live.cooldown) === PERIODS.Monthly ? 'Monthly' : 'Weekly');
	const cap = edit.cap ?? (live ? live.flowCap.toString() : DEFAULT_CAP);

	const bpsValue = BigInt(bpsDigits || '0');
	const bps = bpsValue >= 1n && bpsValue <= MAX_BPS ? Number(bpsValue) : undefined;
	const capValue = BigInt(cap || '0');
	const canSet = bps !== undefined && capValue > 0n;

	// what one period would move at today's balance: the percentage of it
	const share = bps !== undefined ? (row.balance * BigInt(bps)) / 10_000n : 0n;

	// APY the flow pays to the vault: what a year of deposits at today's balance is worth against the vault's TVL.
	// The balance shrinks by the share each period unless it is topped up, so this is an upper estimate; with the cap
	// binding the flow is flat and the number is exact.
	// how long the DAO's balance lasts if it is burned at this pace alone: a cap burns it linearly, a share leaves a
	// shrinking rest each period, so it is never fully used up and the note gives the half-life instead
	const balanceNum = Number(formatUnits(row.balance, DECIMALS));
	const capNum = Number(formatUnits(capValue, DECIMALS));
	const decay = (left: number) => Math.log(left) / Math.log(1 - (bps ?? 0) / 10_000);
	const shareNote =
		row.balance === 0n || bps === undefined
			? undefined
			: bps === 10_000
				? 'The whole balance is burned in the first period'
				: `Balance halved after ~${duration(decay(0.5), period)}`;
	// the DAO balance at which the share equals the cap: above it the cap limits the flow, below it the share does
	const capBalance = bps !== undefined && capValue > 0n ? (capValue * 10_000n) / BigInt(bps) : 0n;
	const unit = period === 'Weekly' ? 'week' : 'month';

	const capNote =
		row.balance === 0n || capValue === 0n ? undefined : `Balance burned completely after ~${duration(balanceNum / capNum, period)}`;

	// what the preview shows, per year: the flow rate is the share of the balance, the capped flow rate is the cap itself
	const perYear = (amount: bigint) => (amount * BigInt(365 * DAY)) / BigInt(PERIODS[period]);
	const shownYearly = perYear(rateView === 'Capped flow rate' ? capValue : share);
	const tvl = row.tvl;

	// the payload would target the zero address, so say so in every step until the depositor is deployed
	const NOT_DEPLOYED = STREAMER_DEPOSITOR_DEPLOYED ? '' : '[depositor not deployed, do not execute] ';

	const add = () => {
		if (!canSet || bps === undefined) return;
		const { token, vault } = row.flow;
		const steps: ProposalStep[] = [];
		// the allowance is the DAO's own hard ceiling: one year of the cap, the cap times the periods in a year (rounded up)
		// skipped while the current approval already covers it
		const periodSeconds = BigInt(PERIODS[period]);
		const approveAmount = (capValue * BigInt(365 * DAY) + periodSeconds - 1n) / periodSeconds;
		if (row.approved < approveAmount) {
			steps.push({
				label: `${NOT_DEPLOYED}Approve ${symbol} for the depositor (one year of the cap: ${formatCompactNumber(formatUnits(approveAmount, DECIMALS), 2, '', ` ${symbol}`)})`,
				to: token,
				data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [STREAMER_DEPOSITOR, approveAmount] }),
			});
		}
		steps.push({
			label: `${NOT_DEPLOYED}Set flow ${symbol}: ${percent}% ${periodLabel(PERIODS[period])}, cap ${formatCompactNumber(formatUnits(capValue, DECIMALS), 2, '', ` ${symbol}`)}`,
			to: STREAMER_DEPOSITOR,
			data: encodeFunctionData({
				abi: StreamerDepositorV1_ABI,
				functionName: 'setFlow',
				args: [token, vault, bps, BigInt(PERIODS[period]), capValue],
			}),
		});
		addToProposal(steps);
	};

	const run = (functionName: 'deposit' | 'disableFlow', flowSymbol: string, token: `0x${string}`) =>
		submit(
			[
				{
					address: STREAMER_DEPOSITOR,
					abi: StreamerDepositorV1_ABI,
					functionName,
					args: [token],
					label: `${functionName === 'deposit' ? 'Deposit' : 'Disable flow'} ${flowSymbol}`,
				},
			],
			{ title: `${functionName === 'deposit' ? 'Deposit' : 'Disable flow'} ${flowSymbol}` }
		).catch(() => undefined); // declined in the wallet

	const now = Math.floor(Date.now() / 1000);
	const nextLabel = (r: (typeof rows)[number]) => {
		if (!r.onchain?.enabled) return '—';
		if (r.depositable > 0n) return 'Now';
		if (Number(r.nextAt) > now) return new Date(Number(r.nextAt) * 1000).toLocaleDateString();
		return 'Waiting for stakers or approval';
	};

	return (
		<>
			<Card variant="panel" className="space-y-8">
				<PageHeader
					title="Streamer Depositor"
					description="Once per period, anyone can move a share of the DAO's stablecoin balance, bounded by the flow cap and the DAO's approval, straight into the reward vault, where it streams to the stakers. Only the DAO sets a flow; the guardian or the DAO can disable one."
				/>
				{!STREAMER_DEPOSITOR_DEPLOYED && (
					<div className="rounded-lg bg-usdu-bg px-4 py-3 text-text-secondary">
						The depositor is not deployed yet. You can try out a setup below, but the payload targets the zero address until it
						is deployed, so do not execute it yet.
					</div>
				)}
				<Table>
					<TableHead headers={HEADERS} colSpan={COL_SPAN} actionCol />
					<TableBody>
						{STREAMER_DEPOSITOR_DEPLOYED && isLoading ? (
							<TableRowEmpty>Loading flows...</TableRowEmpty>
						) : error ? (
							<TableRowEmpty>{`Error: ${error.message}`}</TableRowEmpty>
						) : (
							rows.map((r) => {
								const enabled = !!r.onchain?.enabled;
								return (
									<TableRow
										key={r.flow.symbol}
										headers={HEADERS}
										colSpan={COL_SPAN}
										onClick={() => selectFlow(r.flow.symbol)}
										actionCol={
											<div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
												<button
													type="button"
													title={`Deposit ${r.flow.symbol}`}
													aria-label={`Deposit ${r.flow.symbol}`}
													disabled={!address || !enabled || r.depositable === 0n || isSigning}
													onClick={() => run('deposit', r.flow.symbol, r.flow.token)}
													className={ICON_BTN}
												>
													<FontAwesomeIcon icon={faCoins} className="w-4 h-4" />
												</button>
												{canDisable && enabled && (
													<button
														type="button"
														title={`Disable flow ${r.flow.symbol}`}
														aria-label={`Disable flow ${r.flow.symbol}`}
														disabled={isSigning}
														onClick={() => run('disableFlow', r.flow.symbol, r.flow.token)}
														className={ICON_BTN}
													>
														<FontAwesomeIcon icon={faBan} className="w-4 h-4" />
													</button>
												)}
											</div>
										}
									>
										<div className="flex items-center gap-3">
											<TokenLogo currency={r.flow.symbol} size={8} />
											<div className="flex flex-col">
												<span>{r.flow.symbol}</span>
												<span className="text-sm text-text-secondary">
													{formatCompactNumber(formatUnits(r.balance, DECIMALS), 2, '', ` ${r.flow.symbol}`)}
												</span>
											</div>
										</div>
										<span>{r.approved > maxUint256 / 2n ? 'Unlimited' : fmt(r.approved, r.flow.symbol)}</span>
										<span>
											{enabled && r.onchain
												? `${r.onchain.bps / 100}% ${periodLabel(Number(r.onchain.cooldown))}`
												: '—'}
										</span>
										<span>{enabled && r.onchain ? fmt(r.onchain.flowCap, r.flow.symbol) : '—'}</span>
										<span className="flex items-center justify-end gap-2">
											{enabled && (
												<FontAwesomeIcon
													icon={r.depositable > 0n ? faCircleCheck : faHourglassHalf}
													title={
														r.depositable > 0n
															? `A deposit can run now: ${fmt(r.depositable, r.flow.symbol)}`
															: 'Nothing can be deposited yet: cooling down, no stakers, no balance or no approval'
													}
													className={`w-4 h-4 ${r.depositable > 0n ? 'text-green-600' : 'text-text-muted'}`}
												/>
											)}
											{nextLabel(r)}
										</span>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</Card>

			<div className="grid gap-8 md:grid-cols-2">
				<Card variant="panel" className="flex flex-col gap-6">
					<PageHeader
						title="Set Flow"
						description="DAO only. Starts from the live flow of the stablecoin. Each period moves the percentage of the DAO's balance, or the cap if that is lower."
					/>
					<TokenInput
						label="Share of the DAO's balance per period"
						symbol={symbol}
						value={bpsDigits}
						onChange={(v) => patch({ bps: v })}
						onTokenClick={() => setPickerOpen(true)}
						digit={2}
						placeholder="1.00"
						note={shareNote}
						limitLabel="Flow"
						limit={share}
						limitDigit={DECIMALS}
						error={bps === undefined ? 'A percentage from 0.01 to 100' : undefined}
					/>
					<TokenInput
						label="Flow cap per period"
						symbol={symbol}
						value={cap}
						onChange={(v) => patch({ cap: v })}
						onTokenClick={() => setPeriodOpen(true)}
						tokenLabel={period}
						note={capNote}
						limitLabel="DAO balance"
						limit={row.balance}
						limitDigit={DECIMALS}
						digit={DECIMALS}
						placeholder="0.00"
					/>
					{capBalance > 0n && (
						<div className="space-y-1">
							<div className="text-text-secondary">Balance at which the cap takes over</div>
							<div className="text-text-primary">
								{fmt(capValue, symbol)} / {percent}% = <span className="font-semibold">{fmt(capBalance, symbol)}</span>
							</div>
							{row.balance >= capBalance && (
								<div className="text-sm text-text-secondary">
									{`The DAO holds more than that, so the cap limits the flow to ${fmt(capValue, symbol)} per ${unit}.`}
								</div>
							)}
						</div>
					)}
				</Card>

				<Card variant="panel" className="flex flex-col gap-6">
					<PageHeader
						title="Preview"
						description="What a period would move at the DAO's current balance, with the setup on the left."
					/>
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<PillTabs value={rateView} onChange={setRateView} options={RATE_VIEWS.map((v) => ({ value: v, label: v }))} />
						<span>{fmt(shownYearly, symbol)} / year</span>
					</div>
					<ApyChart
						yearly={Number(formatUnits(shownYearly, DECIMALS))}
						tvl={Number(formatUnits(tvl, DECIMALS))}
						targets={TARGET_APYS}
						formatTvl={(v) => formatCompactNumber(v, 1, '').replace(/\.0(?=[kMBT]?$)/, '')}
						unit={symbol}
					/>
					<div className="text-sm text-text-secondary">
						APY = a year of deposits at today&apos;s balance ÷ the vault&apos;s TVL. The balance shrinks by the share each
						period unless it is topped up, so the real figure ends up lower, unless the cap holds the flow flat.
					</div>
					<button
						type="button"
						disabled={!canSet}
						onClick={add}
						className="mt-auto flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-usdu-orange text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
					>
						<FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
						Add {symbol} flow
					</button>
				</Card>
			</div>
			<Modal isOpen={periodOpen} onClose={() => setPeriodOpen(false)} title="Period" size="sm">
				<div className="space-y-3">
					{PERIOD_OPTIONS.map((p) => (
						<button
							key={p}
							type="button"
							onClick={() => {
								patch({ period: p });
								setPeriodOpen(false);
							}}
							className={`w-full rounded-lg bg-usdu-bg px-4 py-3 text-left border-2 transition-colors hover:border-usdu-orange ${p === period ? 'border-usdu-orange' : 'border-transparent'}`}
						>
							<div className="font-semibold text-text-primary">{p}</div>
							<div className="text-sm text-text-secondary">
								{p === 'Weekly' ? 'One deposit every 7 days at most' : 'One deposit every 30 days at most'}
							</div>
						</button>
					))}
				</div>
			</Modal>
			<TokenSelectModal
				isOpen={pickerOpen}
				onClose={() => setPickerOpen(false)}
				onSelect={(t) => {
					setSymbol(t.symbol as typeof symbol);
					setPickerOpen(false);
				}}
				tokens={STREAMER_FLOWS.map((f) => ({ symbol: f.symbol, address: f.token, decimals: DECIMALS, name: f.symbol }))}
				title="Select stablecoin"
			/>
		</>
	);
}
