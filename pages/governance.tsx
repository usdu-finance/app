import React from 'react';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';
import { PillTabs } from '@/components/ui/input';
import { useQueryTab } from '@/hooks/ui/useQueryTab';
import GovernanceOverview from '@/components/sections/governance/GovernanceOverview';
import DaoStructure from '@/components/sections/governance/DaoStructure';
import ModuleFlow from '@/components/sections/governance/ModuleFlow';
import VotingSystem from '@/components/sections/governance/VotingSystem';

const TABS = ['DAO Structure', 'Module Flow', 'Voting System'] as const;

export default function GovernancePage() {
	const [tab, setTab] = useQueryTab(TABS);

	return (
		<>
			<NextSeo title={SEO.governance.title} description={SEO.governance.description} openGraph={SEO.governance.openGraph} />

			<GovernanceOverview />

			<div className="px-4 md:px-8 lg:px-16 pb-8 bg-usdu-card">
				<PillTabs value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t, label: t }))} />
			</div>

			<div className="min-h-[50vh] bg-usdu-bg">
				{tab === 'DAO Structure' && <DaoStructure />}
				{tab === 'Module Flow' && <ModuleFlow />}
				{tab === 'Voting System' && <VotingSystem />}
			</div>
		</>
	);
}
