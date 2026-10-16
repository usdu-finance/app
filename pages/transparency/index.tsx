import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes, faLayerGroup, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';
import HeroSteps from '@/components/ui/HeroSteps';
import { SEO } from '@/lib/constants';

// canvas + ResizeObserver only exist in the browser
const GodEyeView = dynamic(() => import('@/components/pages/godeye/GodEyeView'), { ssr: false });

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faShareNodes} className="w-3 h-3 text-usdu-card" />,
		title: 'Tokens flow between addresses',
		description:
			'Every dot is an address and every line a flow of the selected stablecoin, indexed from the full on-chain transfer history of USDU, EURU and CHFU.',
	},
	{
		icon: <FontAwesomeIcon icon={faLayerGroup} className="w-3 h-3 text-usdu-card" />,
		title: 'Nodes are grouped by category',
		description:
			'Minters, modules, DEX pools, savings vaults and wallets share a colour, so you can see where the supply sits and how it moves between them.',
	},
	{
		icon: <FontAwesomeIcon icon={faClockRotateLeft} className="w-3 h-3 text-usdu-card" />,
		title: 'Click a node or press play',
		description:
			'Open any address for its balance, counterparties and day-by-day timeline, or replay the whole history with the time travel controls.',
	},
];

export default function TransparencyPage() {
	return (
		<>
			<NextSeo title={SEO.transparency.title} description={SEO.transparency.description} openGraph={SEO.transparency.openGraph} />

			<div className="px-4 md:px-8 lg:px-16 pt-32 pb-24 bg-usdu-card min-h-screen space-y-8">
				<div className="text-center">
					<h1 className="text-4xl md:text-5xl font-bold text-usdu-black mb-4">Transparency</h1>
					<p className="text-lg text-text-secondary max-w-3xl mx-auto">
						GodEye follows every USDU, EURU and CHFU transfer on-chain. See who holds the supply, which modules and pools move
						it, and replay how it got there.
					</p>
				</div>

				<HeroSteps steps={STEPS} />

				<div className="relative h-[calc(100vh-8rem)] min-h-[680px] rounded-lg border border-usdu-surface overflow-hidden text-usdu-black">
					<GodEyeView />
				</div>
			</div>
		</>
	);
}
