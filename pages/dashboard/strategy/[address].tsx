import { useRouter } from 'next/router';
import { faLayerGroup, faGaugeHigh, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { PageHeader } from '@/components/ui/layout';
import { StatGrid } from '@/components/ui/stats';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import NotFound from '@/components/ui/NotFound';

interface StrategyItem {
	key: string;
	name: string;
	vaultAddress: `0x${string}`;
	tvl: bigint;
	apyPPM: number;
}

// Placeholder — replace with a hook once strategy vaults are exposed on-chain.
const STRATEGIES: StrategyItem[] = [];

export default function StrategyDetailPage() {
	const router = useRouter();
	const key = typeof router.query.address === 'string' ? router.query.address : undefined;

	const selectedStrategy = STRATEGIES.find((s) => s.key === key);

	if (!router.isReady) return null;

	if (!selectedStrategy) {
		return (
			<NotFound
				title="Strategy Not Found"
				description="This strategy vault doesn't exist or isn't available."
				ctaLabel="Back to Strategy"
				ctaHref="/dashboard/strategy"
			/>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader
				title={selectedStrategy.name}
				description="Details on this strategy vault, including total value locked, yield, and the underlying vault address."
				breadcrumbs={[{ label: 'Strategy', href: '/dashboard/strategy' }, { label: selectedStrategy.name }]}
			/>

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 3 }}
				stats={[
					{ icon: faLayerGroup, label: 'TVL', value: selectedStrategy.tvl.toString() },
					{ icon: faChartLine, label: 'APY', value: `${(selectedStrategy.apyPPM / 10_000).toFixed(2)}%` },
					{ icon: faGaugeHigh, label: 'Utilization', value: '—' },
				]}
			/>

			<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
				<h3 className="font-semibold text-usdu-black text-lg mb-3">Addresses</h3>

				<DetailRow label="Strategy Vault">
					<AddressLink address={selectedStrategy.vaultAddress} />
				</DetailRow>
			</div>
		</div>
	);
}
