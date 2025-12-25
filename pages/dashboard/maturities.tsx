import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

export default function MaturitiesPage() {
	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">
					Maturities
				</h1>
				<p className="text-usdu-black">
					Track and manage fixed-term positions with clear maturity dates.
					Monitor your lending terms and plan for upcoming maturities.
				</p>
			</div>

			{/* Coming Soon Section */}
			<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
				<div className="text-center">
					<div className="w-16 h-16 bg-usdu-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<FontAwesomeIcon
							icon={faCalendarAlt}
							className="w-8 h-8 text-usdu-orange"
						/>
					</div>
					<h2 className="text-xl font-bold text-usdu-black mb-2">
						Coming Soon
					</h2>
					<p className="text-text-secondary">
						The maturities dashboard will help you track all your
						fixed-term positions in one place. View upcoming maturity
						dates and manage your lending portfolio effectively.
					</p>
				</div>
			</div>
		</div>
	);
}