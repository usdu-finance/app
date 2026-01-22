import React from 'react';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';
import MaturitiesOverview from '@/components/sections/maturities/MaturitiesOverview';
import AvailableTerms from '@/components/sections/maturities/AvailableTerms';
import UpcomingMaturities from '@/components/sections/maturities/UpcomingMaturities';
import HowItWorks from '@/components/sections/maturities/HowItWorks';

export default function MaturitiesPage() {
	return (
		<>
			<NextSeo
				title={SEO.maturities.title}
				description={SEO.maturities.description}
				openGraph={SEO.maturities.openGraph}
			/>

			<MaturitiesOverview />
			<AvailableTerms />
			<UpcomingMaturities />
			<HowItWorks />
		</>
	);
}
