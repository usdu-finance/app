import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCubes, faLandmark, faEye, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

const pillars = [
	{
		icon: faCubes,
		title: 'Modules',
		description:
			'Only approved modules can mint and burn USDU. See which modules are active, what is pending and when they expire.',
		href: '/modules',
		cta: 'Explore modules',
	},
	{
		icon: faLandmark,
		title: 'Governance',
		description:
			'An Aragon DAO approves every module, with multisigs, a delay and a veto window. A voting system is planned.',
		href: '/governance',
		cta: 'See how it is governed',
	},
	{
		icon: faEye,
		title: 'Transparency',
		description:
			'GodEye maps how USDU and its sibling stablecoins move between addresses on-chain, with a timeline to replay it.',
		href: '/godeye',
		cta: 'Open GodEye',
	},
];

export default function Pillars() {
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
					<h2 className="text-4xl md:text-5xl font-bold text-usdu-black mb-6">Open by Design</h2>
					<p className="text-xl text-text-secondary max-w-3xl mx-auto">
						USDU rests on three pillars. Everything the protocol does can be checked on-chain.
					</p>
				</motion.div>

				<div className="grid md:grid-cols-3 gap-8">
					{pillars.map((pillar, index) => (
						<motion.div
							key={pillar.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: index * 0.1 }}
							viewport={{ once: true }}
							className="bg-usdu-bg p-8 rounded-xl border border-usdu-surface hover:shadow-lg transition-shadow flex flex-col"
						>
							<div className="w-16 h-16 bg-usdu-black rounded-xl flex items-center justify-center mb-6">
								<FontAwesomeIcon icon={pillar.icon} className="w-8 h-8 text-usdu-card" />
							</div>
							<h3 className="text-xl font-bold text-usdu-black mb-4">{pillar.title}</h3>
							<p className="text-text-secondary mb-6 leading-relaxed">{pillar.description}</p>
							<Link
								href={pillar.href}
								className="inline-flex items-center gap-2 text-usdu-orange hover:text-opacity-80 font-medium mt-auto"
							>
								{pillar.cta}
								<FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
							</Link>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
