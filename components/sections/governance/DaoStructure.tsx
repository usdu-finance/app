import React from 'react';
import { motion } from 'framer-motion';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { SOCIAL } from '@/lib/constants';
import AddressLink from '@/components/ui/AddressLink';
import { AddressDisplay } from '@/components/ui/AddressDisplay';
import AppLink from '@/components/ui/AppLink';

const addr = ADDRESS[mainnet.id];

const roles = [
	{
		title: 'Aragon DAO',
		address: addr.aragonDao,
		description:
			'The DAO core contract. It is the curator of the stablecoins, so only it can submit modules, change the time lock or appoint a guardian.',
	},
	{
		title: 'Multisig',
		address: addr.aragonMultiSig,
		description: 'Creates and approves proposals for the DAO.',
	},
	{
		title: 'Delayed action',
		address: addr.aragonDelayedAction,
		description: 'Stages approved proposals and executes them on the DAO only after the delay has passed.',
	},
	{
		title: 'Veto multisig',
		address: addr.aragonVetoMultiSig,
		description: 'Can veto a staged proposal during the delay window, before it reaches the DAO.',
	},
];

export default function DaoStructure() {
	return (
		<section className="relative px-4 md:px-8 lg:px-16 py-16 bg-usdu-bg">
			<motion.div
				initial={{ opacity: 0, y: 30 }}
				whileInView={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				viewport={{ once: true }}
				className="text-center mb-12"
			>
				<h2 className="text-3xl font-bold text-usdu-black mb-4">The Aragon DAO</h2>
				<p className="text-lg text-text-secondary max-w-3xl mx-auto">
					The contracts behind USDU governance on Ethereum. All addresses link to the block explorer.
				</p>
			</motion.div>

			<div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto mb-8">
				{roles.map((role, index) => (
					<motion.div
						key={role.title}
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: index * 0.1 }}
						viewport={{ once: true }}
						className="bg-usdu-card p-6 rounded-xl border border-usdu-surface flex flex-col gap-3"
					>
						<h3 className="text-xl font-bold text-usdu-black">{role.title}</h3>
						<p className="text-text-secondary text-sm leading-relaxed">{role.description}</p>
						<div className="flex items-center gap-3 mt-auto pt-2">
							<AddressDisplay address={role.address} />
							<AddressLink address={role.address} displayText="Etherscan" className="text-sm" />
						</div>
					</motion.div>
				))}
			</div>

			<div className="text-center">
				<AppLink href={SOCIAL.Aragon} className="font-medium">
					Open the DAO on Aragon
				</AppLink>
			</div>
		</section>
	);
}
