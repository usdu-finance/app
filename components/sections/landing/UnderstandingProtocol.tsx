import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const aboutTabs = [
	{
		id: 'what-it-is',
		title: 'What USDU Is',
		content: {
			title: 'Protocol-Issued, Non-Algorithmic Stablecoin',
			description:
				'USDU is a protocol-issued stablecoin designed specifically for structured finance and credit markets, offering predictable funding costs without algorithmic complexity.',
			features: [
				'Protocol-issued with real asset backing',
				'Fixed-term funding at 4-6% rates',
				'Fully convertible to USDC on-chain',
				'Institutional-grade compliance and security',
			],
			image: '/assets/protocol-issue-coin-icon-768x651.png',
		},
	},
	{
		id: 'what-it-is-not',
		title: 'What USDU Is Not',
		content: {
			title: 'Built for Stability, Not Speculation',
			description:
				'Unlike algorithmic stablecoins, USDU avoids complex mechanisms that can fail during market stress, focusing instead on transparent, asset-backed stability.',
			features: [
				'Not algorithmically managed or controlled',
				'Not subject to depegging risks from market volatility',
				'Not dependent on complex arbitrage mechanisms',
				'Not designed for speculative trading',
			],
			image: '/assets/non-algo3-768x768.png',
		},
	},
	{
		id: 'what-it-builds',
		title: 'What It Is Built For',
		content: {
			title: 'Institutional Credit & Structured Finance',
			description:
				'USDU provides the foundational infrastructure for next-generation financial applications requiring stable, predictable funding with institutional-grade security.',
			features: [
				'Structured finance and credit facilities',
				'Real-world asset tokenization',
				'Cross-border institutional payments',
				'Leverage funding for sophisticated borrowers',
			],
			image: '/assets/leverage-funding-768x760.png',
		},
	},
];

export default function About() {
	const [activeTab, setActiveTab] = useState('what-it-is');
	const activeContent = aboutTabs.find(
		(tab) => tab.id === activeTab
	)?.content;

	return (
		<>
			<section id="about" className="py-20 bg-usdu-bg">
				<div className="container mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="text-center mb-16">
						<h2 className="text-4xl md:text-5xl font-bold text-usdu-black mb-6">
							Understanding USDU Protocol
						</h2>
						<p className="text-xl text-text-secondary max-w-3xl mx-auto">
							A comprehensive overview of what USDU is, what it&apos;s
							not, and what it&apos;s designed to achieve in the
							institutional finance ecosystem.
						</p>
					</motion.div>

					{/* Tab Navigation */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						viewport={{ once: true }}
						className="flex flex-wrap justify-center gap-4 mb-12">
						{aboutTabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`px-6 py-3 rounded-xl font-medium transition-all ${
									activeTab === tab.id
										? 'bg-usdu-orange text-white shadow-lg'
										: 'bg-usdu-card text-text-secondary hover:bg-usdu-surface border border-usdu-surface'
								}`}>
								{tab.title}
							</button>
						))}
					</motion.div>

					{/* Tab Content */}
					{activeContent && (
						<motion.div
							key={activeTab}
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
							{/* Content */}
							<div className="space-y-6">
								<h3 className="text-3xl font-bold text-usdu-black">
									{activeContent.title}
								</h3>
								<p className="text-lg text-text-secondary leading-relaxed">
									{activeContent.description}
								</p>
								<ul className="space-y-3">
									{activeContent.features.map(
										(feature, index) => (
											<li
												key={index}
												className="flex items-start gap-3">
												<div className="w-2 h-2 bg-usdu-black rounded-full mt-2 flex-shrink-0" />
												<span className="text-text-secondary">
													{feature}
												</span>
											</li>
										)
									)}
								</ul>
							</div>

							{/* Image */}
							<div className="relative">
								<div className="bg-usdu-card p-8 rounded-2xl border border-usdu-surface">
									<Image
										src={activeContent.image}
										alt={activeContent.title}
										width={400}
										height={400}
										className="w-48 h-48 mx-auto object-contain"
									/>
								</div>
							</div>
						</motion.div>
					)}
				</div>
			</section>
		</>
	);
}
