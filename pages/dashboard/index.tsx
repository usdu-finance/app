import React from 'react';
import { PageHeader } from '@/components/ui/layout';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faCoins,
	faChartLine,
	faUsers,
	faShield,
} from '@fortawesome/free-solid-svg-icons';

const stats = [
	{
		title: 'Total Value Locked',
		value: '$12.5M',
		icon: faCoins,
		change: '+8.2%',
		positive: true,
	},
	{
		title: 'USDU Supply',
		value: '8.7M',
		icon: faShield,
		change: '+2.1%',
		positive: true,
	},
	{
		title: 'Active Users',
		value: '1,234',
		icon: faUsers,
		change: '+15.3%',
		positive: true,
	},
	{
		title: 'APY',
		value: '4.2%',
		icon: faChartLine,
		change: '-0.5%',
		positive: false,
	},
];

export default function DashboardPage() {
	const { isConnected, address } = useAuth();

	return (
		<div className="space-y-8">
			<PageHeader
				title="Dashboard"
				description={`Welcome to USDU Finance. ${
					isConnected ? `Connected as ${address?.slice(0, 8)}...${address?.slice(-6)}` : 'Connect your wallet to get started.'
				}`}
			/>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{stats.map((stat) => (
					<div
						key={stat.title}
						className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface hover:border-usdu-orange/30 transition-colors">
						<div className="flex items-center justify-between mb-4">
							<div className="w-12 h-12 bg-usdu-orange/10 rounded-lg flex items-center justify-center">
								<FontAwesomeIcon
									icon={stat.icon}
									className="w-6 h-6 text-usdu-orange"
								/>
							</div>
							<span
								className={`text-sm font-medium ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
								{stat.change}
							</span>
						</div>
						<div>
							<p className="text-text-secondary text-sm mb-1">
								{stat.title}
							</p>
							<p className="text-2xl font-bold text-usdu-black">
								{stat.value}
							</p>
						</div>
					</div>
				))}
			</div>

			{/* Quick Actions */}
			<div className="bg-usdu-bg p-8 rounded-xl border border-usdu-surface">
				<h2 className="text-xl font-semibold text-usdu-black mb-6">
					Quick Actions
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<button className="p-4 bg-usdu-surface hover:bg-usdu-orange/10 border border-usdu-surface hover:border-usdu-orange/30 rounded-lg transition-colors text-left">
						<FontAwesomeIcon
							icon={faCoins}
							className="w-6 h-6 text-usdu-orange mb-2"
						/>
						<h3 className="font-medium text-usdu-black mb-1">
							Mint USDU
						</h3>
						<p className="text-sm text-text-secondary">
							Generate USDU tokens with collateral
						</p>
					</button>

					<button className="p-4 bg-usdu-surface hover:bg-usdu-orange/10 border border-usdu-surface hover:border-usdu-orange/30 rounded-lg transition-colors text-left">
						<FontAwesomeIcon
							icon={faChartLine}
							className="w-6 h-6 text-usdu-orange mb-2"
						/>
						<h3 className="font-medium text-usdu-black mb-1">
							Provide Liquidity
						</h3>
						<p className="text-sm text-text-secondary">
							Earn fees by providing liquidity
						</p>
					</button>

					<button className="p-4 bg-usdu-surface hover:bg-usdu-orange/10 border border-usdu-surface hover:border-usdu-orange/30 rounded-lg transition-colors text-left">
						<FontAwesomeIcon
							icon={faShield}
							className="w-6 h-6 text-usdu-orange mb-2"
						/>
						<h3 className="font-medium text-usdu-black mb-1">
							Stake USDU
						</h3>
						<p className="text-sm text-text-secondary">
							Earn rewards by staking USDU
						</p>
					</button>
				</div>
			</div>

			{/* Protocol Info */}
			<div className="bg-usdu-bg p-8 rounded-xl border border-usdu-surface">
				<h2 className="text-xl font-semibold text-usdu-black mb-4">
					Protocol Status
				</h2>
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-text-secondary">Network</span>
						<span className="text-usdu-black">
							Ethereum Mainnet
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-text-secondary">
							Protocol Health
						</span>
						<span className="text-green-600 flex items-center gap-2">
							<div className="w-2 h-2 bg-green-500 rounded-full"></div>
							Healthy
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-text-secondary">Last Update</span>
						<span className="text-usdu-black">2 minutes ago</span>
					</div>
				</div>
			</div>
		</div>
	);
}
