import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightArrowLeft, faCubes, faPiggyBank, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { Reveal, SectionHead, SECTION, INNER } from './shared';

const STEPS = [
	{
		icon: faArrowRightArrowLeft,
		title: 'Deposit an asset',
		chips: ['USDC', 'USDT', 'EURC', 'dEURO', 'ZCHF'],
		text: 'A swap module takes a trusted asset and puts it to work in a Morpho vault. Each module has a fee and a mint cap that you can see before you swap.',
	},
	{
		icon: faCubes,
		title: 'Receive the stablecoin',
		chips: ['USDU', 'EURU', 'CHFU'],
		text: 'The module mints the matching stablecoin 1:1 against your deposit, minus its fee. Only modules approved by the DAO are allowed to mint.',
	},
	{
		icon: faRotateLeft,
		title: 'Swap back whenever',
		chips: ['Burn', 'Redeem'],
		text: 'Swapping out burns the stablecoin and redeems your position from the vault. This keeps working even after a module has expired. Curve pools offer a second route.',
	},
	{
		icon: faPiggyBank,
		title: 'Stake to earn rewards',
		chips: ['rUSDU', 'rEURU', 'rCHFU'],
		text: 'Stake a stablecoin in its reward vault. Rewards sent to the vault stream to stakers over time and raise the share price. The vaults have no owner and no fees.',
	},
];

export default function HowItWorks() {
	return (
		<section className={`${SECTION} bg-usdu-card`}>
			<div className={INNER}>
				<SectionHead
					eyebrow="How it works"
					title="From a deposit to a stablecoin, and back."
					description="Everything that issues or redeems a stablecoin is a module. You can read each one on-chain."
				/>

				<ol className="relative grid gap-6 md:grid-cols-2 xl:grid-cols-4">
					{STEPS.map((s, i) => (
						<Reveal key={s.title} delay={i * 0.08} className="h-full">
							<li className="relative flex h-full flex-col rounded-2xl border border-usdu-surface bg-usdu-bg p-6">
								<div className="mb-5 flex items-center justify-between">
									<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-usdu-black text-white">
										<FontAwesomeIcon icon={s.icon} className="h-5 w-5" />
									</span>
									<span className="text-4xl font-bold tabular-nums text-usdu-surface">0{i + 1}</span>
								</div>
								<h3 className="text-xl font-bold text-usdu-black">{s.title}</h3>
								<p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">{s.text}</p>
								<div className="mt-5 flex flex-wrap gap-2">
									{s.chips.map((c) => (
										<span
											key={c}
											className="rounded-full border border-usdu-surface bg-usdu-card px-2.5 py-0.5 text-xs font-medium text-usdu-black"
										>
											{c}
										</span>
									))}
								</div>
							</li>
						</Reveal>
					))}
				</ol>
			</div>
		</section>
	);
}
