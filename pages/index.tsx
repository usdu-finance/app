import { MotionConfig } from 'framer-motion';
import { NextSeo } from 'next-seo';
import Hero from '@/components/sections/landing/Hero';
import Stablecoins from '@/components/sections/landing/Stablecoins';
import HowItWorks from '@/components/sections/landing/HowItWorks';
import Products from '@/components/sections/landing/Products';
import Pillars from '@/components/sections/landing/Pillars';
import Ecosystem from '@/components/sections/landing/Ecosystem';
import Faq from '@/components/sections/landing/Faq';
import Cta from '@/components/sections/landing/Cta';
import { useLandingStats } from '@/hooks/useLandingStats';
import { SEO } from '@/lib/constants';

export default function HomePage() {
	const stats = useLandingStats();

	return (
		<MotionConfig reducedMotion="user">
			<NextSeo title={SEO.home.title} description={SEO.home.description} openGraph={SEO.home.openGraph} twitter={SEO.home.twitter} />

			<Hero stats={stats} />
			<Stablecoins stats={stats} />
			<HowItWorks />
			<Products />
			<Pillars stats={stats} />
			<Ecosystem />
			<Faq />
			<Cta />
		</MotionConfig>
	);
}
