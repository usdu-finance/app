import { NavigationItem } from '@/components/layout/Layout.types';
import { faFileContract, faHome, faDroplet, faPercentage, faLayerGroup, faRightLeft, faEnvelope } from '@fortawesome/free-solid-svg-icons';

export const homeNavigation: NavigationItem[] = [
	{ name: 'Modules', href: '/modules' },
	{ name: 'Governance', href: '/governance' },
	{ name: 'Transparency', href: '/transparency' },
	{ name: 'Docs', href: '/docs' },
];

export const dashboardNavigation = [
	{ name: 'Overview', href: '/dashboard', icon: faHome },
	{ name: 'Swap', href: '/dashboard/swap', icon: faRightLeft, faEnvelope },
	{ name: 'Liquidity', href: '/dashboard/liquidity', icon: faDroplet },
	{
		name: 'Strategy',
		href: '/dashboard/strategy',
		icon: faLayerGroup,
	},
	{
		name: 'Borrow',
		href: '/dashboard/borrow',
		icon: faPercentage,
	},
	{ name: 'Obligation', href: '/dashboard/obligation', icon: faFileContract },
	{ name: 'Messages', href: '/dashboard/messages', icon: faEnvelope },
];
