import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faShieldAlt, faSync, faCogs } from '@fortawesome/free-solid-svg-icons';
import StatsCard from '@/components/ui/StatsCard';
import type { StablecoinModule } from '@/hooks/useModulesData';

const features = [
	{
		icon: faClock,
		title: 'Expiration-Based Proposals',
		description: 'Time-locked governance system allowing careful review before changes take effect.',
	},
	{
		icon: faShieldAlt,
		title: 'Secure Timelock',
		description: 'Review and revoke proposals during the timelock phase for enhanced security.',
	},
	{
		icon: faSync,
		title: 'Dynamic Management',
		description: 'Seamlessly add, update, or remove protocol adapters through governance.',
	},
	{
		icon: faCogs,
		title: 'Modular Architecture',
		description: 'Flexible adapter system enabling integration with various DeFi protocols.',
	},
];

interface ModulesOverviewProps {
	allModules: StablecoinModule[];
	activeModules: StablecoinModule[];
	getModuleStatus: (module: StablecoinModule) => { status: string };
}

export default function ModulesOverview({ allModules, activeModules, getModuleStatus }: ModulesOverviewProps) {
	return (
		<section className="py-20 bg-usdu-card">
			<div className="container mx-auto px-4">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="text-center mb-16"
				>
					<h2 className="text-4xl md:text-5xl font-bold text-usdu-black mb-6">Modules & Adapters</h2>
					<p className="text-xl text-text-secondary max-w-3xl mx-auto">
						Manage protocol modules using expiration-based proposals. Review and revoke them during the
						timelock phase, or apply the changes after the timelock period ends.
					</p>
				</motion.div>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
					{features.map((feature, index) => (
						<motion.div
							key={feature.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: index * 0.1 }}
							viewport={{ once: true }}
							className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface hover:shadow-lg transition-shadow"
						>
							<div className="w-12 h-12 bg-usdu-black rounded-lg flex items-center justify-center mb-4">
								<FontAwesomeIcon icon={feature.icon} className="w-6 h-6 text-usdu-card" />
							</div>
							<h3 className="text-lg font-semibold text-usdu-black mb-3">{feature.title}</h3>
							<p className="text-text-secondary text-sm leading-relaxed">{feature.description}</p>
						</motion.div>
					))}
				</div>

				{/* Key Stats */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					viewport={{ once: true }}
					className="mt-16"
				>
					<StatsCard
						stats={[
							{
								value: allModules.length,
								label: 'Total Modules',
								color: 'text-usdu-card',
							},
							{
								value: activeModules.length,
								label: 'Active Modules',
								color: 'text-green-400',
							},
							{
								value: allModules.filter((m) => getModuleStatus(m).status === 'pending').length,
								label: 'Pending Proposals',
								color: 'text-yellow-400',
							},
							{
								value: allModules.filter((m) => m.isExpired).length,
								label: 'Expired Modules',
								color: 'text-gray-400',
							},
						]}
					/>
				</motion.div>
			</div>
		</section>
	);
}
