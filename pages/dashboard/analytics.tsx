import { faChartColumn } from '@fortawesome/free-solid-svg-icons';
import ComingSoon from '@/components/ui/ComingSoon';

export default function AnalyticsPage() {
	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">
					Analytics
				</h1>
				<p className="text-usdu-black">
					Comprehensive analytics and insights for USDU protocol metrics,
					market performance, and historical data visualization.
				</p>
			</div>

			<ComingSoon
				icon={faChartColumn}
				description="Advanced analytics dashboard with interactive charts, protocol performance metrics, yield tracking, and comprehensive market analysis tools are being developed for enhanced decision-making."
			/>
		</div>
	);
}
