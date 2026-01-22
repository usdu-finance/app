import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

const upcomingMaturities = [
	{ date: '2024-02-15', amount: '$850K', rate: '4.2%' },
	{ date: '2024-02-28', amount: '$1.2M', rate: '4.5%' },
	{ date: '2024-03-15', amount: '$2.1M', rate: '5.0%' },
	{ date: '2024-03-30', amount: '$950K', rate: '4.8%' },
];

export default function UpcomingMaturities() {
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
					<h2 className="text-3xl font-bold text-usdu-black mb-4">Upcoming Maturities</h2>
					<p className="text-lg text-text-secondary max-w-3xl mx-auto">
						Track upcoming maturity events and plan your liquidity accordingly.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
					viewport={{ once: true }}
					className="max-w-4xl mx-auto"
				>
					<div className="bg-usdu-bg rounded-xl border border-usdu-surface overflow-hidden">
						<div className="grid grid-cols-4 gap-4 p-4 bg-usdu-surface/50 text-sm font-medium text-text-secondary">
							<div>Maturity Date</div>
							<div>Amount</div>
							<div>Rate</div>
							<div>Status</div>
						</div>
						{upcomingMaturities.map((item, index) => (
							<div
								key={item.date}
								className="grid grid-cols-4 gap-4 p-4 border-t border-usdu-surface"
							>
								<div className="flex items-center gap-2 text-usdu-black">
									<FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-usdu-orange" />
									{item.date}
								</div>
								<div className="font-semibold text-usdu-black">{item.amount}</div>
								<div className="text-usdu-orange font-medium">{item.rate}</div>
								<div>
									<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
										Active
									</span>
								</div>
							</div>
						))}
					</div>
				</motion.div>
			</div>
		</section>
	);
}
