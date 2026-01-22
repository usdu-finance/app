import React from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

export default function MaturitiesOverview() {
	return (
		<section className="relative px-4 md:px-8 lg:px-16 pt-32 pb-16 bg-usdu-card">
			<div className="">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="text-center mb-16"
				>
					<h2 className="text-4xl md:text-5xl font-bold text-usdu-black mb-6">
						Fixed-Term Funding Maturities
					</h2>
					<p className="text-xl text-text-secondary max-w-3xl mx-auto mb-8">
						Predictable, fixed-rate funding options designed for institutional borrowers with terms ranging
						from 30 days to 1 year.
					</p>
				</motion.div>
			</div>
		</section>
	);
}
