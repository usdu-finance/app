import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faArrowRightArrowLeft, faDroplet, faFileContract, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { Reveal, SectionHead, SECTION, INNER } from './shared';

const PRODUCTS = [
	{
		icon: faArrowRightArrowLeft,
		title: 'Swap',
		text: 'Mint or redeem USDU, EURU and CHFU through swap modules, or trade against the Curve pools with live pricing and slippage protection.',
		href: '/dashboard/swap',
		cta: 'Open swap',
	},
	{
		icon: faDroplet,
		title: 'Liquidity',
		text: 'Add liquidity to the Curve pools that pair USDU with USDC, EURU and CHFU and follow their balances and LP supply.',
		href: '/dashboard/liquidity',
		cta: 'Provide liquidity',
	},
	{
		icon: faLayerGroup,
		title: 'Strategy and rewards',
		text: 'Stake a stablecoin in its reward vault and watch rewards stream into your share price. Each swap module also shows the vault behind it.',
		href: '/dashboard/strategy',
		cta: 'See strategies',
	},
	{
		icon: faFileContract,
		title: 'Borrow and obligations',
		text: 'Fixed-term borrowing against collateral, with obligations you can track by health and maturity. Offers are not live yet.',
		href: '/dashboard/borrow',
		cta: 'Preview borrow',
		status: 'In preparation',
	},
];

export default function Products() {
	return (
		<section className={`${SECTION} bg-usdu-bg`}>
			<div className={INNER}>
				<SectionHead
					eyebrow="Products"
					title="Everything you can do with the stablecoins."
					description="One dashboard for swapping, providing liquidity, earning and, soon, borrowing at fixed terms."
				/>

				<div className="grid gap-6 md:grid-cols-2">
					{PRODUCTS.map((p, i) => (
						<Reveal key={p.title} delay={(i % 2) * 0.08} className="h-full">
							<Link
								href={p.href}
								className="group flex h-full gap-5 rounded-2xl border border-usdu-surface bg-usdu-card p-6 transition-colors hover:border-usdu-orange md:p-8"
							>
								<span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-usdu-black text-white transition-colors group-hover:bg-usdu-orange">
									<FontAwesomeIcon icon={p.icon} className="h-5 w-5" />
								</span>
								<div className="flex flex-1 flex-col">
									<div className="flex flex-wrap items-center gap-3">
										<h3 className="text-xl font-bold text-usdu-black">{p.title}</h3>
										{p.status && (
											<span className="rounded-full bg-usdu-orange/10 px-2.5 py-0.5 text-xs font-semibold text-usdu-orange">
												{p.status}
											</span>
										)}
									</div>
									<p className="mt-2 flex-1 leading-relaxed text-text-secondary">{p.text}</p>
									<span className="mt-5 inline-flex items-center gap-2 font-medium text-usdu-orange">
										{p.cta}
										<FontAwesomeIcon
											icon={faArrowRight}
											className="h-3 w-3 transition-transform group-hover:translate-x-1"
										/>
									</span>
								</div>
							</Link>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}
