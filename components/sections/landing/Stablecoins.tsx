import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { mainnet } from 'viem/chains';
import AddressLink from '@/components/ui/AddressLink';
import { formatCompactNumber } from '@/lib/utils';
import type { LandingStats, LandingSymbol } from '@/hooks/useLandingStats';
import { Reveal, SectionHead, Skeleton, SECTION, INNER } from './shared';

const A = ADDRESS[mainnet.id];

const COINS: {
	symbol: LandingSymbol;
	name: string;
	peg: string;
	prefix: string;
	logo: string;
	address: string;
	assets: string[];
	pool: string;
	rewards: string;
}[] = [
	{
		symbol: 'USDU',
		name: 'US Dollar',
		peg: 'USD',
		prefix: '$',
		logo: '/coin/usdu.png',
		address: A.usduStable,
		assets: ['USDC', 'USDT'],
		pool: 'USDC / USDU on Curve',
		rewards: 'rUSDU',
	},
	{
		symbol: 'EURU',
		name: 'Euro',
		peg: 'EUR',
		prefix: '€',
		logo: '/coin/euru.png',
		address: A.euruStable,
		assets: ['EURC', 'dEURO'],
		pool: 'USDU / EURU on Curve',
		rewards: 'rEURU',
	},
	{
		symbol: 'CHFU',
		name: 'Swiss Franc',
		peg: 'CHF',
		prefix: 'CHF ',
		logo: '/coin/chfu.png',
		address: A.chfuStable,
		assets: ['ZCHF'],
		pool: 'USDU / CHFU on Curve',
		rewards: 'rCHFU',
	},
];

export default function Stablecoins({ stats }: { stats: LandingStats }) {
	return (
		<section className={`${SECTION} bg-usdu-bg`}>
			<div className={INNER}>
				<SectionHead
					eyebrow="Three stablecoins, one system"
					title="One coin per currency, each with its own routes in and out."
					description="Every stablecoin has its own swap router, its own bridge modules and its own reward vault. They share one governance and one set of contracts."
				/>

				<div className="grid gap-6 md:grid-cols-3">
					{COINS.map((c, i) => {
						const supply = stats.supply[c.symbol];
						return (
							<Reveal key={c.symbol} delay={i * 0.08} className="h-full">
								<article className="flex h-full flex-col rounded-2xl border border-usdu-surface bg-usdu-card p-6 md:p-8">
									<div className="flex items-center gap-4">
										<Image src={c.logo} alt="" width={56} height={56} className="h-14 w-14 rounded-full" />
										<div>
											<h3 className="text-2xl font-bold text-usdu-black">{c.symbol}</h3>
											<p className="text-sm text-text-muted">
												{c.name} · tracks {c.peg}
											</p>
										</div>
									</div>

									<div className="mt-6 border-t border-usdu-surface pt-6">
										<p className="text-xs uppercase tracking-wider text-text-muted">Circulating supply</p>
										<p className="mt-1 text-3xl font-bold tabular-nums text-usdu-black">
											{stats.isLoading && supply === null ? (
												<Skeleton className="h-9 w-32" />
											) : supply !== null ? (
												formatCompactNumber(supply, 2, c.prefix)
											) : (
												'n/a'
											)}
										</p>
									</div>

									<dl className="mt-6 space-y-4 text-sm">
										<div>
											<dt className="text-text-muted">Swap in and out with</dt>
											<dd className="mt-2 flex flex-wrap gap-2">
												{c.assets.map((a) => (
													<span
														key={a}
														className="rounded-full border border-usdu-surface bg-usdu-bg px-3 py-1 font-medium text-usdu-black"
													>
														{a}
													</span>
												))}
											</dd>
										</div>
										<div className="flex justify-between gap-4">
											<dt className="text-text-muted">Curve pool</dt>
											<dd className="text-right font-medium text-usdu-black">{c.pool}</dd>
										</div>
										<div className="flex justify-between gap-4">
											<dt className="text-text-muted">Reward vault</dt>
											<dd className="text-right font-medium text-usdu-black">{c.rewards}</dd>
										</div>
										<div className="flex justify-between gap-4">
											<dt className="text-text-muted">Contract</dt>
											<dd>
												<AddressLink address={c.address} className="text-sm" />
											</dd>
										</div>
									</dl>

									<div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-8 font-medium">
										<Link
											href="/dashboard/swap"
											className="inline-flex items-center gap-2 text-usdu-orange hover:text-usdu-black"
										>
											Swap <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
										</Link>
										<Link
											href="/dashboard/strategy"
											className="inline-flex items-center gap-2 text-usdu-orange hover:text-usdu-black"
										>
											Earn <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
										</Link>
									</div>
								</article>
							</Reveal>
						);
					})}
				</div>
			</div>
		</section>
	);
}
