import { useState } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faGaugeHigh, faPercent, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { useAppKit } from '@reown/appkit/react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/layout';
import { TokenInput, ButtonInput } from '@/components/ui/input';
import { StatGrid } from '@/components/ui/stats';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import NotFound from '@/components/ui/NotFound';
import { formatTimestampLocale } from '@/lib/utils';

interface BorrowOffer {
	key: string;
	collateralSymbol: string;
	collateralAddress: `0x${string}`;
	maturity: number;
	ratePPM: number;
	availableRaw: bigint;
}

// Placeholder — replace with a hook once borrow offers are exposed on-chain.
const OFFERS: BorrowOffer[] = [];

export default function BorrowDetailPage() {
	const router = useRouter();
	const key = typeof router.query.address === 'string' ? router.query.address : undefined;

	const { isConnected } = useAuth();
	const { open } = useAppKit();
	const [amountRawInput, setAmountRawInput] = useState('');

	const selectedOffer = OFFERS.find((o) => o.key === key);

	if (!router.isReady) return null;

	if (!selectedOffer) {
		return (
			<NotFound
				title="Borrow Offer Not Found"
				description="This borrow offer doesn't exist or isn't available."
				ctaLabel="Back to Borrow"
				ctaHref="/dashboard/borrow"
			/>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader
				title={selectedOffer.collateralSymbol}
				description="Borrow against this collateral at the listed rate and maturity."
				breadcrumbs={[{ label: 'Borrow', href: '/dashboard/borrow' }, { label: selectedOffer.collateralSymbol }]}
			/>

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 3 }}
				stats={[
					{ icon: faGaugeHigh, label: 'Available', value: selectedOffer.availableRaw.toString() },
					{ icon: faPercent, label: 'Rate', value: `${(selectedOffer.ratePPM / 10_000).toFixed(2)}%` },
					{ icon: faCalendarDays, label: 'Maturity', value: formatTimestampLocale(selectedOffer.maturity) },
				]}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Borrow */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface space-y-6">
					<h3 className="font-semibold text-usdu-black text-lg">Borrow</h3>

					<TokenInput
						label="Collateral"
						symbol={selectedOffer.collateralSymbol}
						value={amountRawInput}
						onChange={setAmountRawInput}
					/>

					<ButtonInput
						label={isConnected ? 'Borrow' : 'Connect Wallet'}
						size="lg"
						className="w-full"
						onClick={isConnected ? () => {} : () => open()}
						icon={!isConnected ? <FontAwesomeIcon icon={faWallet} className="w-4 h-4" /> : undefined}
					/>
				</div>

				{/* Details */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface h-full flex flex-col">
					<h3 className="font-semibold text-usdu-black text-lg mb-3">Details</h3>

					<DetailRow label="Maturity" value={formatTimestampLocale(selectedOffer.maturity)} />
					<DetailRow label="Rate" value={`${(selectedOffer.ratePPM / 10_000).toFixed(2)}%`} />

					<h3 className="font-semibold text-usdu-black text-lg mt-10 mb-3">Addresses</h3>

					<DetailRow label="Collateral">
						<AddressLink address={selectedOffer.collateralAddress} />
					</DetailRow>
				</div>
			</div>
		</div>
	);
}
