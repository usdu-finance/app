export interface DocsPageMeta {
	slug: string; // '' is the docs landing page
	title: string;
	description: string;
}

export interface DocsGroup {
	title: string;
	pages: DocsPageMeta[];
}

export const docsNavigation: DocsGroup[] = [
	{
		title: 'Introduction',
		pages: [
			{ slug: '', title: 'Overview', description: 'What USDU Finance is and how the protocol fits together.' },
			{ slug: 'stablecoins', title: 'USDU, EURU & CHFU', description: 'The three governed stablecoins and what backs them.' },
			{ slug: 'how-it-works', title: 'How it works', description: 'Modules, swaps and rewards in one picture.' },
		],
	},
	{
		title: 'Protocol',
		pages: [
			{ slug: 'swap-modules', title: 'Swap modules', description: 'Mint and redeem a stablecoin against its backing asset.' },
			{ slug: 'liquidity', title: 'Liquidity pools', description: 'Curve pools that connect the stablecoins.' },
			{ slug: 'rewards', title: 'Strategies & rewards', description: 'Stake in a reward vault and earn streamed protocol revenue.' },
			{ slug: 'zap', title: 'Zap in', description: 'Pay with any token and end up in a USDU stablecoin.' },
		],
	},
	{
		title: 'Governance',
		pages: [
			{ slug: 'governance', title: 'DAO structure', description: 'The Aragon DAO, its multisigs and the curator role.' },
			{ slug: 'module-lifecycle', title: 'Module lifecycle', description: 'Propose, delay, veto, activate and expire.' },
		],
	},
	{
		title: 'Reference',
		pages: [
			{ slug: 'risks', title: 'Risks', description: 'What can go wrong and how the protocol limits it.' },
			{ slug: 'contracts', title: 'Contract addresses', description: 'Verified Ethereum mainnet deployments.' },
			{ slug: 'audits', title: 'Audits', description: 'Security reviews of the protocol code.' },
			{ slug: 'community', title: 'Community & links', description: 'Where to find the team and the ecosystem.' },
		],
	},
];

export const docsPages: DocsPageMeta[] = docsNavigation.flatMap((g) => g.pages);

export const docsHref = (slug: string) => (slug ? `/docs/${slug}` : '/docs');
