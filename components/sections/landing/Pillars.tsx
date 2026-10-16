import React from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCubes, faEye, faLandmark } from '@fortawesome/free-solid-svg-icons';
import type { LandingStats } from '@/hooks/useLandingStats';
import { Reveal, SectionHead, Skeleton, SECTION, INNER } from './shared';

export default function Pillars({ stats }: { stats: LandingStats }) {
	const pillars = [
		{
			icon: faCubes,
			title: 'Modules',
			description:
				'Only approved modules can mint and burn the stablecoins. See which are active, what is pending and when each one expires.',
			href: '/modules',
			cta: 'Explore modules',
			figure: stats.activeModules,
			figureLabel: 'active modules',
		},
		{
			icon: faLandmark,
			title: 'Governance',
			description:
				'An Aragon DAO approves every module. A time lock of 7 days to 4 weeks and a veto window leave room to react. A voting system is planned.',
			href: '/governance',
			cta: 'See how it is governed',
		},
		{
			icon: faEye,
			title: 'Transparency',
			description: 'GodEye maps how the stablecoins move between holders, minters, pools and vaults, with a timeline to replay it.',
			href: '/transparency',
			cta: 'Open GodEye',
		},
	];

	return (
		<section className={`${SECTION} bg-usdu-black`}>
			<div className={INNER}>
				<SectionHead
					dark
					eyebrow="Open by design"
					title="Three pillars you can verify yourself."
					description="Nothing here asks for trust in a dashboard. Modules, governance and flows are all readable on-chain."
				/>

				<div className="grid gap-6 md:grid-cols-3">
					{pillars.map((p, i) => (
						<Reveal key={p.title} delay={i * 0.08} className="h-full">
							<div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
								<span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-usdu-orange text-white">
									<FontAwesomeIcon icon={p.icon} className="h-5 w-5" />
								</span>
								<h3 className="text-xl font-bold text-white">{p.title}</h3>
								<p className="mt-3 leading-relaxed text-white/70">{p.description}</p>
								{p.figureLabel && (stats.isLoading || p.figure !== null) && (
									<p className="mt-5 flex items-baseline gap-2">
										{p.figure === null || p.figure === undefined ? (
											<Skeleton dark className="h-8 w-10" />
										) : (
											<span className="text-3xl font-bold tabular-nums text-white">{p.figure}</span>
										)}
										<span className="text-sm text-white/60">{p.figureLabel}</span>
									</p>
								)}
								<Link
									href={p.href}
									className="mt-auto inline-flex items-center gap-2 pt-6 font-medium text-usdu-orange hover:text-white"
								>
									{p.cta}
									<FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
								</Link>
							</div>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}
