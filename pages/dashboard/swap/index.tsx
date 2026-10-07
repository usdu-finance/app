import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { formatUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faScaleBalanced, faBolt } from '@fortawesome/free-solid-svg-icons';
import { useSwapModules, type SwapModule } from '@/hooks/useSwapModules';
import { useCurvePools, type CurvePool } from '@/hooks/useCurvePools';
import { useSort } from '@/hooks/ui/useSort';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import { TokenLogo } from '@/components/ui/logo';
import { PageHeader } from '@/components/ui/layout';
import HeroSteps from '@/components/ui/HeroSteps';
import { formatCompactNumber, normalizeAddress } from '@/lib/utils';
import { USDC_MAINNET } from '@/lib/whitelisted-tokens';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const HEADERS = ['Coin', 'Available In', 'Available Out', 'Fees In', 'Fees Out', 'Strategy'];
const POOL_HEADERS = ['Pool', 'TVL', 'Price', 'First Token', 'Second Token'];

function compareBigint(a: bigint, b: bigint): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function compareModules(tab: string, a: SwapModule, b: SwapModule): number {
	switch (tab) {
		case 'Available In':
			return compareBigint(b.mintable, a.mintable);
		case 'Available Out':
			return compareBigint(b.totalMinted, a.totalMinted);
		case 'Fees In':
			return b.swapInFeePPM - a.swapInFeePPM;
		case 'Fees Out':
			return b.swapOutFeePPM - a.swapOutFeePPM;
		case 'Strategy':
			return a.vaultName.localeCompare(b.vaultName);
		default:
			return a.coinSymbol.localeCompare(b.coinSymbol);
	}
}

function compareNumber(a: number, b: number): number {
	return a - b;
}

function tokenAmount(p: CurvePool, index: 0 | 1): number {
	return parseFloat(formatUnits(p.balances[index], p.tokens[index].decimals));
}

function comparePools(tab: string, a: CurvePool, b: CurvePool): number {
	switch (tab) {
		case 'Price':
			return compareNumber(b.price, a.price);
		case 'TVL':
			return compareNumber(b.totalValue, a.totalValue);
		case 'First Token':
			return compareNumber(tokenAmount(b, 0), tokenAmount(a, 0));
		case 'Second Token':
			return compareNumber(tokenAmount(b, 1), tokenAmount(a, 1));
		default:
			return a.label.localeCompare(b.label); // 'Pool'
	}
}

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faCoins} className="w-3 h-3 text-usdu-card" />,
		title: 'Pick a currency',
		description: 'USDU, EURU, and CHFU are all live today, each with their own set of swap modules.',
	},
	{
		icon: <FontAwesomeIcon icon={faScaleBalanced} className="w-3 h-3 text-usdu-card" />,
		title: 'Compare bridges',
		description: 'The same coin can be backed by more than one bridge, each with its own fees and mint capacity.',
	},
	{
		icon: <FontAwesomeIcon icon={faBolt} className="w-3 h-3 text-usdu-card" />,
		title: 'Swap instantly',
		description: 'Mint or redeem directly on-chain through the swap router — no order book, no slippage.',
	},
];

function isRedeemPool(p: CurvePool): boolean {
	return p.tokens.some((t) => normalizeAddress(t.address) === normalizeAddress(USDC_MAINNET));
}

interface CurvePoolSectionProps {
	title: string;
	description: string;
	pools: CurvePool[];
	isLoading: boolean;
	error: string | null;
	emptyText: string;
}

function CurvePoolSection({ title, description, pools, isLoading, error, emptyText }: CurvePoolSectionProps) {
	const router = useRouter();
	const { sortTab, sortReverse, handleSort } = useSort('TVL');

	const sortedPools = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...pools].sort((a, b) => dir * comparePools(sortTab, a, b));
	}, [pools, sortTab, sortReverse]);

	return (
		<>
			<PageHeader title={title} description={description} />

			<Table>
				<TableHead headers={POOL_HEADERS} colSpan={5} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
				<TableBody>
					{isLoading ? (
						<TableRowEmpty>Loading curve pools...</TableRowEmpty>
					) : error ? (
						<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
					) : sortedPools.length === 0 ? (
						<TableRowEmpty>{emptyText}</TableRowEmpty>
					) : (
						sortedPools.map((m) => (
							<TableRow
								key={m.key}
								headers={POOL_HEADERS}
								colSpan={5}
								tab={sortTab}
								onClick={() => router.push(`/dashboard/swap/${m.poolAddress}/curve`)}
							>
								<div className="flex items-center gap-2">
									<TokenLogo currency={m.tokens[0].symbol} size={6} className="-mr-2" />
									<TokenLogo currency={m.tokens[1].symbol} size={6} />
									<span>{m.label}</span>
								</div>
								<span>{formatCompactNumber(m.totalValue, 1, '', ' USDU')}</span>
								<span>{`${m.price.toFixed(4)} ${m.tokens[0].symbol}`}</span>
								<span>{formatCompactNumber(tokenAmount(m, 0), 1, '', ` ${m.tokens[0].symbol}`)}</span>
								<span>{formatCompactNumber(tokenAmount(m, 1), 1, '', ` ${m.tokens[1].symbol}`)}</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</>
	);
}

function SwapListPageContent() {
	const router = useRouter();
	const { modules, isLoading, error } = useSwapModules();
	const { sortTab, sortReverse, handleSort } = useSort('Available In');

	const sortedModules = useMemo(() => {
		const dir = sortReverse ? -1 : 1;
		return [...modules].sort((a, b) => dir * compareModules(sortTab, a, b));
	}, [modules, sortTab, sortReverse]);

	const { pools, isLoading: isLoadingPools, error: poolError } = useCurvePools();

	// Pools that pair with USDC redeem out of the ecosystem; every other pool is an FX swap inside it
	const { fxPools, redeemPools } = useMemo(
		() => ({
			fxPools: pools.filter((p) => !isRedeemPool(p)),
			redeemPools: pools.filter(isRedeemPool),
		}),
		[pools]
	);

	return (
		<div className="space-y-8">
			<PageHeader
				title="Stable Swap"
				description="Mint fresh stablecoins, or redeem them back into their backed assets, through the swap router. Select a coin to get started."
			/>

			<HeroSteps steps={STEPS} />

			<Table>
				<TableHead headers={HEADERS} colSpan={6} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
				<TableBody>
					{isLoading ? (
						<TableRowEmpty>Loading swap modules...</TableRowEmpty>
					) : error ? (
						<TableRowEmpty>{`Error: ${error}`}</TableRowEmpty>
					) : sortedModules.length === 0 ? (
						<TableRowEmpty>No swap modules available.</TableRowEmpty>
					) : (
						sortedModules.map((m) => (
							<TableRow
								key={m.key}
								headers={HEADERS}
								colSpan={6}
								tab={sortTab}
								onClick={() => router.push(`/dashboard/swap/${m.moduleAddress}/stable`)}
							>
								<div className="flex items-center gap-2">
									<TokenLogo currency={m.coinSymbol} size={6} className="-mr-2" />
									<TokenLogo currency={m.currency} size={6} />
									<span>
										{m.coinSymbol} / {m.currency}
									</span>
								</div>
								<span>
									{formatCompactNumber(formatUnits(m.mintable, 18), 1, '', '', false)} {m.currency}
								</span>
								<span>
									{formatCompactNumber(formatUnits(m.totalMinted, 18), 1, '')} {m.coinSymbol}
								</span>
								<span>{(m.swapInFeePPM / 10_000).toFixed(2)}%</span>
								<span>{(m.swapOutFeePPM / 10_000).toFixed(2)}%</span>
								<span>{m.vaultName || '—'}</span>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>

			<CurvePoolSection
				title="FX Swap"
				description="Swap between the USDU stablecoins (USDU, EURU and CHFU) through Curve pools. These pools stay inside the ecosystem."
				pools={fxPools}
				isLoading={isLoadingPools}
				error={poolError}
				emptyText="No FX pools available."
			/>

			<CurvePoolSection
				title="Redeem Swap"
				description="Redeem out of the ecosystem into USDC through Curve pools. The USDU / USDC pool is the primary exit liquidity for USDU."
				pools={redeemPools}
				isLoading={isLoadingPools}
				error={poolError}
				emptyText="No redeem pools available."
			/>
		</div>
	);
}

export default function SwapListPage() {
	return (
		<>
			<NextSeo title={SEO.swap.title} description={SEO.swap.description} openGraph={SEO.swap.openGraph} />
			<SwapListPageContent />
		</>
	);
}
