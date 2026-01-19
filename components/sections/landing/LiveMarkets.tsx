import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

const marketsAndIntegrations = [
	{
		title: 'TermMax Fixed-Term',
		description: 'Fixed-maturity lending venue for predictable USDU borrowing.',
		url: 'https://app.termmax.ts.finance/borrow?search=usdu',
		logo: '/assets/termmax-icon-150x150.png',
		buttonText: 'Borrow',
	},
	{
		title: 'Morpho Markets',
		description: 'On-chain money markets for dynamic USDU borrowing.',
		url: 'https://app.morpho.org/ethereum/vault/0xcE22b5Fb17ccbc0C5d87DC2e0dF47DD71E3AdC0a/usdu-core',
		logo: '/assets/morpho-market-icon-150x150.png',
		buttonText: 'View Markets',
	},
	{
		title: 'Provide Liquidity',
		description: 'Primary liquidity pool for USDU conversion and market depth.',
		url: 'https://www.curve.finance/dex/ethereum/pools/factory-stable-ng-596/deposit',
		logo: '/assets/curve-icon-150x150.png',
		buttonText: 'Provide LP',
		darkCard: true,
	},
	{
		title: 'Curve Liquidity Layer',
		description: 'Primary on-chain liquidity venue for USDU ↔ USDC conversion.',
		url: 'https://www.curve.finance/dex/ethereum/pools/factory-stable-ng-596/swap',
		logo: '/assets/curve-icon-150x150.png',
		buttonText: 'Swap',
	},
];

export default function LiveMarkets() {
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
					<h2 className="text-4xl md:text-5xl font-bold text-usdu-black mb-6">
						Live Markets & Integration Layer
					</h2>
					<p className="text-xl text-text-secondary max-w-3xl mx-auto">
						USDU is actively deployed across supervised lending and liquidity venues, with access governed
						by DAO risk curation and approved collateral frameworks.
					</p>
				</motion.div>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
					{marketsAndIntegrations.map((market, index) => (
						<motion.div
							key={market.title}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.6,
								delay: index * 0.1,
							}}
							viewport={{ once: true }}
							className={`p-6 rounded-xl border hover:shadow-lg transition-shadow group text-center flex flex-col h-full ${
								market.darkCard ? 'bg-usdu-black border-gray-700' : 'bg-usdu-card border-usdu-surface'
							}`}
						>
							{/* Logo */}
							<div className="mb-6">
								<div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto p-2">
									<Image
										src={market.logo}
										alt={market.title}
										width={64}
										height={64}
										className="w-full h-full object-contain"
									/>
								</div>
							</div>

							{/* Content */}
							<h4
								className={`text-lg font-bold mb-3 transition-colors ${
									market.darkCard ? 'text-white' : 'text-usdu-black'
								}`}
							>
								{market.title}
							</h4>
							<p
								className={`text-sm leading-relaxed flex-grow ${
									market.darkCard ? 'text-gray-300' : 'text-text-secondary'
								}`}
							>
								{market.description}
							</p>

							{/* Button */}
							<div className="mt-6">
								<a
									href={market.url}
									target={market.url.startsWith('http') ? '_blank' : '_self'}
									rel={market.url.startsWith('http') ? 'noopener noreferrer' : undefined}
									className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
										market.darkCard
											? 'bg-usdu-orange text-white hover:bg-opacity-90'
											: 'bg-usdu-orange/10 text-usdu-orange hover:bg-usdu-orange hover:text-white'
									}`}
								>
									{market.buttonText}
									<FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3" />
								</a>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
