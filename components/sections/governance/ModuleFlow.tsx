import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const stages = [
	{
		title: 'Propose',
		description:
			'The curator, which is the Aragon DAO, submits a module together with its expiry date and a public message. The stablecoin stores it as pending.',
	},
	{
		title: 'Delay window',
		description:
			'A pending change becomes valid only after the stablecoin time lock has passed. The time lock can be set between 7 days and 4 weeks. Anyone can follow pending changes on the modules page.',
	},
	{
		title: 'Veto possible',
		description:
			'While a change is pending, the curator or the guardian can revoke it. On the Aragon side the veto multisig can stop a staged proposal during its own delay.',
	},
	{
		title: 'Active until expiry',
		description:
			'Once accepted, the module is active until its expiry date. After that it is no longer a valid module and cannot mint USDU or move funds anymore.',
	},
];

export default function ModuleFlow() {
	return (
		<section className="relative px-4 md:px-8 lg:px-16 py-16 bg-usdu-card">
			<motion.div
				initial={{ opacity: 0, y: 30 }}
				whileInView={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				viewport={{ once: true }}
				className="text-center mb-12"
			>
				<h2 className="text-3xl font-bold text-usdu-black mb-4">How a Module Gets Approved</h2>
				<p className="text-lg text-text-secondary max-w-3xl mx-auto">
					Modules are the only contracts allowed to mint and burn USDU. Each one has to pass the same process before it goes live.
				</p>
			</motion.div>

			<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				{stages.map((stage, index) => (
					<motion.div
						key={stage.title}
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: index * 0.1 }}
						viewport={{ once: true }}
						className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface"
					>
						<div className="w-10 h-10 bg-usdu-black text-usdu-card rounded-lg flex items-center justify-center font-bold mb-4">
							{index + 1}
						</div>
						<h3 className="text-lg font-semibold text-usdu-black mb-3">{stage.title}</h3>
						<p className="text-text-secondary text-sm leading-relaxed">{stage.description}</p>
					</motion.div>
				))}
			</div>

			<div className="text-center">
				<Link href="/modules" className="text-usdu-orange hover:text-usdu-orange/80 font-medium">
					See all modules and pending changes
				</Link>
			</div>
		</section>
	);
}
