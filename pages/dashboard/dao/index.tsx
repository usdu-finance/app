import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { NextSeo } from 'next-seo';
import { ADDRESS, Stablecoin_ABI } from '@usdu-finance/usdu-core';
// TODO: import ForeignSwapperV1_ABI from '@usdu-finance/usdu-core' once it is published, then delete lib/abis/ForeignSwapperV1.ts
import { ForeignSwapperV1_ABI } from '@/lib/abis/ForeignSwapperV1';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightArrowLeft, faBan } from '@fortawesome/free-solid-svg-icons';
import Card from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTx } from '@/hooks/useTx';
import { APP_REFETCH, FOREIGN_SWAPPER_ADDRESS, SEO } from '@/lib/constants';
import { TOKENS } from '@/lib/tokens/config';
import { formatCompactNumber } from '@/lib/utils';

const HEADERS = ['Token', 'Swappable', 'Receives', 'Min / Max Amount', 'Status'];
const COL_SPAN = HEADERS.length;

/** Foreign tokens the DAO may hold. The swapper has no way to list its routes, so the app asks for each of these. */
const FOREIGN_TOKENS = [TOKENS.USDT, TOKENS.USDC, TOKENS.ZCHF, TOKENS.dEURO];

const ICON_BTN =
	'flex items-center justify-center w-9 h-9 rounded-lg border border-usdu-orange text-usdu-orange hover:bg-usdu-orange hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none';

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
				args: [t.address as `0x${string}`],
			},
			{
				address: FOREIGN_SWAPPER_ADDRESS!,
				abi: ForeignSwapperV1_ABI,
				functionName: 'swappable' as const,
				args: [t.address as `0x${string}`],
			},
		]),
		query: { enabled: !!FOREIGN_SWAPPER_ADDRESS, refetchInterval: APP_REFETCH },
	});

	const isRole = (i: 0 | 1) => {
		const holder = roles?.[i]?.result as string | undefined;
		return !!address && !!holder && holder.toLowerCase() === address.toLowerCase();
	};
	const canDisable = isRole(0) || isRole(1);

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

	return (
		<div className="space-y-8">
			<PageHeader
				title="DAO"
				description="Foreign tokens held by the DAO are converted into ecosystem tokens along routes the curator configured. Anyone can trigger a conversion; the proceeds always go back to the DAO."
			/>

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
