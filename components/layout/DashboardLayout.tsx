import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faBars,
	faTimes,
	faWallet,
	faChartColumn,
	faHome,
	faDroplet,
	faPercentage,
	faCalendarAlt,
	faEye,
} from '@fortawesome/free-solid-svg-icons';
import { PROJECT } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useAppKit } from '@reown/appkit/react';
import Image from 'next/image';

interface DashboardLayoutProps {
	children: React.ReactNode;
}

const dashboardNavigation = [
	{ name: 'Overview', href: '/dashboard', icon: faHome },
	{ name: 'Liquidity', href: '/dashboard/liquidity', icon: faDroplet },
	{
		name: 'Borrow Rates',
		href: '/dashboard/borrow-rates',
		icon: faPercentage,
	},
	{
		name: 'Maturities',
		href: '/dashboard/maturities',
		icon: faCalendarAlt,
	},
	{
		name: 'Transparency',
		href: '/dashboard/transparency',
		icon: faEye,
	},
	{ name: 'Analytics', href: '/dashboard/analytics', icon: faChartColumn },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const { isConnected, address } = useAuth();
	const { open } = useAppKit();
	const router = useRouter();

	const toggleSidebar = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	const closeSidebar = () => {
		setIsSidebarOpen(false);
	};

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	};

	const closeMobileMenu = () => {
		setIsMobileMenuOpen(false);
	};

	const handleOverlayClick = () => {
		closeSidebar();
		closeMobileMenu();
	};

	return (
		<div className="min-h-screen bg-usdu-bg text-text-primary">
			{/* Dashboard Header */}
			<header className="fixed top-0 left-0 right-0 z-50 bg-usdu-bg border-b border-usdu-surface">
				<div className="mx-auto max-md:px-4 px-16 py-3">
					<div className="flex items-center justify-between">
						{/* Logo */}
						<div className="flex items-center gap-4">
							<Link href="/">
								<Image
									src={'/assets/usdu-full-text-1024x346.png'}
									alt={PROJECT.name.split(' ')[0]}
									width={80}
									height={80}
									className="w-full h-auto object-contain"
								/>
							</Link>
						</div>

						{/* Desktop CTA Button */}
						<div className="hidden md:flex items-center gap-3">
							{!isConnected ? (
								<button
									type="button"
									onClick={() => open()}
									className="inline-flex items-center gap-2 bg-usdu-orange text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium">
									<FontAwesomeIcon
										icon={faWallet}
										className="w-3 h-3"
									/>
									Connect Wallet
								</button>
							) : (
								<button
									type="button"
									onClick={() => open()}
									className="inline-flex items-center gap-2 text-usdu-black hover:text-usdu-orange transition-colors text-sm font-medium"
									title="Click to manage wallet">
									<div className="text-right">
										<p className="text-sm text-text-secondary">
											Connected
										</p>
										<p className="text-usdu-black font-mono text-sm hover:text-usdu-orange transition-colors">
											{address?.slice(0, 8)}...
											{address?.slice(-6)}
										</p>
									</div>
								</button>
							)}
						</div>

						{/* Mobile Actions */}
						<div className="md:hidden flex items-center gap-2">
							<button
								onClick={toggleMobileMenu}
								className="p-2 flex items-center justify-center text-text-secondary hover:text-usdu-orange transition-colors">
								<FontAwesomeIcon
									icon={isMobileMenuOpen ? faTimes : faBars}
									className="w-5 h-5"
								/>
							</button>
						</div>
					</div>

					{/* Mobile Navigation */}
					{isMobileMenuOpen && (
						<div className="md:hidden mt-4 border-t border-usdu-surface pt-4">
							<nav className="space-y-4">
								{dashboardNavigation.map((item) => (
									<Link
										key={item.name}
										href={item.href}
										className={`flex items-center gap-3 transition-colors text-sm rounded-lg px-3 py-2 ${
											router.pathname === item.href
												? 'bg-usdu-surface'
												: 'text-text-secondary hover:text-usdu-orange hover:bg-usdu-surface'
										}`}
										onClick={closeMobileMenu}>
										<FontAwesomeIcon
											icon={item.icon}
											className="w-4 h-4"
										/>
										{item.name}
									</Link>
								))}
							</nav>
							{!isConnected ? (
								<button
									type="button"
									onClick={() => {
										open();
										closeMobileMenu();
									}}
									className="inline-flex items-center gap-2 bg-usdu-orange text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors text-sm font-medium mt-4">
									<FontAwesomeIcon
										icon={faWallet}
										className="w-3 h-3"
									/>
									Connect Wallet
								</button>
							) : (
								<div className="flex justify-end items-center">
									<button
										type="button"
										onClick={() => {
											open();
											closeMobileMenu();
										}}
										className="inline-flex gap-2 mt-4 text-usdu-black hover:text-usdu-orange transition-colors text-sm font-medium"
										title="Click to manage wallet">
										<div className="text-right">
											<p className="text-sm text-text-secondary">
												Connected
											</p>
											<p className="text-usdu-black font-mono text-sm hover:text-usdu-orange transition-colors">
												{address?.slice(0, 8)}...
												{address?.slice(-6)}
											</p>
										</div>
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			</header>

			{/* Dashboard Content */}
			<div className="flex pt-16">
				{/* Sidebar Overlay */}
				{(isSidebarOpen || isMobileMenuOpen) && (
					<div
						className="fixed inset-0 bg-black/50 z-40 md:hidden"
						onClick={handleOverlayClick}
					/>
				)}

				{/* Sidebar Navigation */}
				<aside
					className={`fixed left-0 top-16 mt-1 w-64 h-screen bg-usdu-bg border-r border-usdu-surface transform transition-transform duration-300 ease-in-out z-50 ${
						isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
					} md:translate-x-0`}>
					<nav className="p-4 space-y-2">
						{dashboardNavigation.map((item) => (
							<Link
								key={item.name}
								href={item.href}
								className={`flex items-center gap-3 transition-colors rounded-lg px-3 py-2 ${
									router.pathname === item.href
										? 'bg-usdu-surface border'
										: 'text-text-secondary hover:text-usdu-orange hover:bg-usdu-surface'
								}`}
								onClick={closeSidebar}>
								<FontAwesomeIcon
									icon={item.icon}
									className="w-4 h-4"
								/>
								{item.name}
							</Link>
						))}
					</nav>
				</aside>

				{/* Main Content */}
				<main className="flex-1 min-h-[calc(100vh-4rem)] px-4 py-8 md:ml-64 bg-usdu-card">
					<div>{children}</div>
				</main>
			</div>
		</div>
	);
}
