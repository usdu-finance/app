import React from 'react';
import { motion } from 'framer-motion';
import { faVoteYea } from '@fortawesome/free-solid-svg-icons';
import ComingSoon from '@/components/ui/ComingSoon';

export default function VotingSystem() {
	return (
		<section className="relative px-4 md:px-8 lg:px-16 py-16 bg-usdu-bg">
			<motion.div
				initial={{ opacity: 0, y: 30 }}
				whileInView={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				viewport={{ once: true }}
				className="max-w-3xl mx-auto"
			>
				<ComingSoon
					icon={faVoteYea}
					title="Voting system - coming soon"
					description="Today proposals are approved by the multisig. A token based voting system will be plugged into the same Aragon DAO later. It is not live yet and nothing on this page depends on it."
				/>
			</motion.div>
		</section>
	);
}
