import Hero from '@/components/sections/landing/Hero';
import ProtocolOverview from '@/components/sections/landing/ProtocolOverview';
import PrimaryApplications from '@/components/sections/landing/PrimaryApplications';
import TransparencyRisk from '@/components/sections/landing/TransparencyRisk';
import UnderstandingProtocol from '@/components/sections/landing/UnderstandingProtocol';
import Contact from '@/components/sections/landing/Contact';
import OperationalStructure from '@/components/sections/landing/OperationalStructure';
import LiveMarkets from '@/components/sections/landing/LiveMarkets';

export default function HomePage() {
	return (
		<>
			<Hero />
			<ProtocolOverview />
			<PrimaryApplications />
			<TransparencyRisk />
			<UnderstandingProtocol />
			<OperationalStructure />
			<LiveMarkets />
			<Contact />
		</>
	);
}
