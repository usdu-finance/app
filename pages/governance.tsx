import React from 'react';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';
import GovernanceOverview from '@/components/sections/governance/GovernanceOverview';
import DaoStructure from '@/components/sections/governance/DaoStructure';
import ModuleFlow from '@/components/sections/governance/ModuleFlow';
import VotingSystem from '@/components/sections/governance/VotingSystem';

export default function GovernancePage() {
	return (
		<>
			<NextSeo
				title={SEO.governance.title}
				description={SEO.governance.description}
				openGraph={SEO.governance.openGraph}
			/>

			<GovernanceOverview />
			<DaoStructure />
			<ModuleFlow />
			<VotingSystem />
		</>
	);
}
