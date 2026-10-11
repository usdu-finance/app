import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup, faScaleBalanced, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import HeroSteps from '@/components/ui/HeroSteps';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';
import { formatCompactNumber } from '@/lib/utils';

const HEADERS = ['Strategy', 'TVL', 'APY'];

interface StrategyItem {
	key: string;
	name: string;
	tvl: bigint;
	apyPPM: number;
}

// Placeholder — replace with a hook once strategy vaults are exposed on-chain.
const STRATEGIES: StrategyItem[] = [];

function compareStrategies(tab: string, a: StrategyItem, b: StrategyItem): number {
	switch (tab) {
		case 'TVL':
			return b.tvl < a.tvl ? -1 : b.tvl > a.tvl ? 1 : 0;
		case 'APY':
			return b.apyPPM - a.apyPPM;
		default:
			return a.name.localeCompare(b.name);
	}
}

const STREAM_HEADERS = ['Stream', 'Staked', 'Locked', 'Rate / Day', 'APR', 'Ends In'];

interface RewardStreamItem {
	key: string;
	name: string;
	symbol: string;
	logoURI: string;
	staked: number; // asset staked in the streamer vault
	locked: number; // rewards funded but not yet streamed
	daysLeft: number; // until the current stream ends
}

// MOCK — replace with a hook reading StreamerVaultV1 (totalAssets, locked(), rate(), streamEnd) once deployed.
const REWARD_STREAMS: RewardStreamItem[] = [
	{ key: 'rusdu', name: 'USDU Rewards', symbol: 'rUSDU', logoURI: '/coin/rusdu.png', staked: 1_250_000, locked: 31_500, daysLeft: 74 },
	{ key: 'reuru', name: 'EURU Rewards', symbol: 'rEURU', logoURI: '/coin/reuru.png', staked: 420_000, locked: 9_800, daysLeft: 58 },
	{ key: 'rchfu', name: 'CHFU Rewards', symbol: 'rCHFU', logoURI: '/coin/rchfu.png', staked: 180_000, locked: 3_100, daysLeft: 81 },
];

const ratePerDay = (r: RewardStreamItem) => (r.daysLeft > 0 ? r.locked / r.daysLeft : 0);
const streamApr = (r: RewardStreamItem) => (r.staked > 0 ? ((ratePerDay(r) * 365) / r.staked) * 100 : 0);

function compareStreams(tab: string, a: RewardStreamItem, b: RewardStreamItem): number {
	switch (tab) {
		case 'Staked':
			return b.staked - a.staked;
		case 'Locked':
			return b.locked - a.locked;
		case 'Rate / Day':
			return ratePerDay(b) - ratePerDay(a);
		case 'APR':
			return streamApr(b) - streamApr(a);
		case 'Ends In':
			return b.daysLeft - a.daysLeft;
		default:
			return a.name.localeCompare(b.name); // 'Stream'
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faLayerGroup} className="w-3 h-3 text-usdu-card" />,
		title: 'Browse strategies',
		description: 'Every swap module deposits into a strategy vault — compare them here.',
	},
	{
		icon: <FontAwesomeIcon icon={faScaleBalanced} className="w-3 h-3 text-usdu-card" />,
		title: 'Compare yield & risk',
		description: 'Each strategy carries its own risk profile and expected yield.',
	},
	{
		icon: <FontAwesomeIcon icon={faChartLine} className="w-3 h-3 text-usdu-card" />,
		title: 'Track performance',
		description: 'Follow TVL and APY over time to see how a strategy is performing.',
	},
];

function StrategyListPageContent() {
	const router = useRouter();
	const { sortTab, sortReverse, handleSort } = useSort('Strategy');

	const sortedStrategies = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...STRATEGIES].sort((a, b) => dir * compareStrategies(sortTab, a, b));
	}, [sortTab, sortReverse]);

	const { sortTab: streamTab, sortReverse: streamReverse, handleSort: handleStreamSort } = useSort('APR');
	const sortedStreams = useMemo(() => {
		const dir = streamReverse ? -1 : 1;
		return [...REWARD_STREAMS].sort((a, b) => dir * compareStreams(streamTab, a, b));
	}, [streamTab, streamReverse]);

	return (
		<div className="space-y-8">
			<PageHeader
				title="Strategy"
				description="Compare the strategy vaults backing each swap module, including their total value locked and yield."
			/>

			<HeroSteps steps={STEPS} />

			<Table>
				<TableHead headers={HEADERS} colSpan={3} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
				<TableBody>
					{sortedStrategies.length === 0 ? (
						<TableRowEmpty>Strategy vaults are coming soon.</TableRowEmpty>
					) : (
						sortedStrategies.map((s) => (
							<TableRow
								key={s.key}
								headers={HEADERS}
								colSpan={3}
								tab={sortTab}
								onClick={() => router.push(`/dashboard/strategy/${s.key}`)}
							>
								<span>{s.name}</span>
								<span>{s.tvl.toString()}</span>
								<span>{(s.apyPPM / 10_000).toFixed(2)}%</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>

			<PageHeader
				title="Reward Streams"
				description="Protocol rewards are streamed linearly to everyone who stakes a USDU stablecoin, so the share price rises over time. Stake and unstake at any time."
			/>

			<Table>
				<TableHead
					headers={STREAM_HEADERS}
					colSpan={6}
					tab={streamTab}
					reverse={streamReverse}
					tabOnChange={handleStreamSort}
				/>
				<TableBody>
					{sortedStreams.length === 0 ? (
						<TableRowEmpty>No reward streams available.</TableRowEmpty>
					) : (
						sortedStreams.map((r) => (
							<TableRow key={r.key} headers={STREAM_HEADERS} colSpan={6} tab={streamTab}>
								<div className="flex items-center gap-2">
									<TokenLogo logoURI={r.logoURI} currency={r.symbol} size={6} />
									<span>{r.name}</span>
								</div>
								<span>{formatCompactNumber(r.staked, 1, '', ` ${r.symbol.slice(1)}`)}</span>
								<span>{formatCompactNumber(r.locked, 1, '', ` ${r.symbol.slice(1)}`)}</span>
								<span>{formatCompactNumber(ratePerDay(r), 1, '', ` ${r.symbol.slice(1)}`)}</span>
								<span>{streamApr(r).toFixed(2)}%</span>
								<span>{r.daysLeft} days</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}

export default function StrategyListPage() {
	return (
		<>
			<NextSeo title={SEO.strategy.title} description={SEO.strategy.description} openGraph={SEO.strategy.openGraph} />
			<StrategyListPageContent />
		</>
	);
}
