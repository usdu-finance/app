import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import TransparencyShell from '@/components/sections/transparency/TransparencyShell';
import { SEO } from '@/lib/constants';
import { PillTabs, CurrencyTabs } from '@/components/ui/input';
import { useQueryTab } from '@/hooks/ui/useQueryTab';
import { useCurrencyFilter } from '@/hooks/ui/useCurrencyFilter';

// canvas + ResizeObserver only exist in the browser
const GodEye = dynamic(() => import('@/components/pages/godeye/GodEye'), { ssr: false });
const DaoFinances = dynamic(() => import('@/components/pages/godeye/DaoFinances'), { ssr: false });

const TABS = ['God Eye', 'DAO Finances'] as const;

export default function TransparencyPage() {
	const [tab, setTab] = useQueryTab(TABS);
	const { currency, setCurrency, currencies } = useCurrencyFilter();

	return (
		<>
			<NextSeo title={SEO.transparency.title} description={SEO.transparency.description} openGraph={SEO.transparency.openGraph} />
			<TransparencyShell
				controls={
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<PillTabs value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t, label: t }))} />
						{/* the God Eye map has its own stablecoin selector */}
						{tab === 'DAO Finances' && <CurrencyTabs currencies={currencies} value={currency} onChange={setCurrency} />}
					</div>
				}
				below={tab === 'DAO Finances' ? <DaoFinances currency={currency} /> : undefined}
			>
				{tab === 'God Eye' && <GodEye />}
			</TransparencyShell>
		</>
	);
}
