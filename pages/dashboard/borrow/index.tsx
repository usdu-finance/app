import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faCalendarDays, faPercentage } from '@fortawesome/free-solid-svg-icons';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import HeroSteps from '@/components/ui/HeroSteps';
import { formatTimestampLocale } from '@/lib/utils';

const HEADERS = ['Collateral', 'Maturity', 'Rate', 'Available'];

interface BorrowOffer {
	key: string;
	collateralSymbol: string;
	maturity: number;
	ratePPM: number;
	availableRaw: bigint;
}

// Placeholder — replace with a hook once borrow offers are exposed on-chain.
const OFFERS: BorrowOffer[] = [];

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function compareOffers(tab: string, a: BorrowOffer, b: BorrowOffer): number {
	switch (tab) {
		case 'Maturity':
			return b.maturity - a.maturity;
		case 'Rate':
			return b.ratePPM - a.ratePPM;
		case 'Available':
			return compareBigint(b.availableRaw, a.availableRaw);
		default:
			return a.collateralSymbol.localeCompare(b.collateralSymbol);
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faCoins} className="w-3 h-3 text-usdu-card" />,
		title: 'Pick collateral',
		description: 'Select a suitable collateral to borrow against.',
	},
	{
		icon: <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 text-usdu-card" />,
		title: 'Choose maturity',
		description: 'Pick a maturity that matches your desired terms, or create a custom order.',
	},
	{
		icon: <FontAwesomeIcon icon={faPercentage} className="w-3 h-3 text-usdu-card" />,
		title: 'Borrow instantly',
		description: 'Initiate the borrow action directly on-chain.',
	},
];

export default function BorrowListPage() {
	const router = useRouter();
	const { sortTab, sortReverse, handleSort } = useSort('Collateral');

	const sortedOffers = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...OFFERS].sort((a, b) => dir * compareOffers(sortTab, a, b));
	}, [sortTab, sortReverse]);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">Borrow</h1>
				<p className="text-usdu-black">
					Select a suitable collateral and maturity to initiate a borrow action. If your desired terms
					aren&apos;t available, you can create a custom order.
				</p>
			</div>

			<HeroSteps steps={STEPS} />

			<Table>
				<TableHead headers={HEADERS} colSpan={4} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
				<TableBody>
					{sortedOffers.length === 0 ? (
						<TableRowEmpty>Borrow offers are coming soon.</TableRowEmpty>
					) : (
						sortedOffers.map((o) => (
							<TableRow
								key={o.key}
								headers={HEADERS}
								colSpan={4}
								tab={sortTab}
								onClick={() => router.push(`/dashboard/borrow/${o.key}`)}
							>
								<div className="flex items-center gap-2">
									<TokenLogo currency={o.collateralSymbol} size={6} />
									<span className="font-semibold text-usdu-black">{o.collateralSymbol}</span>
								</div>
								<span>{formatTimestampLocale(o.maturity)}</span>
								<span>{(o.ratePPM / 10_000).toFixed(2)}%</span>
								<span>{o.availableRaw.toString()}</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
