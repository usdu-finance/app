import { useMemo, useState } from 'react';
import { NextSeo } from 'next-seo';
import { useMorphoMarkets, type MorphoMarket } from '@/hooks/useMorphoMarkets';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHeadSearchable, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import Card from '@/components/ui/Card';
import { formatCompactNumber } from '@/lib/utils';
import { SEO } from '@/lib/constants';

const HEADERS = ['Market', 'Borrow APR', 'Max Borrow', 'Collateral Needed', 'Fee / Year', 'LLTV'];

function compareMarkets(tab: string, a: MorphoMarket, b: MorphoMarket): number {
	switch (tab) {
		case 'Borrow APR':
			return a.borrowApr - b.borrowApr; // cheapest first
		case 'Max Borrow':
			return b.maxBorrowUsd - a.maxBorrowUsd;
		case 'Collateral Needed':
			return b.collateralNeededUsd - a.collateralNeededUsd;
		case 'Fee / Year':
			return b.yearlyCostUsd - a.yearlyCostUsd;
		case 'LLTV':
			return b.lltv - a.lltv;
		default:
			return `${a.collateralSymbol}/${a.loanSymbol}`.localeCompare(`${b.collateralSymbol}/${b.loanSymbol}`); // 'Market'
	}
}

const uniqueSorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

function MorphoPageContent() {
	const { markets, isLoading, error } = useMorphoMarkets();
	const { sortTab, sortReverse, handleSort } = useSort('Borrow APR');
	const [search, setSearch] = useState('');
	const [collaterals, setCollaterals] = useState<string[]>([]);
	const [loans, setLoans] = useState<string[]>([]);

	const collateralOptions = useMemo(
		() => uniqueSorted(markets.map((m) => m.collateralSymbol)).map((s) => ({ label: s, value: s })),
		[markets]
	);
	const loanOptions = useMemo(() => uniqueSorted(markets.map((m) => m.loanSymbol)), [markets]);

	const rows = useMemo(() => {
		const query = search.trim().toLowerCase();
		const dir = sortReverse ? -1 : 1;
		return markets
			.filter((m) => collaterals.length === 0 || collaterals.includes(m.collateralSymbol))
			.filter((m) => loans.length === 0 || loans.includes(m.loanSymbol))
			.filter(
				(m) =>
					!query || `${m.collateralSymbol} ${m.loanSymbol} ${m.collateralAddress} ${m.loanAddress}`.toLowerCase().includes(query)
			)
			.sort((a, b) => dir * compareMarkets(sortTab, a, b));
	}, [markets, search, collaterals, loans, sortTab, sortReverse]);

	return (
		<div className="space-y-8">
			<PageHeader
				title="Morpho"
				description="Every borrowable Morpho Blue market on Ethereum. Pick the collaterals you could use and compare the borrow rate against what our lending ventures earn."
			/>

			<Card variant="panel" className="space-y-8">
				<PageHeader
					title="Borrow Markets"
					description="Max Borrow is the free liquidity of the market. Collateral Needed is what has to be posted to borrow that amount right up to the LLTV, so keep a buffer in practice. Fee / Year is the interest on the max borrow over a year."
				/>
				<Table>
					<TableHeadSearchable
						searchPlaceholder="Search collateral or loan asset"
						searchValue={search}
						onSearchChange={setSearch}
						hideMyWallet
						inMyWallet={false}
						onInMyWalletChange={() => {}}
						filterOptionsTitle="Collateral"
						filterOptions={collateralOptions}
						activeFilters={collaterals}
						onFiltersChange={setCollaterals}
						customCategories={loanOptions}
						customCategoriesTitle="Loan Asset"
						activeCustomCategories={loans}
						onCustomCategoriesChange={setLoans}
						headers={HEADERS}
						tab={sortTab}
						reverse={sortReverse}
						tabOnChange={handleSort}
					/>
					<TableBody>
						{isLoading ? (
							<TableRowEmpty>Loading Morpho markets...</TableRowEmpty>
						) : error ? (
							<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
						) : rows.length === 0 ? (
							<TableRowEmpty>No markets match the filters.</TableRowEmpty>
						) : (
							rows.map((m) => (
								<TableRow
									key={m.key}
									headers={HEADERS}
									tab={sortTab}
									onClick={() => window.open(`https://app.morpho.org/ethereum/market/${m.key}`, '_blank', 'noopener')}
								>
									<div className="flex items-center gap-2">
										<TokenLogo currency={m.collateralSymbol} logoURI={m.collateralLogoURI} size={6} className="-mr-2" />
										<TokenLogo currency={m.loanSymbol} logoURI={m.loanLogoURI} size={6} />
										<span>
											{m.collateralSymbol} / {m.loanSymbol}
										</span>
									</div>
									<span>{`${(m.borrowApr * 100).toFixed(2)}%`}</span>
									<span>
										{formatCompactNumber(m.maxBorrow, 1, '', ` ${m.loanSymbol}`)}
										<span className="block text-xs text-text-secondary">{formatCompactNumber(m.maxBorrowUsd, 1)}</span>
									</span>
									<span>
										{formatCompactNumber(m.collateralNeeded, 2, '', ` ${m.collateralSymbol}`)}
										<span className="block text-xs text-text-secondary">
											{formatCompactNumber(m.collateralNeededUsd, 1)}
										</span>
									</span>
									<span>
										{formatCompactNumber(m.yearlyCost, 1, '', ` ${m.loanSymbol}`)}
										<span className="block text-xs text-text-secondary">{formatCompactNumber(m.yearlyCostUsd, 1)}</span>
									</span>
									<span>{`${+(m.lltv * 100).toFixed(1)}%`}</span>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

export default function MorphoPage() {
	return (
		<>
			<NextSeo title={SEO.morpho.title} description={SEO.morpho.description} openGraph={SEO.morpho.openGraph} />
			<MorphoPageContent />
		</>
	);
}
