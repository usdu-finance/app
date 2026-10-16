import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faTelegram, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { SOCIAL } from '@/lib/constants';
import ButtonInput from '@/components/ui/input/ButtonInput';
import { Reveal, INNER } from './shared';

const LINKS = [
	{ label: 'GitHub', href: SOCIAL.Github_user, icon: faGithub },
	{ label: 'X', href: SOCIAL.Twitter, icon: faXTwitter },
	{ label: 'Telegram', href: SOCIAL.Telegram, icon: faTelegram },
];

const TEXT_LINKS = [
	{ label: 'DefiLlama', href: SOCIAL.Defillama },
	{ label: 'CoinGecko', href: SOCIAL.Coingecko },
	{ label: 'Aragon DAO', href: SOCIAL.Aragon },
];

export default function Cta() {
	return (
		<section className="bg-usdu-bg px-4 pb-16 md:px-8 md:pb-24 lg:px-16">
			<div className={INNER}>
				<Reveal className="relative overflow-hidden rounded-3xl bg-usdu-black px-6 py-14 text-center md:px-16 md:py-20">
					<div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-usdu-orange/25 blur-[100px]" />
					<div className="relative">
						<h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">
							Start with a swap. Check everything on-chain.
						</h2>
						<p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
							Open the app to mint, redeem or earn, or follow the flows first in GodEye.
						</p>
						<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
							<ButtonInput
								label="Launch app"
								size="lg"
								href="/dashboard"
								icon={<FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />}
								className="shadow-none"
							/>
							<ButtonInput
								label="Open GodEye"
								variant="outline"
								size="lg"
								href="/transparency"
								className="border-white/30 text-white hover:border-usdu-orange"
							/>
						</div>

						<div className="mt-12 flex flex-col items-center gap-5 border-t border-white/10 pt-8">
							<ul className="flex flex-wrap justify-center gap-3">
								{LINKS.map((l) => (
									<li key={l.label}>
										<a
											href={l.href}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-usdu-orange hover:text-usdu-orange"
										>
											<FontAwesomeIcon icon={l.icon} className="h-4 w-4" />
											{l.label}
										</a>
									</li>
								))}
							</ul>
							<ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/60">
								{TEXT_LINKS.map((l) => (
									<li key={l.label}>
										<a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-usdu-orange">
											{l.label}
										</a>
									</li>
								))}
							</ul>
						</div>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
