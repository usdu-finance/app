import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faLandmark } from '@fortawesome/free-solid-svg-icons';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { mainnet } from 'viem/chains';
import { SOCIAL, getCurvePoolUrl } from '@/lib/constants';
import { Reveal, SectionHead, SECTION, INNER } from './shared';

const PARTNERS = [
	{
		name: 'Morpho',
		role: 'Swap modules deposit your assets into Morpho vaults, where they are redeemed from when you swap out.',
		href: 'https://morpho.org',
		logo: '/assets/morpho-market-icon-150x150.png',
	},
	{
		name: 'Curve',
		role: 'Pools pairing USDU with USDC, EURU and CHFU give a second route in and out, with an LP gauge for USDC / USDU.',
		href: getCurvePoolUrl(ADDRESS[mainnet.id].curveStableSwapNG_USDCUSDU),
		logo: '/assets/curve-icon-150x150.png',
	},
	{
		name: 'Aragon',
		role: 'The DAO that curates the stablecoins, with a multisig, a delayed action and a veto multisig.',
		href: SOCIAL.Aragon,
		icon: faLandmark,
	},
];

const ASSETS = [
	{ symbol: 'USDC', to: 'USDU', logo: '/coin/usdc.svg' },
	{ symbol: 'USDT', to: 'USDU', logo: '/coin/usdt.svg' },
	{ symbol: 'EURC', to: 'EURU', logo: '/coin/eurc.png' },
	{ symbol: 'dEURO', to: 'EURU', logo: '/coin/deuro.svg' },
	{ symbol: 'ZCHF', to: 'CHFU', logo: '/coin/zchf.svg' },
];

// Any of these can be zapped into a stablecoin or reward vault in one transaction, routed through Enso
const ZAP_ASSETS = [
	{ symbol: 'ETH', logo: '/coin/eth.svg' },
	{ symbol: 'WBTC', logo: '/coin/wbtc.svg' },
	{ symbol: 'cbBTC', logo: '/coin/cbbtc.png' },
	{ symbol: 'wstETH', logo: '/coin/wsteth.svg' },
	{ symbol: 'LINK', logo: '/coin/link.png' },
	{ symbol: 'UNI', logo: '/coin/uni.png' },
	{ symbol: 'AAVE', logo: '/coin/aave.png' },
];

export default function Ecosystem() {
	return (
		<section className={`${SECTION} bg-usdu-card`}>
			<div className={INNER}>
				<SectionHead
					eyebrow="Ecosystem"
					title="Built on protocols you already know."
					description="The stablecoins plug into existing DeFi infrastructure instead of reinventing it."
				/>

				<div className="grid gap-6 md:grid-cols-3">
					{PARTNERS.map((p, i) => (
						<Reveal key={p.name} delay={i * 0.08} className="h-full">
							<a
								href={p.href}
								target="_blank"
								rel="noopener noreferrer"
								className="group flex h-full flex-col rounded-2xl border border-usdu-surface bg-usdu-bg p-6 transition-colors hover:border-usdu-orange"
							>
								<div className="mb-5 flex items-center justify-between">
									<span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-usdu-card">
										{p.logo ? (
											<Image src={p.logo} alt="" width={48} height={48} className="h-full w-full object-contain" />
										) : (
											p.icon && <FontAwesomeIcon icon={p.icon} className="h-5 w-5 text-usdu-black" />
										)}
									</span>
									<FontAwesomeIcon
										icon={faArrowUpRightFromSquare}
										className="h-3.5 w-3.5 text-text-muted transition-colors group-hover:text-usdu-orange"
									/>
								</div>
								<h3 className="text-xl font-bold text-usdu-black">{p.name}</h3>
								<p className="mt-2 text-sm leading-relaxed text-text-secondary">{p.role}</p>
							</a>
						</Reveal>
					))}
				</div>

				<Reveal className="mt-10 divide-y divide-usdu-surface rounded-2xl border border-usdu-surface">
					{[
						{ title: 'Assets you can swap in and out against', assets: ASSETS },
						{ title: 'Or zap in with crypto, and many more tokens', assets: ZAP_ASSETS },
					].map((row) => (
						<div key={row.title} className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
							<p className="font-medium text-usdu-black">{row.title}</p>
							<ul className="flex flex-wrap gap-3">
								{row.assets.map((a) => (
									<li key={a.symbol}>
										{/* each chip opens the zap page paying with that token, into the stablecoin it bridges to */}
										<Link
											href={`/dashboard/zap/swap?from=${a.symbol}&to=${'to' in a ? a.to : 'USDU'}`}
											className="inline-flex items-center gap-2 rounded-full border border-usdu-surface bg-usdu-bg py-1.5 pl-2 pr-4 text-sm font-medium text-usdu-black transition-shadow hover:shadow-lg"
										>
											<Image src={a.logo} alt="" width={20} height={20} className="h-5 w-5 rounded-full" />
											{a.symbol}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</Reveal>
			</div>
		</section>
	);
}
