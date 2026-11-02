import { useState } from 'react';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faArrowRightArrowLeft, faSeedling, faBolt } from '@fortawesome/free-solid-svg-icons';
import { PageHeader } from '@/components/ui/layout';
import HeroSteps from '@/components/ui/HeroSteps';
import ZapInCard from '@/components/pages/zap/ZapInCard';
import type { TokenOption } from '@/components/ui/input';
import { SEO } from '@/lib/constants';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const icon = (i: typeof faCoins) => <FontAwesomeIcon icon={i} className="w-3 h-3 text-usdu-card" />;

// The reward vault shares are the only receive tokens named r<STABLE>, which is what makes the zap a stake
const isStake = (t?: TokenOption) => !!t && /^r(USDU|EURU|CHFU)$/.test(t.symbol);

/**
 * /dashboard/zap/swap?from=<symbol|address>&to=<symbol|address>&amount=<number|max>
 * The zap card on its own page, prefilled from the query so it can be linked to from anywhere.
 * The hero steps follow the selection: paying with USDC into rEURU reads as a stake, into EURU as a swap.
 */
export default function ZapSwapPage() {
	const router = useRouter();
	const { from, to, amount } = router.query;
	const [pair, setPair] = useState<{ pay?: TokenOption; receive?: TokenOption }>({});

	const pay = pair.pay?.symbol ?? 'any token';
	const receive = pair.receive?.symbol ?? 'a stablecoin';
	const stake = isStake(pair.receive);
	const asset = stake ? receive.slice(1) : receive;

	const steps = stake
		? [
				{
					icon: icon(faCoins),
					title: `Pay with ${pay}`,
					description: 'Any token from the list, or paste a contract address. Foreign tokens are routed through Enso.',
				},
				{
					icon: icon(faArrowRightArrowLeft),
					title: `Convert into ${asset}`,
					description: 'Swap modules mint at par, Curve pools cover the rest. The best route is picked for you.',
				},
				{
					icon: icon(faSeedling),
					title: `Stake as ${receive}`,
					description: `Your ${asset} goes straight into its reward vault, so you start earning in the same transaction.`,
				},
			]
		: [
				{
					icon: icon(faCoins),
					title: `Pay with ${pay}`,
					description: 'Any token from the list, or paste a contract address. Foreign tokens are routed through Enso.',
				},
				{
					icon: icon(faArrowRightArrowLeft),
					title: `Receive ${receive}`,
					description: 'Swap modules mint at par, Curve pools cover the rest. The best route is picked for you.',
				},
				{
					icon: icon(faBolt),
					title: 'One transaction',
					description: 'Every hop settles atomically, with a minimum output enforced on-chain.',
				},
			];

	return (
		<>
			<NextSeo title={SEO.zapSwap.title} description={SEO.zapSwap.description} openGraph={SEO.zapSwap.openGraph} />
			<div className="space-y-8">
				<PageHeader
					title={stake ? 'Zap & Stake' : 'Zap In'}
					description={
						stake
							? 'Pay with any token and stake into a reward vault, in a single transaction.'
							: 'Pay with any token and end up in USDU, EURU, CHFU or their reward vaults, in a single transaction.'
					}
				/>

				<HeroSteps steps={steps} />

				{/* The query is empty until the router is ready, so the card mounts once it holds the real values */}
				{router.isReady && (
					<ZapInCard
						prefill={{ from: first(from), to: first(to), amount: first(amount) }}
						onTokensChange={(p, r) => setPair({ pay: p, receive: r })}
					/>
				)}
			</div>
		</>
	);
}
