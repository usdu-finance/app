import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileSignature, faHourglassHalf, faPowerOff } from '@fortawesome/free-solid-svg-icons';
import HeroSteps from '@/components/ui/HeroSteps';

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faFileSignature} className="w-3 h-3 text-usdu-card" />,
		title: 'Proposal via the Aragon DAO',
		description:
			'A new module, or a change to an existing one, is proposed through the Aragon DAO. The DAO is the curator of the stablecoins.',
	},
	{
		icon: <FontAwesomeIcon icon={faHourglassHalf} className="w-3 h-3 text-usdu-card" />,
		title: 'Delay and veto window',
		description:
			'The change is staged and waits for the time lock to pass. Until then the veto multisig, or the curator, can still reject it.',
	},
	{
		icon: <FontAwesomeIcon icon={faPowerOff} className="w-3 h-3 text-usdu-card" />,
		title: 'Module goes live or expires',
		description:
			'After the delay anyone can accept the pending change. A module stays valid until its expiry date, after that it can no longer act.',
	},
];

export default function GovernanceOverview() {
	return (
		<section className="relative px-4 md:px-8 lg:px-16 pt-32 pb-16 bg-usdu-card">
			<motion.div
				initial={{ opacity: 0, y: 30 }}
				whileInView={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				viewport={{ once: true }}
				className="text-center mb-8"
			>
				<h1 className="text-4xl md:text-5xl font-bold text-usdu-black mb-4">Governance</h1>
				<p className="text-lg text-text-secondary max-w-3xl mx-auto">
					USDU is governed by an Aragon DAO. Every module that can mint or move USDU has to pass through it, with a public delay
					in which a change can still be vetoed.
				</p>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 30 }}
				whileInView={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, delay: 0.2 }}
				viewport={{ once: true }}
			>
				<HeroSteps steps={STEPS} />
			</motion.div>
		</section>
	);
}
