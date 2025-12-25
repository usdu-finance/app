import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPercentage } from '@fortawesome/free-solid-svg-icons';

export default function BorrowRatesPage() {
	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">
					Borrow Rates
				</h1>
				<p className="text-usdu-black">
					Monitor real-time borrowing rates across different markets and
					find the best rates for USDU borrowing and lending opportunities.
				</p>
			</div>

			{/* Coming Soon Section */}
			<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
				<div className="text-center">
					<div className="w-16 h-16 bg-usdu-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<FontAwesomeIcon
							icon={faPercentage}
							className="w-8 h-8 text-usdu-orange"
						/>
					</div>
					<h2 className="text-xl font-bold text-usdu-black mb-2">
						Coming Soon
					</h2>
					<p className="text-text-secondary">
						The borrow rates dashboard is being developed to provide
						you with real-time interest rates across all integrated
						markets. Compare rates and find optimal borrowing
						opportunities.
					</p>
				</div>
			</div>
		</div>
	);
}