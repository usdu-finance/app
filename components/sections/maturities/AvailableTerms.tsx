import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/ui/Button';

const maturities = [
	{
		duration: '30 Days',
		apy: '3.8%',
		minAmount: '$10,000',
		totalLocked: '$2.1M',
		status: 'Available',
		description: 'Short-term funding for working capital and liquidity needs.',
	},
	{
		duration: '90 Days',
		apy: '4.5%',
		minAmount: '$25,000',
		totalLocked: '$5.8M',
		status: 'Available',
		description: 'Medium-term funding for seasonal operations and project financing.',
	},
	{
		duration: '180 Days',
		apy: '5.2%',
		minAmount: '$50,000',
		totalLocked: '$8.3M',
		status: 'Available',
		description: 'Extended-term funding for structured finance and asset development.',
	},
	{
		duration: '1 Year',
		apy: '6.1%',
		minAmount: '$100,000',
		totalLocked: '$12.5M',
		status: 'Limited',
		description: 'Long-term institutional funding for major credit facilities.',
	},
];

export default function AvailableTerms() {
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
					<h2 className="text-3xl font-bold text-usdu-black mb-4">Available Terms</h2>
					<p className="text-lg text-text-secondary max-w-3xl mx-auto">
						Choose from our range of fixed-term funding options with competitive rates and
						institutional-grade security.
					</p>
				</motion.div>

				<div className="grid lg:grid-cols-2 gap-8">
					{maturities.map((maturity, index) => (
						<motion.div
							key={maturity.duration}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: index * 0.1 }}
							viewport={{ once: true }}
							className="bg-usdu-card p-8 rounded-xl border border-usdu-surface hover:shadow-lg transition-shadow"
						>
							<div className="flex items-start justify-between mb-6">
								<div>
									<h3 className="text-xl font-bold text-usdu-black mb-2">{maturity.duration}</h3>
									<div className="flex items-center gap-2">
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${
												maturity.status === 'Available'
													? 'bg-green-100 text-green-700'
													: 'bg-yellow-100 text-yellow-700'
											}`}
										>
											{maturity.status}
										</span>
									</div>
								</div>
								<div className="text-right">
									<div className="text-2xl font-bold text-usdu-orange">{maturity.apy}</div>
									<div className="text-sm text-text-secondary">Fixed APY</div>
								</div>
							</div>

							<p className="text-text-secondary mb-6">{maturity.description}</p>

							<div className="grid grid-cols-2 gap-4 mb-6">
								<div>
									<div className="text-sm text-text-secondary mb-1">Minimum Amount</div>
									<div className="font-semibold text-usdu-black">{maturity.minAmount}</div>
								</div>
								<div>
									<div className="text-sm text-text-secondary mb-1">Total Locked</div>
									<div className="font-semibold text-usdu-black">{maturity.totalLocked}</div>
								</div>
							</div>

							<Button
								href="/dashboard"
								className="w-full"
								icon={<FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />}
							>
								Get Funding
							</Button>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
