import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCubes } from '@fortawesome/free-solid-svg-icons';
import ButtonInput from '@/components/ui/input/ButtonInput';
import { formatCompactNumber } from '@/lib/utils';
import type { LandingStats } from '@/hooks/useLandingStats';
import { Skeleton } from './shared';

const ORBIT_SECONDS = 70;

const COINS = [
	{ symbol: 'USDU', src: '/coin/usdu.png', angle: 0 },
	{ symbol: 'EURU', src: '/coin/euru.png', angle: 120 },
	{ symbol: 'CHFU', src: '/coin/chfu.png', angle: 240 },
];

/** Three stablecoins circling the governed modules that mint and burn them. */
function Orbit() {
	const reduce = useReducedMotion();
	const spin = (to: number, from: number) =>
		reduce
			? { rotate: from }
			: { rotate: [from, from + to] as number[], transition: { duration: ORBIT_SECONDS, ease: 'linear' as const, repeat: Infinity } };

	return (
		<div className="relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[420px] lg:max-w-[480px]" aria-hidden="true">
			<div className="absolute inset-0 rounded-full border border-white/10" />
			<div className="absolute inset-[16%] rounded-full border border-dashed border-white/15" />
			<div className="absolute inset-[34%] rounded-full border border-white/10 bg-white/[0.03]" />

			<motion.div className="absolute inset-0" animate={spin(360, 0)}>
				{COINS.map((c) => (
					<div key={c.symbol} className="absolute inset-0" style={{ transform: `rotate(${c.angle}deg)` }}>
						<motion.div
							className="absolute left-1/2 top-0 h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2"
							animate={spin(-360, -c.angle)}
							initial={{ rotate: -c.angle }}
						>
							<Image src={c.src} alt="" width={160} height={160} className="h-full w-full rounded-full" priority />
						</motion.div>
					</div>
				))}
			</motion.div>

			<div className="absolute inset-0 flex items-center justify-center">
				<div className="flex flex-col items-center gap-2 text-center">
					<span className="flex h-12 w-12 items-center justify-center rounded-full bg-usdu-orange text-white">
						<FontAwesomeIcon icon={faCubes} className="h-5 w-5" />
					</span>
					<span className="text-xs font-semibold uppercase tracking-widest text-white/70">DAO modules</span>
				</div>
			</div>
		</div>
	);
}

const compact = (v: number, prefix: string) => formatCompactNumber(v, 2, prefix);

export default function Hero({ stats }: { stats: LandingStats }) {
	const cells = [
		{ label: 'USDU supply', value: stats.supply.USDU, text: (v: number) => compact(v, '$') },
		{ label: 'EURU supply', value: stats.supply.EURU, text: (v: number) => compact(v, '€') },
		{ label: 'CHFU supply', value: stats.supply.CHFU, text: (v: number) => compact(v, 'CHF ') },
		{ label: 'Curve pool liquidity', value: stats.curveTvl, text: (v: number) => compact(v, '$') },
		{ label: 'Active modules', value: stats.activeModules, text: (v: number) => String(v) },
	];
	const visible = cells.filter((c) => stats.isLoading || c.value !== null);

	return (
		<section className="relative overflow-hidden bg-usdu-black text-white">
			<div
				className="pointer-events-none absolute inset-0 opacity-[0.07]"
				style={{
					backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
					backgroundSize: '28px 28px',
				}}
			/>
			<div className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-usdu-orange/20 blur-[120px]" />

			<div className="relative px-4 md:px-8 lg:px-16 pt-32 md:pt-40 pb-12 md:pb-16">
				<div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
					<div>
						<motion.p
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
							className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-sm text-white/80"
						>
							<span className="h-2 w-2 rounded-full bg-usdu-orange" />
							Live on Ethereum
						</motion.p>
						<motion.h1
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							style={{ textWrap: 'balance' }}
							className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-5xl xl:text-6xl"
						>
							Stablecoins in USD, EUR and CHF.
							<span className="block text-usdu-orange">Governed in the open.</span>
						</motion.h1>
						<motion.p
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="mt-6 max-w-xl text-lg leading-relaxed text-white/70 md:text-xl"
						>
							USDU, EURU and CHFU are protocol-issued, non-algorithmic stablecoins. Only modules approved by an Aragon DAO can
							mint and burn them, and every flow can be traced on-chain.
						</motion.p>
						<motion.div
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.3 }}
							className="mt-10 flex flex-col gap-3 sm:flex-row"
						>
							<ButtonInput
								label="Launch app"
								size="lg"
								href="/dashboard"
								icon={<FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />}
								className="shadow-none"
							/>
							<ButtonInput
								label="Explore transparency"
								variant="outline"
								size="lg"
								href="/transparency"
								className="border-white/30 text-white hover:border-usdu-orange"
							/>
						</motion.div>
					</div>

					<motion.div
						initial={{ opacity: 0, scale: 0.94 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.8, delay: 0.2 }}
					>
						<Orbit />
					</motion.div>
				</div>

				{visible.length > 0 && (
					<motion.dl
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.5 }}
						className="mx-auto mt-14 grid w-full max-w-[1400px] grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:mt-20 lg:grid-cols-5"
					>
						{visible.map((c, i) => (
							<div
								key={c.label}
								className={`bg-usdu-black px-5 py-4 ${i === visible.length - 1 && visible.length % 2 === 1 ? 'max-lg:col-span-2' : ''}`}
							>
								<dt className="text-xs uppercase tracking-wider text-white/60">{c.label}</dt>
								<dd className="mt-1 text-2xl font-bold tabular-nums">
									{c.value === null ? <Skeleton dark className="h-8 w-24" /> : c.text(c.value)}
								</dd>
							</div>
						))}
					</motion.dl>
				)}
			</div>
		</section>
	);
}
