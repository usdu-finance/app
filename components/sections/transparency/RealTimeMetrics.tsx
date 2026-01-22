import React from 'react';
import { motion } from 'framer-motion';
import { useModulesFinancials } from '@/hooks/useModulesFinancials';
import { useCuratorBalances } from '@/hooks/useCuratorBalances';
import { usePoolData } from '@/hooks/usePoolData';
import { formatCompactNumber, formatValue } from '@/lib/utils';

const riskMetrics = [
	{
		label: 'Total Assets',
		value: '$12.5M',
		change: '+2.1%',
		status: 'stable',
	},
	{
		label: 'Total Liabilities',
		value: '$12.5M',
		change: '+2.1%',
		status: 'stable',
	},
	{
		label: 'Collateralization Ratio',
		value: '125%',
		change: '+0.8%',
		status: 'healthy',
	},
	{
		label: 'Reserve Coverage',
		value: '110%',
		change: '+1.2%',
		status: 'adequate',
	},
	{
		label: 'Liquidity Buffer',
		value: '15%',
		change: '-0.3%',
		status: 'strong',
	},
	{ label: 'Active Borrowers', value: '47', change: '+5', status: 'growing' },
	{
		label: 'Average Loan Size',
		value: '$265K',
		change: '+12%',
		status: 'stable',
	},
];

type RiskMetric = {
	label: string;
	value: string;
};

export default function RealTimeMetrics() {
	const { totalAssets, totalMinted, isLoading: moduleIsLoading, error: moduleError } = useModulesFinancials();
	const { totalValue } = usePoolData();
	const { totalBalance, isLoading: curatorIsLoading, error: curatorError } = useCuratorBalances();

	const isLoading = moduleIsLoading || curatorIsLoading;

	const isProfitable: boolean = totalAssets >= totalMinted;
	const unrealizedRevenue = isProfitable ? totalAssets - totalMinted : 0;
	const collateralization = ((totalAssets + totalBalance) / totalMinted) * 100;
	const liquidityRatio = ((totalValue || 0) / totalMinted) * 100;

	const riskMetrics: RiskMetric[] = [
		{
			label: 'Total Assets',
			value: isLoading ? '...' : formatCompactNumber(totalAssets, 3),
		},
		{
			label: 'Total Liabilities',
			value: isLoading ? '...' : formatCompactNumber(totalMinted, 3),
		},
		{
			label: 'Collateralization',
			value: isLoading ? '...' : formatCompactNumber(collateralization, 3, '', '%'),
		},
		{
			label: 'DEX Depth Ratio',
			value: isLoading ? '...' : formatCompactNumber(liquidityRatio, 3, '', '%'),
		},
		{
			label: 'Protocol Buffer',
			value: isLoading ? '...' : formatCompactNumber(unrealizedRevenue, 3),
		},
		{
			label: 'Protocol Balance',
			value: isLoading ? '...' : formatCompactNumber(totalBalance, 3),
		},
	];

	return (
		<section className="relative px-4 md:px-8 lg:px-16 py-16 bg-usdu-bg">
			<div className="">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="text-center mb-12"
				>
					<h2 className="text-3xl font-bold text-usdu-black mb-4">Real-Time Protocol Metrics</h2>
					<p className="text-lg text-text-secondary max-w-3xl mx-auto">
						Live monitoring of important protocol indicators and risk metrics.
					</p>
				</motion.div>

				<div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
					{riskMetrics.map((metric, index) => (
						<motion.div
							key={metric.label}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.6,
								delay: index * 0.1,
							}}
							viewport={{ once: true }}
							className="bg-usdu-card p-6 rounded-xl border border-usdu-surface"
						>
							<div className="text-2xl font-bold text-usdu-orange mb-2">{metric.value}</div>
							<div className="text-sm font-medium text-usdu-black mb-2">{metric.label}</div>
							<div className="flex items-center gap-2">
								{/* <span
									className={`text-sm ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}
								>
									{metric.change}
								</span>
								<span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
									{metric.status}
								</span> */}
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
