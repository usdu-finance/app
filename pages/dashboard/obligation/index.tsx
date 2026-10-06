import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileContract, faHeartPulse, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import HeroSteps from '@/components/ui/HeroSteps';
import { formatTimestampLocale } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const HEADERS = ['Collateral', 'Debt', 'Health', 'Maturity'];

interface ObligationItem {
	key: string;
	collateralSymbol: string;
	debtRaw: bigint;
	healthFactor: number;
	maturity: number;
}

// Placeholder — replace with a hook once obligations are exposed on-chain.
const OBLIGATIONS: ObligationItem[] = [];

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function compareObligations(tab: string, a: ObligationItem, b: ObligationItem): number {
	switch (tab) {
		case 'Debt':
			return compareBigint(b.debtRaw, a.debtRaw);
		case 'Health':
			return a.healthFactor - b.healthFactor;
		case 'Maturity':
			return b.maturity - a.maturity;
		default:
			return a.collateralSymbol.localeCompare(b.collateralSymbol);
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faFileContract} className="w-3 h-3 text-usdu-card" />,
		title: 'Track positions',
		description: 'See every open obligation across your borrowed collateral.',
	},
	{
		icon: <FontAwesomeIcon icon={faHeartPulse} className="w-3 h-3 text-usdu-card" />,
		title: 'Monitor health',
		description: 'Keep an eye on the health factor to avoid liquidation.',
	},
	{
		icon: <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 text-usdu-card" />,
		title: 'Repay or roll',
		description: 'Repay an obligation before maturity, or roll it into a new term.',
	},
];

function ObligationListPageContent() {
	const router = useRouter();
	const { sortTab, sortReverse, handleSort } = useSort('Collateral');

	const sortedObligations = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...OBLIGATIONS].sort((a, b) => dir * compareObligations(sortTab, a, b));
	}, [sortTab, sortReverse]);

	return (
		<div className="space-y-8">
			<PageHeader title="Obligation" description="Track your open borrow obligations, their health, and upcoming maturities." />

			<HeroSteps steps={STEPS} />

			<Table>
				<TableHead headers={HEADERS} colSpan={4} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
				<TableBody>
					{sortedObligations.length === 0 ? (
						<TableRowEmpty>You have no open obligations yet.</TableRowEmpty>
					) : (
						sortedObligations.map((o) => (
							<TableRow
								key={o.key}
								headers={HEADERS}
								colSpan={4}
								tab={sortTab}
								onClick={() => router.push(`/dashboard/obligation/${o.key}`)}
							>
								<div className="flex items-center gap-2">
									<TokenLogo currency={o.collateralSymbol} size={6} />
									<span>{o.collateralSymbol}</span>
								</div>
								<span>{o.debtRaw.toString()}</span>
								<span>{o.healthFactor.toFixed(2)}</span>
								<span>{formatTimestampLocale(o.maturity)}</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}

export default function ObligationListPage() {
	return (
		<>
			<NextSeo title={SEO.obligation.title} description={SEO.obligation.description} openGraph={SEO.obligation.openGraph} />
			<ObligationListPageContent />
		</>
	);
}
