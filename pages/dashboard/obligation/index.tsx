import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileContract, faHeartPulse, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useSort } from '@/hooks/ui/useSort';
import { useCurrencyFilter } from '@/hooks/ui/useCurrencyFilter';
import { useQueryTab } from '@/hooks/ui/useQueryTab';
import { useBorrowPositions, type BorrowPositionView } from '@/hooks/useBorrowPositions';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import { Badge } from '@/components/ui/Badge';
import { PillTabs, TabsBar, CurrencyTabs } from '@/components/ui/input';
import Card from '@/components/ui/Card';
import HeroSteps from '@/components/ui/HeroSteps';
import { RISK_LABEL, fmtCollateral, stableFormat } from '@/lib/borrow/format';
import { debtDue } from '@/lib/borrow/math';
import { formatTimestampLocale } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const HEADERS = ['Position', 'Collateral', 'Debt', 'Risk', 'Maturity'];
const TABS = ['Open', 'Matured'] as const;

const RISK_RANK = { low: 0, medium: 1, high: 2 };
const RISK_BADGE = {
	low: { customColor: 'text-success', customBgColor: 'bg-success-bg' },
	medium: { customColor: 'text-yellow-400', customBgColor: 'bg-yellow-400/20' },
	high: { customColor: 'text-error', customBgColor: 'bg-error-bg' },
};

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function compareObligations(tab: string, a: BorrowPositionView, b: BorrowPositionView): number {
	switch (tab) {
		case 'Collateral':
			return compareBigint(b.balance, a.balance);
		case 'Debt':
			return compareBigint(debtDue(b), debtDue(a));
		case 'Risk':
			return RISK_RANK[b.risk] - RISK_RANK[a.risk];
		case 'Maturity':
			return b.maturity - a.maturity;
		default:
			return b.positionId - a.positionId; // 'Position'
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faFileContract} className="w-3 h-3 text-usdu-card" />,
		title: 'Track positions',
		description: 'See every open obligation across your borrowed collateral, in every stablecoin.',
	},
	{
		icon: <FontAwesomeIcon icon={faHeartPulse} className="w-3 h-3 text-usdu-card" />,
		title: 'Monitor risk',
		description: 'A position priced close to the market price is easy to challenge. Keep an eye on it.',
	},
	{
		icon: <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 text-usdu-card" />,
		title: 'Repay before maturity',
		description: 'Repay an obligation before it matures, or its collateral is sold by auction.',
	},
];

function ObligationListPageContent() {
	const router = useRouter();
	const [tab, setTab] = useQueryTab(TABS);
	const { currency, setCurrency, currencies } = useCurrencyFilter();
	const { mine, isLoading, error } = useBorrowPositions(currency);
	const { sortTab, sortReverse, handleSort } = useSort('Maturity');

	// matured positions are those past their maturity that still hold collateral
	const open = useMemo(() => mine.filter((p) => p.status !== 'expired' && p.status !== 'closed'), [mine]);
	const matured = useMemo(() => mine.filter((p) => p.status === 'expired'), [mine]);

	const sorted = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...(tab === 'Open' ? open : matured)].sort((a, b) => dir * compareObligations(sortTab, a, b));
	}, [tab, open, matured, sortTab, sortReverse]);

	return (
		<div className="space-y-8">
			<PageHeader
				title="Obligation"
				description="Track your open borrow obligations, their risk, and upcoming maturities."
				badge={{ text: 'In development', variant: 'info' }}
			/>

			<HeroSteps steps={STEPS} />

			<TabsBar>
				<PillTabs
					value={tab}
					onChange={setTab}
					options={[
						{ value: 'Open', label: 'Open', badge: open.length },
						{ value: 'Matured', label: 'Matured', badge: matured.length, highlight: true },
					]}
				/>
				<CurrencyTabs currencies={currencies} value={currency} onChange={setCurrency} />
			</TabsBar>

			<Card variant="panel" className="space-y-8">
				<PageHeader
					title={tab === 'Open' ? 'Open Obligations' : 'Matured Obligations'}
					description={
						tab === 'Open'
							? 'Your open borrow obligations with their risk and maturity. Select one to manage it.'
							: 'Obligations past their maturity. Their collateral is being sold by auction, repay now to stop it.'
					}
				/>
				<Table>
					<TableHead headers={HEADERS} colSpan={5} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
					<TableBody>
						{isLoading ? (
							<TableRowEmpty>Loading obligations...</TableRowEmpty>
						) : error ? (
							<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
						) : sorted.length === 0 ? (
							<TableRowEmpty>
								{tab === 'Open' ? 'You have no open obligations yet.' : 'You have no matured obligations.'}
							</TableRowEmpty>
						) : (
							sorted.map((p) => (
								<TableRow
									key={`${p.market.currency}-${p.positionId}`}
									headers={HEADERS}
									colSpan={5}
									tab={sortTab}
									onClick={() => router.push(`/dashboard/borrow/${p.market.currency}/position/${p.positionId}`)}
								>
									<div className="flex items-center gap-2">
										<TokenLogo currency={p.market.collateralSymbol} size={6} className="-mr-2" />
										<TokenLogo currency={p.market.currency} size={6} />
										<span>#{p.positionId}</span>
									</div>
									<span>{fmtCollateral(p.market, p.balance)}</span>
									<span>{stableFormat(p.market.currency).fmtStable(debtDue(p))}</span>
									<span>
										<Badge text={RISK_LABEL[p.risk]} variant="custom" size="md" {...RISK_BADGE[p.risk]} />
									</span>
									<span>{formatTimestampLocale(p.maturity)}</span>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</Card>
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
