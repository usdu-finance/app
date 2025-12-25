import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';

export default function TransparencyPage() {
	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">
					Transparency
				</h1>
				<p className="text-usdu-black">
					Access comprehensive protocol data, audit reports, and real-time
					transparency metrics. Monitor protocol health and governance
					activities.
				</p>
			</div>

			{/* Coming Soon Section */}
			<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
				<div className="text-center">
					<div className="w-16 h-16 bg-usdu-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<FontAwesomeIcon
							icon={faEye}
							className="w-8 h-8 text-usdu-orange"
						/>
					</div>
					<h2 className="text-xl font-bold text-usdu-black mb-2">
						Coming Soon
					</h2>
					<p className="text-text-secondary">
						The transparency dashboard will provide full visibility
						into protocol operations, including reserves, governance
						proposals, audit reports, and real-time protocol metrics
						for complete transparency.
					</p>
				</div>
			</div>
		</div>
	);
}