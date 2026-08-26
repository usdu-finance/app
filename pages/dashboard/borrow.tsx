import { faPercentage } from '@fortawesome/free-solid-svg-icons';
import ComingSoon from '@/components/ui/ComingSoon';

export default function BorrowPage() {
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

			<ComingSoon
				icon={faPercentage}
				description="The borrow dashboard will let you select collateral and maturity terms to initiate a borrow action, with support for custom orders when your desired terms aren't available."
			/>
		</div>
	);
}
