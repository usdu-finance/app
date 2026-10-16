import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';

// canvas + ResizeObserver only exist in the browser
const GodEyeJourneyView = dynamic(() => import('@/components/pages/godeye/GodEyeJourneyView'), { ssr: false });

export default function GodEyeJourneyPage() {
	return (
		<>
			<NextSeo title="Transparency Timeline" description="Day-by-day counterparties and balance of one address." />
			<div className="px-4 md:px-8 lg:px-16 pt-28 pb-12 bg-usdu-card">
				<div className="relative h-[calc(100vh-10rem)] min-h-[680px] rounded-lg border border-usdu-surface overflow-hidden text-usdu-black">
					<GodEyeJourneyView />
				</div>
			</div>
		</>
	);
}
