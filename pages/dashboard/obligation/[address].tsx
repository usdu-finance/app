import { useRouter } from 'next/router';
import { faSackDollar, faHeartPulse, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { PageHeader } from '@/components/ui/layout';
import { ButtonInput } from '@/components/ui/input';
import { StatGrid } from '@/components/ui/stats';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import NotFound from '@/components/ui/NotFound';
import { formatTimestampLocale } from '@/lib/utils';

interface ObligationItem {
	key: string;
	collateralSymbol: string;
	collateralAddress: `0x${string}`;
	debtRaw: bigint;
	healthFactor: number;
	maturity: number;
}

// Placeholder — replace with a hook once obligations are exposed on-chain.
const OBLIGATIONS: ObligationItem[] = [];

export default function ObligationDetailPage() {
	const router = useRouter();
	const key = typeof router.query.address === 'string' ? router.query.address : undefined;

	const selectedObligation = OBLIGATIONS.find((o) => o.key === key);

	if (!router.isReady) return null;

	if (!selectedObligation) {
		return (
			<NotFound
				title="Obligation Not Found"
				description="This obligation doesn't exist or isn't available."
				ctaLabel="Back to Obligation"
				ctaHref="/dashboard/obligation"
			/>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader
				title={selectedObligation.collateralSymbol}
				description="Details on this obligation, including outstanding debt, health, and maturity."
				breadcrumbs={[{ label: 'Obligation', href: '/dashboard/obligation' }, { label: selectedObligation.collateralSymbol }]}
			/>

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 3 }}
				stats={[
					{ icon: faSackDollar, label: 'Debt', value: selectedObligation.debtRaw.toString() },
					{ icon: faHeartPulse, label: 'Health', value: selectedObligation.healthFactor.toFixed(2) },
					{ icon: faCalendarDays, label: 'Maturity', value: formatTimestampLocale(selectedObligation.maturity) },
				]}
			/>

			<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
				<h3 className="font-semibold text-usdu-black text-lg">Details</h3>

				<DetailRow label="Debt" value={selectedObligation.debtRaw.toString()} />
				<DetailRow label="Health" value={selectedObligation.healthFactor.toFixed(2)} />
				<DetailRow label="Maturity" value={formatTimestampLocale(selectedObligation.maturity)} />

				<h3 className="font-semibold text-usdu-black text-lg mt-10 mb-3">Addresses</h3>

				<DetailRow label="Collateral">
					<AddressLink address={selectedObligation.collateralAddress} />
				</DetailRow>

				<ButtonInput label="Repay" size="lg" className="w-full mt-6" onClick={() => {}} />
			</div>
		</div>
	);
}
