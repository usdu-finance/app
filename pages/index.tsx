import Hero from '@/components/sections/landing/Hero';
import ProtocolOverview from '@/components/sections/landing/ProtocolOverview';
import PrimaryApplications from '@/components/sections/landing/PrimaryApplications';
import Pillars from '@/components/sections/landing/Pillars';
import UnderstandingProtocol from '@/components/sections/landing/UnderstandingProtocol';
import Contact from '@/components/sections/landing/Contact';
import OperationalStructure from '@/components/sections/landing/OperationalStructure';
import LiveMarkets from '@/components/sections/landing/LiveMarkets';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

export default function HomePage() {
	return (
		<>
			<NextSeo
				title={SEO.home.title}
				description={SEO.home.description}
				openGraph={SEO.home.openGraph}
				twitter={SEO.home.twitter}
			/>

			<Hero />
			<ProtocolOverview />
			<PrimaryApplications />
			<Pillars />
			<UnderstandingProtocol />
			<OperationalStructure />
			<LiveMarkets />
			<Contact />
		</>
	);
}
