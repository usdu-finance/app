import React from 'react';
import Link from 'next/link';
import Accordion from '@/components/ui/Accordion';
import { SOCIAL } from '@/lib/constants';
import { Reveal, SectionHead, SECTION } from './shared';

const FAQ: { q: string; a: React.ReactNode }[] = [
	{
		q: 'What are USDU, EURU and CHFU?',
		a: 'Three stablecoins issued by the protocol, tracking the US dollar, the euro and the Swiss franc. They share one set of contracts and one governance, but each has its own swap modules and reward vault.',
	},
	{
		q: 'Are they algorithmic?',
		a: 'No. They are non-algorithmic: a stablecoin is minted by a module only when someone swaps in an asset, and burned when it is swapped out. There is no rebasing and no supply rule that reacts to the price.',
	},
	{
		q: 'Who can mint and burn them?',
		a: (
			<>
				Only modules that the Aragon DAO has approved. A new module is proposed, waits out a time lock of 7 days to 4 weeks in which
				it can still be vetoed, and then stays valid until its expiry date. See the{' '}
				<Link href="/governance" className="font-medium text-usdu-orange hover:underline">
					governance page
				</Link>{' '}
				and the{' '}
				<Link href="/modules" className="font-medium text-usdu-orange hover:underline">
					module list
				</Link>
				.
			</>
		),
	},
	{
		q: 'How do I get and redeem them?',
		a: 'Swap an accepted asset (USDC, USDT, EURC, dEURO or ZCHF) through a swap module in the app, or trade against a Curve pool. A module charges its own fee, which the app shows before you confirm.',
	},
	{
		q: 'Can I always redeem?',
		a: 'Swapping out burns the stablecoin and redeems your position from the underlying vault. It keeps working after a module has expired. Because it draws on a vault, it depends on that vault having liquidity at the time.',
	},
	{
		q: 'What do the reward vaults do?',
		a: 'rUSDU, rEURU and rCHFU are ERC-4626 vaults. You stake the stablecoin and receive shares. Rewards sent to the vault are streamed to stakers over time, which raises the share price. The vault contract has no owner and no fees.',
	},
	{
		q: 'Can I borrow with USDU?',
		a: 'Fixed-term borrowing and obligations are being prepared and the app already has the pages for them, but no offers are live yet.',
	},
	{
		q: 'Is it risk-free?',
		a: 'No. The stablecoins depend on smart contracts and on the vaults and pools they use, and a swap-out depends on vault liquidity. The contracts are open source, and all addresses link to Etherscan so you can check them yourself.',
	},
	{
		q: 'Which network is it on?',
		a: 'Ethereum mainnet.',
	},
];

export default function Faq() {
	return (
		<section className={`${SECTION} bg-usdu-bg`}>
			<div className="mx-auto grid w-full max-w-[1400px] gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
				<SectionHead
					eyebrow="FAQ"
					title="Questions, answered plainly."
					description="Short answers about what the stablecoins are and how they behave. The details live in the code, which is open."
					className="lg:mb-0"
				/>
				<Reveal className="space-y-3">
					{FAQ.map((item, i) => (
						<Accordion
							key={item.q}
							defaultOpen={i === 0}
							className="bg-usdu-card"
							title={<span className="font-semibold text-usdu-black">{item.q}</span>}
						>
							<div className="leading-relaxed text-text-secondary">{item.a}</div>
						</Accordion>
					))}
					<p className="pt-2 text-sm text-text-muted">
						More questions? Ask in the{' '}
						<a
							href={SOCIAL.Telegram}
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-usdu-orange hover:underline"
						>
							Telegram group
						</a>
						.
					</p>
				</Reveal>
			</div>
		</section>
	);
}
