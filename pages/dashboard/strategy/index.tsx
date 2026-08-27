import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup, faScaleBalanced, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import HeroSteps from '@/components/ui/HeroSteps';

const HEADERS = ['Strategy', 'TVL', 'APY'];

interface StrategyItem {
	key: string;
	name: string;
	tvl: bigint;
	apyPPM: number;
}

// Placeholder — replace with a hook once strategy vaults are exposed on-chain.
const STRATEGIES: StrategyItem[] = [];

function compareStrategies(tab: string, a: StrategyItem, b: StrategyItem): number {
	switch (tab) {
		case 'TVL':
			return b.tvl < a.tvl ? -1 : b.tvl > a.tvl ? 1 : 0;
		case 'APY':
			return b.apyPPM - a.apyPPM;
		default:
			return a.name.localeCompare(b.name);
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faLayerGroup} className="w-3 h-3 text-usdu-card" />,
		title: 'Browse strategies',
		description: 'Every swap module deposits into a strategy vault — compare them here.',
	},
	{
		icon: <FontAwesomeIcon icon={faScaleBalanced} className="w-3 h-3 text-usdu-card" />,
		title: 'Compare yield & risk',
		description: 'Each strategy carries its own risk profile and expected yield.',
	},
	{
		icon: <FontAwesomeIcon icon={faChartLine} className="w-3 h-3 text-usdu-card" />,
		title: 'Track performance',
		description: 'Follow TVL and APY over time to see how a strategy is performing.',
	},
];

export default function StrategyListPage() {
	const router = useRouter();
	const { sortTab, sortReverse, handleSort } = useSort('Strategy');

	const sortedStrategies = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...STRATEGIES].sort((a, b) => dir * compareStrategies(sortTab, a, b));
	}, [sortTab, sortReverse]);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">Strategy</h1>
				<p className="text-usdu-black">
					Compare the strategy vaults backing each swap module, including their total value locked and yield.
				</p>
			</div>

			<HeroSteps steps={STEPS} />

			<Table>
				<TableHead headers={HEADERS} colSpan={3} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
				<TableBody>
					{sortedStrategies.length === 0 ? (
						<TableRowEmpty>Strategy vaults are coming soon.</TableRowEmpty>
					) : (
						sortedStrategies.map((s) => (
							<TableRow
								key={s.key}
								headers={HEADERS}
								colSpan={3}
								tab={sortTab}
								onClick={() => router.push(`/dashboard/strategy/${s.key}`)}
							>
								<span className="font-semibold text-usdu-black">{s.name}</span>
								<span>{s.tvl.toString()}</span>
								<span>{(s.apyPPM / 10_000).toFixed(2)}%</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
