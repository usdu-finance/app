import { NavigationItem } from '@/components/layout/Layout.types';
import { faChartColumn, faHome, faDroplet, faPercentage, faEye, faRightLeft } from '@fortawesome/free-solid-svg-icons';

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
		name: 'Borrow',
		href: '/dashboard/borrow',
		icon: faPercentage,
	},
	{
		name: 'Transparency',
		href: '/dashboard/transparency',
		icon: faEye,
	},
	{ name: 'Analytics', href: '/dashboard/analytics', icon: faChartColumn },
];
