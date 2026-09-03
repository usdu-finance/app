import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faScaleBalanced, faBolt } from '@fortawesome/free-solid-svg-icons';
import { useSwapModules, type SwapModule } from '@/hooks/useSwapModules';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import HeroSteps from '@/components/ui/HeroSteps';
import { formatCompactNumber } from '@/lib/utils';

const HEADERS = ['Coin', 'Available In', 'Available Out', 'Fees In', 'Fees Out', 'Revenue', 'Strategy'];

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
								onClick={() => router.push(`/dashboard/swap/${m.moduleAddress}`)}
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
		</div>
	);
}
