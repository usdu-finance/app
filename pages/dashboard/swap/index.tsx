import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faScaleBalanced, faBolt } from '@fortawesome/free-solid-svg-icons';
import { useSwapModules, type SwapModule } from '@/hooks/useSwapModules';
import { useCurvePools, type CurvePool } from '@/hooks/useCurvePools';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import HeroSteps from '@/components/ui/HeroSteps';
import { formatCompactNumber } from '@/lib/utils';

const HEADERS = ['Coin', 'Available In', 'Available Out', 'Fees In', 'Fees Out', 'Revenue', 'Strategy'];
const POOL_HEADERS = ['Pool', 'First Token', 'Second Token', 'TVL'];

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function compareModules(tab: string, a: SwapModule, b: SwapModule): number {
	switch (tab) {
		case 'Available In':
			return compareBigint(b.mintable, a.mintable);
		case 'Available Out':
			return compareBigint(b.totalMinted, a.totalMinted);
		case 'Fees In':
			return b.swapInFeePPM - a.swapInFeePPM;
		case 'Fees Out':
			return b.swapOutFeePPM - a.swapOutFeePPM;
		case 'Revenue':
			return compareBigint(b.totalRevenue, a.totalRevenue);
		case 'Strategy':
			return a.vaultName.localeCompare(b.vaultName);
		default:
			return a.coinSymbol.localeCompare(b.coinSymbol);
	}
}

function compareNumber(a: number, b: number): number {
	return a - b;
}

function tokenAmount(p: CurvePool, index: 0 | 1): number {
	return parseFloat(formatUnits(p.balances[index], p.tokens[index].decimals));
}

function comparePools(tab: string, a: CurvePool, b: CurvePool): number {
	switch (tab) {
		case 'TVL':
			return compareNumber(b.totalValue, a.totalValue);
		case 'First Token':
			return compareNumber(tokenAmount(b, 0), tokenAmount(a, 0));
		case 'Second Token':
			return compareNumber(tokenAmount(b, 1), tokenAmount(a, 1));
		default:
			return a.label.localeCompare(b.label); // 'Pool'
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faCoins} className="w-3 h-3 text-usdu-card" />,
		title: 'Pick a currency',
		description: 'USDU, EURU, and CHFU are all live today, each with their own set of swap modules.',
	},
	{
		icon: <FontAwesomeIcon icon={faScaleBalanced} className="w-3 h-3 text-usdu-card" />,
		title: 'Compare bridges',
		description: 'The same coin can be backed by more than one bridge, each with its own fees and mint capacity.',
	},
	{
		icon: <FontAwesomeIcon icon={faBolt} className="w-3 h-3 text-usdu-card" />,
		title: 'Swap instantly',
		description: 'Mint or redeem directly on-chain through the swap router — no order book, no slippage.',
	},
];

export default function SwapListPage() {
	const router = useRouter();
	const { modules, isLoading, error } = useSwapModules();
	const { sortTab, sortReverse, handleSort } = useSort('Coin');

	const sortedModules = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...modules].sort((a, b) => dir * compareModules(sortTab, a, b));
	}, [modules, sortTab, sortReverse]);

	const { pools, isLoading: isLoadingPools, error: poolError } = useCurvePools();
	const { sortTab: poolSortTab, sortReverse: poolSortReverse, handleSort: handlePoolSort } = useSort('Pool');

	const sortedPools = useMemo(() => {
		const dir = poolSortReverse ? -1 : 1;
		return [...pools].sort((a, b) => dir * comparePools(poolSortTab, a, b));
	}, [pools, poolSortTab, poolSortReverse]);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">Swap</h1>
				<p className="text-usdu-black">
					Mint fresh stablecoins, or redeem them back into their backed assets, through the swap router. Select a coin to get
					started.
				</p>
			</div>

			<HeroSteps steps={STEPS} />

			<Table>
				<TableHead headers={HEADERS} colSpan={7} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
				<TableBody>
					{isLoading ? (
						<TableRowEmpty>Loading swap modules...</TableRowEmpty>
					) : error ? (
						<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
					) : sortedModules.length === 0 ? (
						<TableRowEmpty>No swap modules available.</TableRowEmpty>
					) : (
						sortedModules.map((m) => (
							<TableRow
								key={m.key}
								headers={HEADERS}
								colSpan={7}
								tab={sortTab}
								onClick={() => router.push(`/dashboard/swap/${m.moduleAddress}/stable`)}
							>
								<div className="flex items-center gap-2">
									<TokenLogo currency={m.coinSymbol} size={6} className="-mr-2" />
									<TokenLogo currency={m.currency} size={6} />
									<span className="font-semibold text-usdu-black">
										{m.coinSymbol} / {m.currency}
									</span>
								</div>
								<span>
									{formatCompactNumber(formatUnits(m.mintable, 18), 1, '', '', false)} {m.currency}
								</span>
								<span>
									{formatCompactNumber(formatUnits(m.totalMinted, 18), 1, '')} {m.coinSymbol}
								</span>
								<span>{(m.swapInFeePPM / 10_000).toFixed(2)}%</span>
								<span>{(m.swapOutFeePPM / 10_000).toFixed(2)}%</span>
								<span>
									{formatCompactNumber(formatUnits(m.totalRevenue, 18), 1, '')} {m.currency}
								</span>
								<span>{m.vaultName || '—'}</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>

			{/* Curve pools */}
			<div>
				<h2 className="text-2xl font-bold text-usdu-black mb-2">Curve Pools</h2>
				<p className="text-usdu-black">
					Swap directly against Curve pools backing USDU. For now, only pools whose Curve address we&apos;ve manually checked are
					listed here.
				</p>
			</div>

			<Table>
				<TableHead headers={POOL_HEADERS} colSpan={4} tab={poolSortTab} reverse={poolSortReverse} tabOnChange={handlePoolSort} />
				<TableBody>
					{isLoadingPools ? (
						<TableRowEmpty>Loading curve pools...</TableRowEmpty>
					) : poolError ? (
						<TableRowEmpty>{`Error: ${poolError}`}</TableRowEmpty>
					) : sortedPools.length === 0 ? (
						<TableRowEmpty>No curve pools available.</TableRowEmpty>
					) : (
						sortedPools.map((m) => (
							<TableRow
								key={m.key}
								headers={POOL_HEADERS}
								colSpan={4}
								tab={poolSortTab}
								onClick={() => router.push(`/dashboard/swap/${m.poolAddress}/curve`)}
							>
								<div className="flex items-center gap-2">
									<TokenLogo currency={m.tokens[0].symbol} size={6} className="-mr-2" />
									<TokenLogo currency={m.tokens[1].symbol} size={6} />
									<span className="font-semibold text-usdu-black">{m.label}</span>
								</div>
								<span>{formatCompactNumber(tokenAmount(m, 0), 1, '', ` ${m.tokens[0].symbol}`)}</span>
								<span>{formatCompactNumber(tokenAmount(m, 1), 1, '', ` ${m.tokens[1].symbol}`)}</span>
								<span>{formatCompactNumber(m.totalValue, 1, '', ' USDU')}</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
