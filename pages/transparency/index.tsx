import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import TransparencyShell from '@/components/sections/transparency/TransparencyShell';
import { SEO } from '@/lib/constants';
import { PillTabs } from '@/components/ui/input';
import { useQueryTab } from '@/hooks/ui/useQueryTab';

// canvas + ResizeObserver only exist in the browser
const GodEye = dynamic(() => import('@/components/pages/godeye/GodEye'), { ssr: false });
const DaoFinances = dynamic(() => import('@/components/pages/godeye/DaoFinances'), { ssr: false });

const TABS = ['God Eye', 'DAO Finances'] as const;

export default function TransparencyPage() {
	const [tab, setTab] = useQueryTab(TABS);

	return (
		<>
			<NextSeo title={SEO.transparency.title} description={SEO.transparency.description} openGraph={SEO.transparency.openGraph} />
			<TransparencyShell
				controls={<PillTabs value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t, label: t }))} />}
				below={tab === 'DAO Finances' ? <DaoFinances /> : undefined}
			>
				{tab === 'God Eye' && <GodEye />}
			</TransparencyShell>
		</>
	);
}
