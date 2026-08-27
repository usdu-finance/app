import { formatUnits } from 'viem';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faDroplet,
	faScaleBalanced,
	faLayerGroup,
	faGaugeHigh,
	faPlus,
	faMinus,
	faRoute,
	faBalanceScale,
	faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import { usePoolModules } from '@/hooks/usePoolModules';
import { PageHeader } from '@/components/ui/layout';
import { StatGrid } from '@/components/ui/stats';
import { ButtonInput } from '@/components/ui/input';
import { DetailRow } from '@/components/ui/modal';
import AddressLink from '@/components/ui/AddressLink';
import NotFound from '@/components/ui/NotFound';
import { formatCompactNumber } from '@/lib/utils';

export default function LiquidityDetailPage() {
	const router = useRouter();
	const keyParam = typeof router.query.key === 'string' ? router.query.key : undefined;

	const { modules, isLoading, error } = usePoolModules();
	const selectedPool = modules.find((m) => m.key === keyParam);

	if (!router.isReady || isLoading) {
		return (
			<div className="space-y-8">
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-text-secondary">Loading liquidity pools...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-8">
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-red-500">Error: {error}</p>
					</div>
				</div>
			</div>
		);
	}

	if (!selectedPool) {
		return (
			<NotFound
				title="Pool Not Found"
				description="This liquidity pool doesn't exist or isn't available."
				ctaLabel="Back to Liquidity"
				ctaHref="/dashboard/liquidity"
			/>
		);
	}

	const canProvideWithAdapter = selectedPool.usduRatio < 0.5;
	const canRemoveWithAdapter = selectedPool.usduRatio >= 0.5 && selectedPool.adapterLPRatio > 0;
	const adapterRecommended = canProvideWithAdapter || canRemoveWithAdapter;
	const recommendation = canProvideWithAdapter
		? 'Use the Protocol Adapter for better balance and pricing.'
		: canRemoveWithAdapter
			? 'Use the Protocol Adapter for a profitable removal.'
			: 'Direct pool interaction available.';

	return (
		<div className="space-y-8">
			<PageHeader
				title={selectedPool.label}
				description="Provide or remove liquidity directly on the Curve pool, or route through the protocol adapter when it offers better pricing."
				breadcrumbs={[{ label: 'Liquidity', href: '/dashboard/liquidity' }, { label: selectedPool.label }]}
			/>

			<StatGrid
				columns={{ base: 1, sm: 2, lg: 4 }}
				stats={[
					{
						icon: faDroplet,
						label: 'Total Value Locked',
						value: formatCompactNumber(selectedPool.totalValue, 1, '', ' USDU'),
					},
					{
						icon: faScaleBalanced,
						label: 'USDC / USDU',
						value: `${(selectedPool.usdcRatio * 100).toFixed(1)}% / ${(selectedPool.usduRatio * 100).toFixed(1)}%`,
					},
					{
						icon: faLayerGroup,
						label: 'LP Supply',
						value: formatCompactNumber(formatUnits(selectedPool.totalSupply, 18), 1, '', ' LP'),
					},
					{
						icon: faGaugeHigh,
						label: 'Adapter LP Holdings',
						value: formatCompactNumber(formatUnits(selectedPool.adapterLPBalance, 18), 1, '', ' LP'),
					},
				]}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Direct Pool Route */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="flex items-center space-x-3 mb-4">
						<FontAwesomeIcon icon={faRoute} className="w-6 h-6 text-usdu-orange" />
						<h3 className="text-lg font-bold text-usdu-black">Direct Pool</h3>
					</div>

					<p className="text-text-secondary mb-4">
						Interact directly with the Curve pool using standard add/remove liquidity functions.
					</p>

					<div className="space-y-3 mb-6">
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Route Type</span>
							<span className="text-sm font-medium">Standard Curve</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Gas Cost</span>
							<span className="text-sm font-medium">Lower</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Price Impact</span>
							<span className="text-sm font-medium">Standard</span>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<ButtonInput label="Add Liquidity" icon={<FontAwesomeIcon icon={faPlus} className="w-4 h-4" />} />
						<ButtonInput label="Remove" variant="error" icon={<FontAwesomeIcon icon={faMinus} className="w-4 h-4" />} />
					</div>
				</div>

				{/* Protocol Adapter Route */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="flex items-center space-x-3 mb-4">
						<FontAwesomeIcon icon={faBalanceScale} className="w-6 h-6 text-usdu-orange" />
						<h3 className="text-lg font-bold text-usdu-black">Protocol Adapter</h3>
						{adapterRecommended && (
							<span className="bg-usdu-orange/10 text-usdu-orange px-2 py-1 rounded text-xs font-medium">
								Recommended
							</span>
						)}
					</div>

					<p className="text-text-secondary mb-4">
						Use the protocol adapter to mint USDU and balance the pool for better pricing.
					</p>

					<div className="space-y-3 mb-6">
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Route Type</span>
							<span className="text-sm font-medium">Protocol Adapter</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Gas Cost</span>
							<span className="text-sm font-medium">Higher</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Price Impact</span>
							<span className="text-sm font-medium text-green-600">Better</span>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<ButtonInput label="Add (USDC)" icon={<FontAwesomeIcon icon={faPlus} className="w-4 h-4" />} />
						<ButtonInput label="Not Available" disabled icon={<FontAwesomeIcon icon={faMinus} className="w-4 h-4" />} />
					</div>

					<div className="mt-3 p-3 bg-white rounded-lg">
						<p className="text-xs text-text-secondary">
							<FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3 mr-1" />
							Adapter only supports adding USDC liquidity when the pool is imbalanced.
						</p>
					</div>
				</div>
			</div>

			{/* Details */}
			<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
				<h3 className="font-semibold text-usdu-black text-lg mb-3">Details</h3>

				<DetailRow label="Recommendation" value={recommendation} />
				<DetailRow label="Pool Imbalance" value={selectedPool.poolImbalance ? 'USDU > 50%' : 'Balanced'} />

				<h3 className="font-semibold text-usdu-black text-lg mt-10 mb-3">Addresses</h3>

				<DetailRow label="Curve Pool">
					<AddressLink address={selectedPool.poolAddress} />
				</DetailRow>
				<DetailRow label="Protocol Adapter">
					<AddressLink address={selectedPool.adapterAddress} />
				</DetailRow>
			</div>
		</div>
	);
}
