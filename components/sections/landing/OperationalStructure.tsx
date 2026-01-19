import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const operationalItems = [
	{
		title: 'ISSUANCE',
		description: 'USDU is issued only by the protocol through DAO-approved adapters.',
		image: '/assets/issuance-icon-300x300.png',
	},
	{
		title: 'BACKING',
		description: 'Each adapter holds vault assets or liquidity as direct on-chain backing.',
		image: '/assets/backing-icon-300x300.png',
	},
	{
		title: 'LIQUIDITY',
		description: 'USDU is traded and converted via the USDC/USDU pool and approved lending venues.',
		image: '/assets/liquidity-icon-300x300.png',
	},
];

export default function OperationalStructure() {
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
					<h2 className="text-4xl md:text-5xl font-bold text-usdu-black mb-6">Operational Structure</h2>
					<p className="text-xl text-text-secondary max-w-3xl mx-auto">
						USDU operates through a modular adapter system that separates issuance, collateral custody, and
						liquidity management.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					viewport={{ once: true }}
				>
					<div className="grid lg:grid-cols-2 gap-12 items-start max-w-7xl mx-auto">
						{/* Left Column - Three Operational Items */}
						<div className="space-y-8">
							{operationalItems.map((item, index) => (
								<motion.div
									key={item.title}
									initial={{ opacity: 0, x: -30 }}
									whileInView={{ opacity: 1, x: 0 }}
									transition={{
										duration: 0.6,
										delay: index * 0.2,
									}}
									viewport={{ once: true }}
									className="flex items-start gap-6 bg-usdu-bg p-6 rounded-xl hover:shadow-lg border border-usdu-surface"
								>
									{/* Icon */}
									<div className="flex-shrink-0">
										<Image
											src={item.image}
											alt={item.title}
											width={64}
											height={64}
											className="w-full h-full rounded-xl"
										/>
									</div>

									{/* Content */}
									<div className="flex-1">
										<h4 className="text-xl font-bold text-usdu-black mb-3">{item.title}</h4>
										<p className="text-text-secondary leading-relaxed">{item.description}</p>
									</div>
								</motion.div>
							))}
						</div>

						{/* Right Column - Adapter System Overview */}
						<motion.div
							initial={{ opacity: 0, x: 30 }}
							whileInView={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							viewport={{ once: true }}
							className="lg:sticky lg:top-8"
						>
							<div className="p-8 pt-0 rounded-2xl">
								<div className="text-center mb-6">
									<h4 className="text-xl font-bold text-usdu-black mb-2">Adapter System Overview</h4>
									<p className="text-text-secondary text-sm">
										Modular architecture ensuring scalability and security
									</p>
								</div>
								<div className="relative">
									<Image
										src="/assets/adapter-system-graphic-all-adapters-1536x1136.png"
										alt="USDU Adapter System Overview"
										width={600}
										height={450}
										className="w-full h-auto object-contain rounded-lg"
									/>
								</div>
							</div>
						</motion.div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
