import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { NavigationItem } from '@/components/layout/Layout.types';
import {
	faFileContract,
	faHome,
	faDroplet,
	faPercentage,
	faLayerGroup,
	faRightLeft,
	faEnvelope,
	faLandmark,
} from '@fortawesome/free-solid-svg-icons';

export const homeNavigation: NavigationItem[] = [
	{ name: 'Modules', href: '/modules' },
	{ name: 'Governance', href: '/governance' },
	{ name: 'Transparency', href: '/transparency' },
];

export interface DashboardNavItem {
	name: string;
	href: string;
	icon: IconDefinition;
}

export interface DashboardNavGroup {
	/** Section label above the items; the first group has none. */
	label?: string;
	items: DashboardNavItem[];
}

export const dashboardNavigation: DashboardNavGroup[] = [
	{ items: [{ name: 'Overview', href: '/dashboard', icon: faHome }] },
	{
		label: 'Stablecoin',
		items: [
			{ name: 'Swap', href: '/dashboard/swap', icon: faRightLeft },
			{ name: 'Liquidity', href: '/dashboard/liquidity', icon: faDroplet },
			{ name: 'Strategy', href: '/dashboard/strategy', icon: faLayerGroup },
			{ name: 'Borrow', href: '/dashboard/borrow', icon: faPercentage },
			{ name: 'Obligation', href: '/dashboard/obligation', icon: faFileContract },
		],
	},
	{
		label: 'Utils',
		items: [
			{ name: 'DAO', href: '/dashboard/dao', icon: faLandmark },
			{ name: 'Messages', href: '/dashboard/messages', icon: faEnvelope },
		],
	},
];
