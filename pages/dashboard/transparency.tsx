import { faEye } from '@fortawesome/free-solid-svg-icons';
import ComingSoon from '@/components/ui/ComingSoon';

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

			<ComingSoon
				icon={faEye}
				description="The transparency dashboard will provide full visibility into protocol operations, including reserves, governance proposals, audit reports, and real-time protocol metrics for complete transparency."
			/>
		</div>
	);
}
