import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDroplet, faRoute, faBolt } from '@fortawesome/free-solid-svg-icons';
import { usePoolModules, type PoolModule } from '@/hooks/usePoolModules';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import HeroSteps from '@/components/ui/HeroSteps';
import { formatCompactNumber } from '@/lib/utils';

const HEADERS = ['Pool', 'TVL', 'USDC / USDU', 'LP Supply', 'Adapter Status'];

function adapterStatus(m: PoolModule): string {
	if (m.usduRatio < 0.5) return 'Provide with Adapter';
	if (m.usduRatio >= 0.5 && m.adapterLPRatio > 0) return 'Remove with Adapter';
	return 'Not Available';
}

function compareNumber(a: number, b: number): number {
	return a - b;
}

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function comparePools(tab: string, a: PoolModule, b: PoolModule): number {
	switch (tab) {
		case 'TVL':
			return compareNumber(b.totalValue, a.totalValue);
		case 'USDC / USDU':
			return compareNumber(b.usduRatio, a.usduRatio);
		case 'LP Supply':
			return compareBigint(b.totalSupply, a.totalSupply);
		case 'Adapter Status':
			return adapterStatus(a).localeCompare(adapterStatus(b));
		default:
			return a.label.localeCompare(b.label); // 'Pool'
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faDroplet} className="w-3 h-3 text-usdu-card" />,
		title: 'Pick a pool',
		description: 'USDC/USDU today — more Curve pools will list here as they come online.',
	},
	{
		icon: <FontAwesomeIcon icon={faRoute} className="w-3 h-3 text-usdu-card" />,
		title: 'Compare routes',
		description: 'Go direct to the Curve pool, or route through the protocol adapter for better pricing when it applies.',
	},
	{
		icon: <FontAwesomeIcon icon={faBolt} className="w-3 h-3 text-usdu-card" />,
		title: 'Provide instantly',
		description: 'Add or remove liquidity on-chain — no order book, priced by the pool itself.',
	},
];

export default function LiquidityListPage() {
	const router = useRouter();
	const { modules, isLoading, error } = usePoolModules();
	const { sortTab, sortReverse, handleSort } = useSort('Pool');

	const sortedModules = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...modules].sort((a, b) => dir * comparePools(sortTab, a, b));
	}, [modules, sortTab, sortReverse]);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">Liquidity</h1>
				<p className="text-usdu-black">
					Provide or remove liquidity from the pools backing USDU. Select a pool to get started.
				</p>
			</div>

			<HeroSteps steps={STEPS} />

			<Table>
				<TableHead headers={HEADERS} colSpan={5} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
				<TableBody>
					{isLoading ? (
						<TableRowEmpty>Loading liquidity pools...</TableRowEmpty>
					) : error ? (
						<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
					) : sortedModules.length === 0 ? (
						<TableRowEmpty>No liquidity pools available.</TableRowEmpty>
					) : (
						sortedModules.map((m) => (
							<TableRow
								key={m.key}
								headers={HEADERS}
								colSpan={5}
								tab={sortTab}
								onClick={() => router.push(`/dashboard/liquidity/${m.key}`)}
							>
								<div className="flex items-center gap-2">
									<TokenLogo currency="USDC" size={6} className="-mr-2" />
									<TokenLogo currency="USDU" size={6} />
									<span className="font-semibold text-usdu-black">{m.label}</span>
								</div>
								<span>{formatCompactNumber(m.totalValue, 1, '', ' USDU')}</span>
								<span>
									{(m.usdcRatio * 100).toFixed(1)}% / {(m.usduRatio * 100).toFixed(1)}%
								</span>
								<span>{formatCompactNumber(formatUnits(m.totalSupply, 18), 1, '', ' LP')}</span>
								<span>{adapterStatus(m)}</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
