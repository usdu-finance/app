import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/ui/Button';

const governanceMetrics = [
	{ label: 'Total Proposals', value: '23' },
	{ label: 'Active Voters', value: '156' },
	{ label: 'Participation Rate', value: '67%' },
	{ label: 'Treasury Balance', value: '$2.1M' },
];

export default function GovernanceTransparency() {
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
					<h2 className="text-3xl font-bold text-usdu-black mb-4">Governance Transparency</h2>
					<p className="text-lg text-text-secondary max-w-3xl mx-auto">
						Decentralized governance ensures transparent decision-making for all protocol parameters.
					</p>
				</motion.div>

				<div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
					<motion.div
						initial={{ opacity: 0, x: -30 }}
						whileInView={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="bg-usdu-card p-8 rounded-xl border border-usdu-surface"
					>
						<h3 className="text-xl font-bold text-usdu-black mb-6">DAO Metrics</h3>
						<div className="grid grid-cols-2 gap-4">
							{governanceMetrics.map((metric) => (
								<div key={metric.label} className="text-center">
									<div className="text-2xl font-bold text-usdu-orange mb-1">{metric.value}</div>
									<div className="text-sm text-text-secondary">{metric.label}</div>
								</div>
							))}
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, x: 30 }}
						whileInView={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="bg-usdu-card p-8 rounded-xl border border-usdu-surface"
					>
						<h3 className="text-xl font-bold text-usdu-black mb-4">Recent Proposals</h3>
						<div className="space-y-4">
							<div className="border-b border-usdu-surface pb-3">
								<div className="text-sm font-medium text-usdu-black">Adjust Collateral Ratio</div>
								<div className="text-xs text-text-secondary">Passed • 89% approval</div>
							</div>
							<div className="border-b border-usdu-surface pb-3">
								<div className="text-sm font-medium text-usdu-black">Treasury Reallocation</div>
								<div className="text-xs text-text-secondary">Active • 67% approval</div>
							</div>
							<div>
								<div className="text-sm font-medium text-usdu-black">Risk Parameter Update</div>
								<div className="text-xs text-text-secondary">Draft • Under review</div>
							</div>
						</div>
					</motion.div>
				</div>

				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
					viewport={{ once: true }}
					className="text-center"
				>
					<Button
						href="https://aragon.usdu.finance"
						target="_blank"
						size="lg"
						icon={<FontAwesomeIcon icon={faUsers} className="w-4 h-4" />}
					>
						Participate in Governance
					</Button>
				</motion.div>
			</div>
		</section>
	);
}
