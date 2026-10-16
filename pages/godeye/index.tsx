import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';

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
			<NextSeo title="GodEye" description="Follow the flow of USDU, EURU and CHFU between wallets, vaults, modules and pools." />
			<div className="fixed inset-0 bg-usdu-bg text-usdu-black">
				<GodEyeView />
			</div>
		</>
	);
}
