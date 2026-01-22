import React from 'react';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';
import TransparencyOverview from '@/components/sections/transparency/TransparencyOverview';
import RealTimeMetrics from '@/components/sections/transparency/RealTimeMetrics';
import AuditReports from '@/components/sections/transparency/AuditReports';
import GovernanceTransparency from '@/components/sections/transparency/GovernanceTransparency';
import RiskControls from '@/components/sections/transparency/RiskControls';

export default function TransparencyPage() {
	return (
		<>
			<NextSeo
				title={SEO.transparency.title}
				description={SEO.transparency.description}
				openGraph={SEO.transparency.openGraph}
			/>

			<TransparencyOverview />
			<RealTimeMetrics />
			<AuditReports />
			<GovernanceTransparency />
			<RiskControls />
		</>
	);
}
