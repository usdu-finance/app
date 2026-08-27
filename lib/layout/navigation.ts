import { NavigationItem } from '@/components/layout/Layout.types';
import { faFileContract, faHome, faDroplet, faPercentage, faLayerGroup, faRightLeft } from '@fortawesome/free-solid-svg-icons';

export const homeNavigation: NavigationItem[] = [
	{ name: 'Maturities', href: '/maturities' },
	{ name: 'Transparency', href: '/transparency' },
	{ name: 'Modules', href: '/modules' },
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
	{ name: 'Obligation', href: '/dashboard/obligation', icon: faFileContract },
];
