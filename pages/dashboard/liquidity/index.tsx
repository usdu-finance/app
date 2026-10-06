import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDroplet, faRoute, faBolt } from '@fortawesome/free-solid-svg-icons';
import { useCurvePools, type CurvePool } from '@/hooks/useCurvePools';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import HeroSteps from '@/components/ui/HeroSteps';
import { formatCompactNumber } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const HEADERS = ['Pool', 'TVL', 'First Token', 'Second Token', 'LP Supply'];

function compareNumber(a: number, b: number): number {
	return a - b;
}

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
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
		case 'LP Supply':
			return compareBigint(b.totalSupply, a.totalSupply);
		default:
			return a.label.localeCompare(b.label); // 'Pool'
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faDroplet} className="w-3 h-3 text-usdu-card" />,
		title: 'Pick a pool',
		description: 'USDC/USDU, USDU/EURU, and USDU/CHFU Curve pools are all live, each with their own liquidity.',
	},
	{
		icon: <FontAwesomeIcon icon={faRoute} className="w-3 h-3 text-usdu-card" />,
		title: 'Compare pools',
		description: 'Check TVL and token balances per pool to see where liquidity is needed.',
	},
	{
		icon: <FontAwesomeIcon icon={faBolt} className="w-3 h-3 text-usdu-card" />,
		title: 'Provide instantly',
		description: 'Add or remove liquidity on-chain — no order book, priced by the pool itself.',
	},
];

function LiquidityListPageContent() {
	const router = useRouter();
	const { pools, isLoading, error } = useCurvePools();
	const { sortTab, sortReverse, handleSort } = useSort('TVL');

	const sortedPools = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...pools].sort((a, b) => dir * comparePools(sortTab, a, b));
	}, [pools, sortTab, sortReverse]);

	return (
		<div className="space-y-8">
			<PageHeader
				title="Liquidity"
				description="Provide or remove liquidity from the pools backing USDU. Select a pool to get started."
			/>

			<HeroSteps steps={STEPS} />

			<Table>
				<TableHead headers={HEADERS} colSpan={5} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
				<TableBody>
					{isLoading ? (
						<TableRowEmpty>Loading liquidity pools...</TableRowEmpty>
					) : error ? (
						<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
					) : sortedPools.length === 0 ? (
						<TableRowEmpty>No liquidity pools available.</TableRowEmpty>
					) : (
						sortedPools.map((m) => (
							<TableRow
								key={m.key}
								headers={HEADERS}
								colSpan={5}
								tab={sortTab}
								onClick={() => router.push(`/dashboard/liquidity/${m.poolAddress}/curve`)}
							>
								<div className="flex items-center gap-2">
									<TokenLogo currency={m.tokens[0].symbol} size={6} className="-mr-2" />
									<TokenLogo currency={m.tokens[1].symbol} size={6} />
									<span>{m.label}</span>
								</div>
								<span>{formatCompactNumber(m.totalValue, 1, '', ' USDU')}</span>
								<span>{formatCompactNumber(tokenAmount(m, 0), 1, '', ` ${m.tokens[0].symbol}`)}</span>
								<span>{formatCompactNumber(tokenAmount(m, 1), 1, '', ` ${m.tokens[1].symbol}`)}</span>
								<span>{formatCompactNumber(formatUnits(m.totalSupply, 18), 1, '', ' LP')}</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}

export default function LiquidityListPage() {
	return (
		<>
			<NextSeo title={SEO.liquidity.title} description={SEO.liquidity.description} openGraph={SEO.liquidity.openGraph} />
			<LiquidityListPageContent />
		</>
	);
}
