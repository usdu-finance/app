import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/ui/Button';
import { PROJECT } from '@/lib/constants';

export default function Hero() {
	return (
		<section className="relative min-h-screen flex items-center justify-center bg-usdu-black overflow-hidden">
			{/* Background Image */}
			<div className="absolute inset-0 opacity-10">
				<div
					className="w-full h-full bg-cover bg-center bg-no-repeat"
					style={{
						backgroundImage: `url("/assets/background-wide-double-dark-2048x736.png")`,
					}}
				/>
			</div>

			{/* Content */}
			<div className="relative container mx-auto px-4 max-md:mt-12 text-center">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					className="max-w-4xl mx-auto"
				>
					{/* Main Heading */}
					<motion.h1
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-usdu-card leading-tight"
					>
						Low-Cost Stable Funding
						<br />
						<span className="text-usdu-card">for On-Chain Credit</span>
					</motion.h1>

					{/* Subtitle */}
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.4 }}
						className="text-xl md:text-2xl text-usdu-card mb-8 max-w-3xl mx-auto leading-relaxed"
					>
						{PROJECT.description}
					</motion.p>

					{/* Key Features */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.6 }}
						className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto"
					>
						<div className="bg-usdu-card p-6 rounded-xl border border-usdu-surface shadow-sm">
							<div className="text-2xl font-bold text-usdu-black mb-2">3-6%</div>
							<div className="text-sm text-text-secondary">Fixed-term funding rates</div>
						</div>
						<div className="bg-usdu-card p-6 rounded-xl border border-usdu-surface shadow-sm">
							<div className="text-2xl font-bold text-usdu-black mb-2">Non-Algo</div>
							<div className="text-sm text-text-secondary">Protocol-issued stablecoin</div>
						</div>
						<div className="bg-usdu-card p-6 rounded-xl border border-usdu-surface shadow-sm">
							<div className="text-2xl font-bold text-usdu-black mb-2">USDC</div>
							<div className="text-sm text-text-secondary">Fully convertible on-chain</div>
						</div>
					</motion.div>

					{/* CTA Buttons */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.8 }}
						className="flex flex-col sm:flex-row gap-4 justify-center items-center max-md:pb-32"
					>
						<Button
							size="lg"
							href="/dashboard/liquidity"
							icon={<FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />}
							className="bg-usdu-orange hover:bg-opacity-90 text-white shadow-lg"
						>
							Provide Liquidity
						</Button>
						<Button
							variant="outline"
							size="lg"
							href="/transparency"
							className="border-usdu-card text-usdu-card hover:bg-usdu-orange hover:text-white"
						>
							View Transparency
						</Button>
					</motion.div>
				</motion.div>
			</div>

			{/* Scroll Indicator */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1, delay: 1.5 }}
				className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
			>
				<div className="w-6 h-10 border-2 border-usdu-orange rounded-full flex justify-center">
					<div className="w-1 h-3 bg-usdu-orange rounded-full animate-bounce mt-2" />
				</div>
			</motion.div>
		</section>
	);
}
