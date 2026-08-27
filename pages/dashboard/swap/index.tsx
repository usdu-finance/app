import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faScaleBalanced, faBolt } from '@fortawesome/free-solid-svg-icons';
import { useSwapModules } from '@/hooks/useSwapModules';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import HeroSteps from '@/components/ui/HeroSteps';
import { formatCompactNumber } from '@/lib/utils';

const HEADERS = ['Coin', 'Available', 'Cap', 'Fees In', 'Fees Out', 'Revenue', 'Strategy'];

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faCoins} className="w-3 h-3 text-usdu-card" />,
		title: 'Pick a currency',
		description: 'USDU today — EUR and other currencies are coming, each with their own set of swap modules.',
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

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">Swap</h1>
				<p className="text-usdu-black">
					Mint USDU from USDC/USDT or redeem USDU back to the underlying coin through the USDU swap router.
					Select a coin to get started.
				</p>
			</div>

			<HeroSteps steps={STEPS} />

			<Table>
				<TableHead headers={HEADERS} colSpan={7} logoPadding />
				<TableBody>
					{isLoading ? (
						<TableRowEmpty>Loading swap modules...</TableRowEmpty>
					) : error ? (
						<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
					) : modules.length === 0 ? (
						<TableRowEmpty>No swap modules available.</TableRowEmpty>
					) : (
						modules.map((m) => (
							<TableRow
								key={m.key}
								headers={HEADERS}
								colSpan={7}
								onClick={() => router.push(`/dashboard/swap/${m.moduleAddress}`)}
							>
								<div className="flex items-center gap-2">
									<TokenLogo currency={m.coinSymbol} size={6} />
									<span className="font-semibold text-usdu-black">{m.coinSymbol}</span>
								</div>
								<span>{formatCompactNumber(formatUnits(m.mintable, 18), 1, '', '', false)} USDU</span>
								<span>{formatCompactNumber(formatUnits(m.mintCap, 18), 1, '')} USDU</span>
								<span>{(m.swapInFeePPM / 10_000).toFixed(2)}%</span>
								<span>{(m.swapOutFeePPM / 10_000).toFixed(2)}%</span>
								<span>{formatCompactNumber(formatUnits(m.totalRevenue, 18), 1, '')} USDU</span>
								<span>{m.vaultName || '—'}</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
