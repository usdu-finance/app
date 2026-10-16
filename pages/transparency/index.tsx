import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import TransparencyShell from '@/components/sections/transparency/TransparencyShell';
import { SEO } from '@/lib/constants';

// canvas + ResizeObserver only exist in the browser
const GodEye = dynamic(() => import('@/components/pages/godeye/GodEye'), { ssr: false });

export default function TransparencyPage() {
	return (
		<>
			<NextSeo title={SEO.transparency.title} description={SEO.transparency.description} openGraph={SEO.transparency.openGraph} />
			<TransparencyShell>
				<GodEye />
			</TransparencyShell>
		</>
	);
}
