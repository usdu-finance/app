import React from 'react';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faTelegram, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { faLandmark } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { SOCIAL, PROJECT } from '@/lib/constants';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { mainnet } from 'viem/chains';
import Image from 'next/image';
import { TokenLogo } from '@/components/ui/logo';
import packageInfo from '../../package.json';

const TOKENS = [
	{ symbol: 'USDU', address: ADDRESS[mainnet.id].usduStable },
	{ symbol: 'EURU', address: ADDRESS[mainnet.id].euruStable },
	{ symbol: 'CHFU', address: ADDRESS[mainnet.id].chfuStable },
	{ symbol: 'rUSDU', address: ADDRESS[mainnet.id].usduStreamerVaultV1 },
	{ symbol: 'rEURU', address: ADDRESS[mainnet.id].euruStreamerVaultV1 },
	{ symbol: 'rCHFU', address: ADDRESS[mainnet.id].chfuStreamerVaultV1 },
];

interface FooterItemProps {
	link: string;
	text: string;
	icon: IconProp;
	external?: boolean;
}

export function FooterItem({ link, text, icon, external = true }: FooterItemProps) {
	const className = 'flex items-center gap-2 text-text-secondary hover:text-usdu-orange transition-colors';

	if (external) {
		return (
			<a href={link} target="_blank" rel="noopener noreferrer" className={className}>
				<FontAwesomeIcon icon={icon} className="w-4 h-4" />
				<span className="sm:inline">{text}</span>
			</a>
		);
	}

	return (
		<Link href={link} className={className}>
			<FontAwesomeIcon icon={icon} className="w-4 h-4" />
			<span className="sm:inline">{text}</span>
		</Link>
	);
}

export default function Footer() {
	const date = new Date();
	const year = date.getFullYear();

	return (
		<footer className="bg-usdu-bg border-t border-usdu-surface py-16">
			<div className="container mx-auto px-4">
				<div className="grid md:grid-cols-4 gap-8 mb-12">
					{/* PROJECT Info */}
					<div className="md:col-span-1">
						<div className="flex items-center gap-3 mb-6">
							<Link href="/">
								<Image
									src={'/assets/usdu-full-text-1024x346.png'}
									alt={PROJECT.name.split(' ')[0]}
									width={100}
									height={100}
									className="w-full h-auto object-contain"
								/>
							</Link>
						</div>
						<p className="text-text-secondary text-sm leading-relaxed mb-6">{PROJECT.tagline}</p>
						<p className="text-text-secondary text-xs">Available on {PROJECT.blockchains.join(' & ')}</p>
					</div>

					{/* Protocol Links */}
					<div>
						<h3 className="text-usdu-black font-semibold mb-6">Protocol</h3>
						<ul className="space-y-4">
							{TOKENS.map((token) => (
								<li key={token.symbol}>
									<a
										href={`https://etherscan.io/token/${token.address}`}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 text-text-secondary hover:text-usdu-orange transition-colors text-sm"
									>
										<TokenLogo currency={token.symbol} size={5} />
										{token.symbol}
									</a>
								</li>
							))}
						</ul>
					</div>

					{/* Community */}
					<div>
						<h3 className="text-usdu-black font-semibold mb-6">Community</h3>
						<ul className="space-y-4">
							<li>
								<FooterItem link={SOCIAL.Aragon} text="Governance" icon={faLandmark} />
							</li>
							<li>
								<FooterItem link={SOCIAL.Github_user} text="GitHub" icon={faGithub} />
							</li>
							<li>
								<FooterItem link={SOCIAL.Twitter} text="Twitter" icon={faXTwitter} />
							</li>
							<li>
								<FooterItem link={SOCIAL.Telegram} text="Telegram" icon={faTelegram} />
							</li>
						</ul>
					</div>

					{/* Resources */}
					<div>
						<h3 className="text-usdu-black font-semibold mb-6">Resources</h3>
						<ul className="space-y-4">
							<li>
								<Link
									href="/legal/disclaimer"
									className="text-text-secondary hover:text-usdu-orange transition-colors text-sm"
								>
									Risk Disclaimer
								</Link>
							</li>
							<li>
								<Link
									href="/legal/privacy"
									className="text-text-secondary hover:text-usdu-orange transition-colors text-sm"
								>
									Privacy Policy
								</Link>
							</li>
							<li>
								<Link href="/legal/terms" className="text-text-secondary hover:text-usdu-orange transition-colors text-sm">
									Terms of Service
								</Link>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="border-t border-usdu-surface pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
					<div className="text-text-secondary text-sm">
						© {year} {PROJECT.name}. All rights reserved.
					</div>

					<div className="flex items-center gap-6">
						<div className="text-text-secondary text-xs">Application Version {packageInfo.version}</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
