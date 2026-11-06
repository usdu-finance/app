import { NavigationItem } from '@/components/layout/Layout.types';
import {
	faFileContract,
	faHome,
	faDroplet,
	faPercentage,
	faLayerGroup,
	faRightLeft,
	faHandHoldingDollar,
} from '@fortawesome/free-solid-svg-icons';

export const homeNavigation: NavigationItem[] = [
	{ name: 'Modules', href: '/modules' },
	{ name: 'Governance', href: '/governance' },
	{ name: 'Transparency', href: '/transparency' },
];

export const dashboardNavigation = [
	{ name: 'Overview', href: '/dashboard', icon: faHome },
	{ name: 'Swap', href: '/dashboard/swap', icon: faRightLeft },
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
	{ name: 'Morpho', href: '/dashboard/morpho', icon: faHandHoldingDollar },
	{ name: 'Obligation', href: '/dashboard/obligation', icon: faFileContract },
];
