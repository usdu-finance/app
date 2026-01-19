import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUniversity, faChartBar, faHandshake, faGlobe } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

const applications = [
	{
		icon: faUniversity,
		title: 'Structured Finance',
		description:
			'Enable sophisticated structured finance products with stable, predictable funding costs for institutional borrowers.',
		features: ['Credit facilities', 'Asset-backed securities', 'Trade finance'],
	},
	{
		icon: faChartBar,
		title: 'Credit Markets',
		description:
			'Power on-chain credit markets with reliable liquidity infrastructure and transparent risk assessment.',
		features: ['Lending protocols', 'Credit scoring', 'Risk management'],
	},
	{
		icon: faHandshake,
		title: 'Real-World Assets',
		description:
			'Bridge traditional assets to DeFi with stable funding mechanisms for real-world asset tokenization.',
		features: ['Asset tokenization', 'Yield generation', 'Institutional custody'],
	},
	{
		icon: faGlobe,
		title: 'Cross-Border Payments',
		description:
			'Facilitate efficient cross-border transactions with minimal volatility risk and predictable settlement.',
		features: ['Global settlements', 'FX risk mitigation', 'Instant finality'],
	},
];

export default function PrimaryApplications() {
	return (
		<section className="py-20 bg-usdu-bg">
			<div className="container mx-auto px-4">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="text-center mb-16"
				>
					<h2 className="text-4xl md:text-5xl font-bold text-usdu-black mb-6">Primary Applications</h2>
					<p className="text-xl text-text-secondary max-w-3xl mx-auto">
						USDU serves as the foundational infrastructure for next-generation financial applications,
						providing stable funding for institutional-grade use cases.
					</p>
				</motion.div>

				<div className="grid md:grid-cols-2 gap-8">
					{applications.map((application, index) => (
						<motion.div
							key={application.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: index * 0.1 }}
							viewport={{ once: true }}
							className="bg-usdu-card p-8 rounded-xl border border-usdu-surface hover:shadow-lg transition-shadow group"
						>
							<div className="flex items-start gap-6">
								<div className="w-16 h-16 bg-usdu-black rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
									<FontAwesomeIcon icon={application.icon} className="w-8 h-8 text-usdu-card" />
								</div>
								<div className="flex-1">
									<h3 className="text-xl font-bold text-usdu-black mb-4">{application.title}</h3>
									<p className="text-text-secondary mb-6 leading-relaxed">
										{application.description}
									</p>

									{/* Features List */}
									<ul className="space-y-2">
										{application.features.map((feature) => (
											<li
												key={feature}
												className="flex items-center gap-3 text-sm text-text-secondary"
											>
												<div className="w-1.5 h-1.5 bg-usdu-black rounded-full flex-shrink-0" />
												{feature}
											</li>
										))}
									</ul>
								</div>
							</div>
						</motion.div>
					))}
				</div>

				{/* Call to Action */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					viewport={{ once: true }}
					className="text-center mt-16"
				>
					<div className="bg-usdu-black rounded-2xl p-8">
						<h3 className="text-2xl font-bold text-usdu-card mb-4">Ready to Build with USDU?</h3>
						<p className="text-usdu-card mb-6 max-w-2xl mx-auto">
							Explore how USDU can power your next-generation financial application with stable,
							predictable funding infrastructure.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								href="/dashboard"
								className="inline-flex items-center justify-center gap-2 bg-usdu-orange text-white px-6 py-3 rounded-xl hover:bg-opacity-90 transition-colors font-medium"
							>
								Launch App
							</Link>
							<Link
								href="/transparency"
								className="inline-flex items-center justify-center gap-2 border border-usdu-card text-usdu-card px-6 py-3 rounded-xl hover:bg-usdu-orange hover:text-white transition-colors font-medium"
							>
								View Documentation
							</Link>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
