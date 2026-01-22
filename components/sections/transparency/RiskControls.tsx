import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faEye, faLock } from '@fortawesome/free-solid-svg-icons';

const controls = [
	{
		icon: faShieldAlt,
		title: 'Multi-Signature Security',
		description:
			'Critical operations require multiple signatures with time-delay mechanisms for enhanced security.',
	},
	{
		icon: faEye,
		title: 'Continuous Monitoring',
		description: 'Real-time monitoring of collateral ratios, liquidity levels, and market conditions.',
	},
	{
		icon: faLock,
		title: 'Emergency Controls',
		description:
			'Automated circuit breakers and emergency pause functions to protect against extreme events.',
	},
];

export default function RiskControls() {
	return (
		<section className="relative px-4 md:px-8 lg:px-16 py-16 bg-usdu-card">
			<div className="">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="text-center mb-12"
				>
					<h2 className="text-3xl font-bold text-usdu-black mb-4">Risk Management Framework</h2>
					<p className="text-lg text-text-secondary max-w-3xl mx-auto">
						Comprehensive risk controls and monitoring systems ensure protocol stability and safety.
					</p>
				</motion.div>

				<div className="grid md:grid-cols-3 gap-8">
					{controls.map((control, index) => (
						<motion.div
							key={control.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.6,
								delay: index * 0.1,
							}}
							viewport={{ once: true }}
							className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface text-center"
						>
							<div className="w-16 h-16 bg-usdu-orange/10 rounded-full flex items-center justify-center mx-auto mb-6">
								<FontAwesomeIcon icon={control.icon} className="w-8 h-8 text-usdu-orange" />
							</div>
							<h3 className="text-lg font-bold text-usdu-black mb-4">{control.title}</h3>
							<p className="text-text-secondary text-sm leading-relaxed">{control.description}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
