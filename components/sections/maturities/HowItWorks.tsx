import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faChartLine, faCoins } from '@fortawesome/free-solid-svg-icons';

const steps = [
	{
		step: '1',
		title: 'Select Term',
		description: 'Choose your preferred funding duration and review the fixed APY rate for your term.',
		icon: faCalendarAlt,
	},
	{
		step: '2',
		title: 'Lock Funds',
		description: 'Deposit your collateral and receive USDU tokens at the agreed fixed rate.',
		icon: faCoins,
	},
	{
		step: '3',
		title: 'Earn & Redeem',
		description:
			'Earn fixed returns throughout the term and redeem your principal plus interest at maturity.',
		icon: faChartLine,
	},
];

export default function HowItWorks() {
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
					<h2 className="text-3xl font-bold text-usdu-black mb-4">How Fixed-Term Funding Works</h2>
					<p className="text-lg text-text-secondary max-w-3xl mx-auto">
						Simple, transparent fixed-rate funding with institutional-grade security and compliance.
					</p>
				</motion.div>

				<div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
					{steps.map((step, index) => (
						<motion.div
							key={step.step}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: index * 0.2 }}
							viewport={{ once: true }}
							className="text-center"
						>
							<div className="w-16 h-16 bg-usdu-orange/10 rounded-full flex items-center justify-center mx-auto mb-6">
								<FontAwesomeIcon icon={step.icon} className="w-8 h-8 text-usdu-orange" />
							</div>
							<h3 className="text-xl font-bold text-usdu-black mb-4">{step.title}</h3>
							<p className="text-text-secondary leading-relaxed">{step.description}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
