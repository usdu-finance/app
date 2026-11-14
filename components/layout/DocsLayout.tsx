import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { PROJECT } from '@/lib/constants';
import { LayoutProps } from './Layout.types';
import { homeNavigation } from '@/lib/layout/navigation';
import { docsNavigation, docsHref } from '@/lib/docs/navigation';

export default function DocsLayout({ children }: LayoutProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const router = useRouter();

	// asPath without query/hash and trailing slash: '/docs/swap-modules' or '/docs'
	const current = router.asPath.split(/[?#]/)[0].replace(/\/$/, '') || '/';

	return (
		<div className="min-h-screen bg-usdu-bg text-text-primary">
			{/* Navbar */}
			<header className="fixed top-0 left-0 right-0 z-50 bg-usdu-bg">
				<div className="mx-auto max-md:px-4 px-16 py-3 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Link href="/">
							<Image
								src="/assets/usdu-full-text-1024x346.png"
								alt={PROJECT.name.split(' ')[0]}
								width={80}
								height={80}
								className="w-full h-auto object-contain"
							/>
						</Link>
						<Link href="/docs" className="text-sm font-semibold text-usdu-orange border-l border-usdu-surface pl-3">
							Docs
						</Link>
					</div>

					<nav className="hidden md:flex items-center space-x-8">
						{homeNavigation
							.filter((item) => item.href !== '/docs')
							.map((item) => (
								<Link
									key={item.name}
									href={item.href}
									className="text-sm font-medium text-text-secondary hover:text-usdu-orange transition-colors"
								>
									{item.name}
								</Link>
							))}
					</nav>

					<div className="flex items-center gap-2">
						<Link
							href="/dashboard"
							className="hidden md:inline-flex items-center gap-2 bg-usdu-orange text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors text-sm font-medium"
						>
							Launch App
							<FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3 h-3" />
						</Link>
						<button
							onClick={() => setIsMenuOpen(!isMenuOpen)}
							className="md:hidden p-2 text-text-secondary hover:text-usdu-orange transition-colors"
							aria-label="Toggle docs menu"
						>
							<FontAwesomeIcon icon={isMenuOpen ? faTimes : faBars} className="w-5 h-5" />
						</button>
					</div>
				</div>
			</header>

			<div className="flex pt-16">
				{isMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMenuOpen(false)} />}

				{/* Subpage menu */}
				<aside
					className={`fixed left-0 top-16 bottom-0 w-64 overflow-y-auto bg-usdu-bg p-4 transform transition-transform duration-300 ease-in-out z-50 ${
						isMenuOpen ? 'translate-x-0' : '-translate-x-full'
					} md:translate-x-0`}
				>
					<nav className="space-y-6">
						{docsNavigation.map((group) => (
							<div key={group.title}>
								<p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">{group.title}</p>
								<div className="space-y-1">
									{group.pages.map((page) => {
										const href = docsHref(page.slug);
										return (
											<Link
												key={href}
												href={href}
												onClick={() => setIsMenuOpen(false)}
												className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
													current === href
														? 'bg-usdu-surface text-usdu-orange font-medium'
														: 'text-text-secondary hover:text-usdu-orange hover:bg-usdu-surface'
												}`}
											>
												{page.title}
											</Link>
										);
									})}
								</div>
							</div>
						))}
					</nav>
				</aside>

				<main className="flex-1 min-h-[calc(100vh-4rem)] max-md:px-4 md:px-12 py-8 md:ml-64 md:my-4 bg-usdu-card md:rounded-l-3xl">
					<div className="max-w-3xl">{children}</div>
				</main>
			</div>
		</div>
	);
}
