import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt, faEye, faChartLine, faLock, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { SOCIAL } from '@/lib/constants';
import Link from 'next/link';

const transparencyFeatures = [
	{
		icon: faEye,
		title: 'Real-Time Monitoring',
		description: 'Live dashboard tracking collateralization ratios, reserve levels, and protocol health metrics.',
	},
	{
		icon: faShieldAlt,
		title: 'Multi-Signature Security',
		description: 'Critical protocol operations require multi-party authorization with time-delay mechanisms.',
	},
	{
		icon: faChartLine,
		title: 'Risk Assessment',
		description: 'Comprehensive risk models with stress testing and scenario analysis for all protocol positions.',
	},
	{
		icon: faLock,
		title: 'Reserve Auditing',
		description: 'Regular third-party audits of reserve holdings with publicly verifiable proof of reserves.',
	},
];

const riskMetrics = [
	{ label: 'Collateralization Ratio', value: '125%', status: 'Healthy' },
	{ label: 'Reserve Coverage', value: '110%', status: 'Adequate' },
	{ label: 'Liquidity Buffer', value: '15%', status: 'Strong' },
	{ label: 'Risk Score', value: '2.1/10', status: 'Low Risk' },
];

export default function TransparencyRisk() {
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
					<h2 className="text-4xl md:text-5xl font-bold text-usdu-black mb-6">
						Transparency & Risk Controls
					</h2>
					<p className="text-xl text-text-secondary max-w-3xl mx-auto">
						Built on principles of transparency and risk management, USDU provides institutional-grade
						visibility into protocol operations and comprehensive risk controls.
					</p>
				</motion.div>

				{/* Transparency Features */}
				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
					{transparencyFeatures.map((feature, index) => (
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

				{/* Risk Metrics Dashboard */}
				{/* <motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
					viewport={{ once: true }}
					className="bg-gradient-to-r from-usdu-orange/5 to-usdu-orange/10 rounded-2xl p-8 mb-16">
					<div className="text-center mb-8">
						<h3 className="text-2xl font-bold text-usdu-black mb-2">
							Live Risk Metrics
						</h3>
						<p className="text-text-secondary">
							Real-time protocol health indicators
						</p>
					</div>

					<div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
						{riskMetrics.map((metric) => (
							<div key={metric.label} className="text-center">
								<div className="text-2xl font-bold text-usdu-orange mb-2">
									{metric.value}
								</div>
								<div className="text-sm font-medium text-usdu-black mb-1">
									{metric.label}
								</div>
								<div className="inline-flex items-center gap-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
									<div className="w-2 h-2 bg-green-500 rounded-full" />
									{metric.status}
								</div>
							</div>
						))}
					</div>
				</motion.div> */}

				{/* Governance & Compliance */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					viewport={{ once: true }}
					className="grid md:grid-cols-2 gap-8"
				>
					<div className="bg-usdu-bg p-8 rounded-xl hover:shadow-lg border border-usdu-surface">
						<h3 className="text-xl font-bold text-usdu-black mb-4">Governance Framework</h3>
						<p className="text-text-secondary mb-6">
							Decentralized governance through DAO voting ensures transparent decision-making for protocol
							parameters, risk limits, and strategic direction.
						</p>
						<a
							href={SOCIAL.Aragon}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 text-usdu-orange hover:text-opacity-80 font-medium"
						>
							View DAO Dashboard
							<FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3" />
						</a>
					</div>

					<div className="bg-usdu-bg p-8 rounded-xl hover:shadow-lg border border-usdu-surface">
						<h3 className="text-xl font-bold text-usdu-black mb-4">Regulatory Compliance</h3>
						<p className="text-text-secondary mb-6">
							Built with institutional compliance requirements in mind, including KYC/AML procedures,
							regulatory reporting, and jurisdiction-specific controls.
						</p>
						<Link
							href="/transparency"
							className="inline-flex items-center gap-2 text-usdu-orange hover:text-opacity-80 font-medium"
						>
							View Compliance Reports
							<FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3" />
						</Link>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
