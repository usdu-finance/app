import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';

// canvas + ResizeObserver only exist in the browser
const GodEyeJourneyView = dynamic(() => import('@/components/pages/godeye/GodEyeJourneyView'), { ssr: false });

export default function GodEyeJourneyPage() {
	// fullscreen cockpit: Layout renders no navbar/footer for this route, so lock the page scroll
	useEffect(() => {
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, []);

	return (
		<>
			<NextSeo title="GodEye Timeline" description="Day-by-day counterparties and balance of one address." />
			<div className="fixed inset-0 bg-usdu-bg text-usdu-black">
				<GodEyeJourneyView />
			</div>
		</>
	);
}
