import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

// canvas + ResizeObserver only exist in the browser
const GodEyeView = dynamic(() => import('@/components/pages/godeye/GodEyeView'), { ssr: false });

export default function GodEyePage() {
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
			<NextSeo title={SEO.transparency.title} description={SEO.transparency.description} openGraph={SEO.transparency.openGraph} />
			<div className="fixed inset-0 bg-usdu-bg text-usdu-black">
				<GodEyeView />
			</div>
		</>
	);
}
