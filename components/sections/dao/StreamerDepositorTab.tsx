import { useMemo, useState } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { encodeFunctionData, erc20Abi, formatUnits, maxUint256 } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faCircleCheck, faCoins, faHourglassHalf, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import Card from '@/components/ui/Card';
import { PillTabs, TextInput, TokenInput } from '@/components/ui/input';
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
const PERIOD_OPTIONS = (Object.keys(PERIODS) as Period[]).map((p) => ({ value: p, label: p }));

const DECIMALS = 18; // USDU, EURU and CHFU

/** "1.5" -> 150 basis points, undefined while it is not a percentage with at most two decimals. */
const parseBps = (percent: string): number | undefined => {
	if (!/^\d+(\.\d{1,2})?$/.test(percent)) return undefined;
	const bps = Math.round(parseFloat(percent) * 100);
	return bps >= 1 && bps <= 10_000 ? bps : undefined;
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

	const { data, error, isLoading } = useReadContracts({
		contracts: STREAMER_FLOWS.flatMap((f) => [
			{ address: STREAMER_DEPOSITOR, abi: StreamerDepositorV1_ABI, functionName: 'getFlow' as const, args: [f.token] as const },
			{ address: STREAMER_DEPOSITOR, abi: StreamerDepositorV1_ABI, functionName: 'depositable' as const, args: [f.token] as const },
			{ address: STREAMER_DEPOSITOR, abi: StreamerDepositorV1_ABI, functionName: 'nextDepositAt' as const, args: [f.token] as const },
			{ address: f.token, abi: erc20Abi, functionName: 'allowance' as const, args: [dao, STREAMER_DEPOSITOR] as const },
			{ address: f.token, abi: erc20Abi, functionName: 'balanceOf' as const, args: [dao] as const },
		]),
		query: { enabled: STREAMER_DEPOSITOR_DEPLOYED, refetchInterval: APP_REFETCH },
	});

	const rows = useMemo(
		() =>
			STREAMER_FLOWS.map((flow, i) => ({
				flow,
				onchain: data?.[i * 5]?.result as OnchainFlow | undefined,
				depositable: (data?.[i * 5 + 1]?.result as bigint | undefined) ?? 0n,
				nextAt: (data?.[i * 5 + 2]?.result as bigint | undefined) ?? 0n,
				approved: (data?.[i * 5 + 3]?.result as bigint | undefined) ?? 0n,
				balance: (data?.[i * 5 + 4]?.result as bigint | undefined) ?? 0n,
			})),
		[data]
	);

	// --- set flow form, starting from the live flow of the selected stablecoin ---
	const [symbol, setSymbol] = useState<(typeof STREAMER_FLOWS)[number]['symbol']>(STREAMER_FLOWS[0]!.symbol);
	const [edits, setEdits] = useState<Record<string, { percent?: string; period?: Period; cap?: string }>>({});
	const row = rows.find((r) => r.flow.symbol === symbol)!;
	const edit = edits[symbol] ?? {};
	const patch = (p: typeof edit) => setEdits((e) => ({ ...e, [symbol]: { ...e[symbol], ...p } }));

	const live = row.onchain?.enabled ? row.onchain : undefined;
	const percent = edit.percent ?? (live ? String(live.bps / 100) : '1');
	const period: Period = edit.period ?? (live && Number(live.cooldown) === PERIODS.Monthly ? 'Monthly' : 'Weekly');
	const cap = edit.cap ?? (live ? live.flowCap.toString() : '');

	const bps = parseBps(percent);
	const capValue = BigInt(cap || '0');
	const canSet = STREAMER_DEPOSITOR_DEPLOYED && bps !== undefined && capValue > 0n;

	// what one period would move at today's balance: the percentage, bounded by the cap
	const share = bps !== undefined ? (row.balance * BigInt(bps)) / 10_000n : 0n;
	const perPeriod = capValue > 0n && share > capValue ? capValue : share;

	const add = () => {
		if (!canSet || bps === undefined) return;
		const { token, vault } = row.flow;
		const steps: ProposalStep[] = [];
		// the allowance is the DAO's own hard ceiling; the flow cap already bounds what a period can spend
		if (row.approved < capValue) {
			steps.push({
				label: `Approve ${symbol} for the depositor (unlimited)`,
				to: token,
				data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [STREAMER_DEPOSITOR, maxUint256] }),
			});
		}
		steps.push({
			label: `Set flow ${symbol}: ${percent}% ${periodLabel(PERIODS[period])}, cap ${formatCompactNumber(formatUnits(capValue, DECIMALS), 2, '', ` ${symbol}`)}`,
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
					description="Once per period, anyone can move a share of the DAO's stablecoin balance, bounded by the flow cap and the DAO's approval, straight into the reward vault, where it streams to the stakers. Only the curator sets a flow; the guardian or curator can disable one."
				/>
				{!STREAMER_DEPOSITOR_DEPLOYED && (
					<div className="rounded-lg bg-usdu-bg px-4 py-3 text-text-secondary">
						The depositor is not deployed yet. You can already prepare a proposal below, the target address is filled in once it
						is.
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
										onClick={() => setSymbol(r.flow.symbol)}
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
						description="Curator only. Starts from the live flow of the stablecoin. Each period moves the percentage of the DAO's balance, or the cap if that is lower."
					/>
					<PillTabs
						value={symbol}
						onChange={setSymbol}
						options={STREAMER_FLOWS.map((f) => ({ value: f.symbol, label: f.symbol }))}
					/>
					<TextInput
						label="Share of the DAO's balance per period (%)"
						value={percent}
						onChange={(v) => patch({ percent: v })}
						placeholder="1"
						error={bps === undefined ? 'A percentage from 0.01 to 100, at most two decimals' : undefined}
					/>
					<PillTabs value={period} onChange={(v) => patch({ period: v })} options={PERIOD_OPTIONS} />
					<TokenInput
						label="Flow cap per period"
						symbol={symbol}
						value={cap}
						onChange={(v) => patch({ cap: v })}
						digit={DECIMALS}
						placeholder="0.00"
					/>
				</Card>

				<Card variant="panel" className="flex flex-col gap-6">
					<PageHeader
						title="Preview"
						description="What a period would move at the DAO's current balance, with the setup on the left."
					/>
					<div className="space-y-2">
						<div className="flex items-center justify-between rounded-lg bg-usdu-bg px-4 py-2">
							<span className="text-text-secondary">DAO balance</span>
							<span>{fmt(row.balance, symbol)}</span>
						</div>
						<div className="flex items-center justify-between rounded-lg bg-usdu-bg px-4 py-2">
							<span className="text-text-secondary">{percent || '0'}% of the balance</span>
							<span>{fmt(share, symbol)}</span>
						</div>
						<div className="flex items-center justify-between rounded-lg bg-usdu-bg px-4 py-2">
							<span className="text-text-secondary">Moved per {period === 'Weekly' ? 'week' : 'month'} (after the cap)</span>
							<span className="font-semibold text-text-primary">{fmt(perPeriod, symbol)}</span>
						</div>
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
		</>
	);
}
