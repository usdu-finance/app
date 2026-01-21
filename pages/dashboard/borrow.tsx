import { useUSDUTermMaxMarkets } from '@/hooks/useTermMaxMarkets';
import Tabs, { Tab } from '@/components/ui/Tabs';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

export default function BorrowPage() {
	const { markets, isLoading, error } = useUSDUTermMaxMarkets();
	const [selectedCollateralIndex, setSelectedCollateralIndex] = useState(0);
	const [selectedMaturityIndex, setSelectedMaturityIndex] = useState(0);
	const [isContractsExpanded, setIsContractsExpanded] = useState(false);
	const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

	// Get unique collaterals from markets
	const uniqueCollaterals = markets.reduce(
		(acc, market) => {
			if (market.collateral && !acc.find((c) => c?.contractAddress === market.collateral?.contractAddress)) {
				acc.push(market.collateral);
			}
			return acc;
		},
		[] as (typeof markets)[0]['collateral'][]
	);

	// Filter markets by selected collateral
	const selectedCollateral = uniqueCollaterals[selectedCollateralIndex];
	const collateralFilteredMarkets = selectedCollateral
		? markets.filter((market) => market.collateral?.contractAddress === selectedCollateral.contractAddress)
		: markets;

	// Get unique maturities for selected collateral
	const uniqueMaturities = collateralFilteredMarkets.reduce(
		(acc, market) => {
			const maturityDate = new Date(market.market.maturity);
			const maturityKey = maturityDate.toISOString().split('T')[0]; // YYYY-MM-DD format

			if (!acc.find((m) => m.key === maturityKey)) {
				acc.push({
					key: maturityKey,
					date: maturityDate,
					displayName: maturityDate.toLocaleDateString('en-US', {
						month: 'short',
						day: '2-digit',
						year: 'numeric',
					}),
					daysToMaturity: market.daysToMaturity,
				});
			}
			return acc;
		},
		[] as Array<{
			key: string;
			date: Date;
			displayName: string;
			daysToMaturity: number | null;
		}>
	);

	// Sort maturities by date
	uniqueMaturities.sort((a, b) => a.date.getTime() - b.date.getTime());

	// Reset maturity selection when collateral changes
	useEffect(() => {
		setSelectedMaturityIndex(0);
	}, [selectedCollateralIndex]);

	// Filter markets by selected collateral and maturity
	const selectedMaturity = uniqueMaturities[selectedMaturityIndex];
	const finalFilteredMarkets = selectedMaturity
		? collateralFilteredMarkets.filter((market) => {
				const marketMaturityKey = new Date(market.market.maturity).toISOString().split('T')[0];
				return marketMaturityKey === selectedMaturity.key;
			})
		: collateralFilteredMarkets;

	// Copy address to clipboard
	const copyToClipboard = async (address: string) => {
		try {
			await navigator.clipboard.writeText(address);
			setCopiedAddress(address);
			setTimeout(() => setCopiedAddress(null), 2000);
		} catch (err) {
			console.error('Failed to copy address:', err);
		}
	};

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">Borrow</h1>
				<p className="text-usdu-black">
					Select a suitable collateral and maturity to initiate a borrow action. If your desired terms
					aren&apos;t available, you can create a custom order.
				</p>
			</div>

			{/* Step 1: Collateral Tabs */}
			{!isLoading && !error && uniqueCollaterals.length > 0 && (
				<div>
					<h2 className="text-xl font-bold text-usdu-black mb-4">Select Collateral</h2>
					<Tabs selectedIndex={selectedCollateralIndex} onSelectionChange={setSelectedCollateralIndex}>
						{uniqueCollaterals.map((collateral, index) => (
							<Tab key={collateral?.contractAddress || index} value={collateral?.contractAddress || index}>
								<div className="flex items-center space-x-2">
									{collateral?.icon && (
										<img
											src={collateral.icon}
											alt={collateral.symbol}
											className="w-5 h-5 rounded-full"
										/>
									)}
									<span>{collateral?.symbol || 'Unknown'}</span>
								</div>
							</Tab>
						))}
					</Tabs>
				</div>
			)}

			{/* Step 2: Maturity Tabs */}
			{!isLoading && !error && selectedCollateral && uniqueMaturities.length > 0 && (
				<div>
					<h2 className="text-xl font-bold text-usdu-black mb-4">Select Maturity</h2>
					<Tabs selectedIndex={selectedMaturityIndex} onSelectionChange={setSelectedMaturityIndex}>
						{uniqueMaturities.map((maturity, index) => (
							<Tab key={maturity.key} value={maturity.key}>
								<div className="text-center">
									<div className="font-medium">{maturity.displayName}</div>
									<div className="text-xs text-text-secondary">
										{maturity.daysToMaturity !== null && maturity.daysToMaturity >= 0
											? `${maturity.daysToMaturity} days`
											: 'Expired'}
									</div>
								</div>
							</Tab>
						))}
					</Tabs>
				</div>
			)}

			{/* Market Details */}
			{!isLoading && !error && selectedCollateral && selectedMaturity && (
				<div>
					{finalFilteredMarkets.length === 0 && (
						<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
							<div className="text-center py-8">
								<p className="text-text-secondary">
									No markets found for {selectedCollateral.symbol} with {selectedMaturity.displayName}{' '}
									maturity
								</p>
							</div>
						</div>
					)}

					{finalFilteredMarkets.length > 0 && (
						<div className="space-y-6">
							{finalFilteredMarkets.map((termMaxMarket, index) => (
								<div
									key={index}
									className="bg-usdu-bg p-4 sm:p-6 rounded-lg border border-usdu-surface"
								>
									{/* Market Header */}
									<div className="border-b border-usdu-surface pb-4 mb-6">
										<div className="flex flex-wrap items-center gap-2">
											<h3 className="text-xl font-bold text-usdu-black">
												{termMaxMarket.market.symbol}
											</h3>
											<span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
												{termMaxMarket.market.version}
											</span>
											{termMaxMarket.isExpired && (
												<span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">
													Expired
												</span>
											)}
										</div>
									</div>

									{/* Market Details Grid */}
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
										{/* Basic Information */}
										<div className="space-y-4">
											<h4 className="font-semibold text-usdu-black border-b border-usdu-surface pb-2">
												Basic Information
											</h4>
											<div className="space-y-3">
												<div>
													<p className="text-sm text-text-secondary">Underlying Asset</p>
													<div className="flex items-center space-x-2 mt-1">
														{termMaxMarket.underlying?.icon && (
															<img
																src={termMaxMarket.underlying.icon}
																alt={termMaxMarket.underlying.symbol}
																className="w-5 h-5 rounded-full"
															/>
														)}
														<p className="font-medium text-usdu-black">
															{termMaxMarket.underlying?.symbol || 'Unknown'}
														</p>
													</div>
												</div>
												<div>
													<p className="text-sm text-text-secondary">Collateral Asset</p>
													<div className="flex items-center space-x-2 mt-1">
														{termMaxMarket.collateral?.icon && (
															<img
																src={termMaxMarket.collateral.icon}
																alt={termMaxMarket.collateral.symbol}
																className="w-5 h-5 rounded-full"
															/>
														)}
														<p className="font-medium text-usdu-black">
															{termMaxMarket.collateral?.symbol || 'Unknown'}
														</p>
													</div>
												</div>
												<div>
													<p className="text-sm text-text-secondary">Maturity</p>
													<p className="font-medium text-usdu-black">
														{new Date(termMaxMarket.market.maturity).toLocaleDateString(
															'en-US',
															{
																month: 'short',
																day: '2-digit',
																year: 'numeric',
															}
														)}
													</p>
													<p className="text-xs text-text-secondary">
														{termMaxMarket.daysToMaturity !== null &&
														termMaxMarket.daysToMaturity >= 0
															? `${termMaxMarket.daysToMaturity} days remaining`
															: 'Expired'}
													</p>
												</div>
												<div>
													<p className="text-sm text-text-secondary">Borrow Rate</p>
													<p className="font-medium text-usdu-black">
														{termMaxMarket.collection?.sortedOrderStats?.[0]?.borrowApy
															? `${(termMaxMarket.collection.sortedOrderStats[0].borrowApy * 100).toFixed(2)}%`
															: 'N/A'}
													</p>
												</div>
											</div>
										</div>

										{/* Risk Parameters */}
										<div className="space-y-4">
											<h4 className="font-semibold text-usdu-black border-b border-usdu-surface pb-2">
												Risk Parameters
											</h4>
											<div className="space-y-3">
												<div>
													<p className="text-sm text-text-secondary">Max LTV</p>
													<p className="font-medium text-usdu-black">
														{(parseInt(termMaxMarket.market.maxLtv) / 1000000).toFixed(1)}%
													</p>
												</div>
												<div>
													<p className="text-sm text-text-secondary">Liquidation LTV</p>
													<p className="font-medium text-red-600">
														{(
															parseInt(termMaxMarket.market.liquidationLtv) / 1000000
														).toFixed(1)}
														%
													</p>
												</div>
												<div>
													<p className="text-sm text-text-secondary">Liquidatable</p>
													<p
														className={`font-medium ${termMaxMarket.market.liquidatable ? 'text-red-600' : 'text-green-600'}`}
													>
														{termMaxMarket.market.liquidatable ? 'Yes' : 'No'}
													</p>
												</div>
												<div>
													<p className="text-sm text-text-secondary">Liquidation Window</p>
													<p className="font-medium text-usdu-black">
														{(termMaxMarket.market.liquidationWindowSeconds / 3600).toFixed(
															1
														)}{' '}
														hours
													</p>
												</div>
											</div>
										</div>

										{/* Fee Structure */}
										<div className="space-y-4">
											<h4 className="font-semibold text-usdu-black border-b border-usdu-surface pb-2">
												Fee Structure
											</h4>
											<div className="space-y-3">
												<div>
													<p className="text-sm text-text-secondary">Lend Maker Fee</p>
													<p className="font-medium text-usdu-black">
														{(
															parseInt(
																termMaxMarket.market.defaultFeeConfig.lendMakerFeeRatio
															) / 1000000
														).toFixed(1)}
														%
													</p>
												</div>
												<div>
													<p className="text-sm text-text-secondary">Lend Taker Fee</p>
													<p className="font-medium text-usdu-black">
														{(
															parseInt(
																termMaxMarket.market.defaultFeeConfig.lendTakerFeeRatio
															) / 1000000
														).toFixed(1)}
														%
													</p>
												</div>
												<div>
													<p className="text-sm text-text-secondary">Borrow Maker Fee</p>
													<p className="font-medium text-usdu-black">
														{(
															parseInt(
																termMaxMarket.market.defaultFeeConfig
																	.borrowMakerFeeRatio
															) / 1000000
														).toFixed(1)}
														%
													</p>
												</div>
												<div>
													<p className="text-sm text-text-secondary">Borrow Taker Fee</p>
													<p className="font-medium text-usdu-black">
														{(
															parseInt(
																termMaxMarket.market.defaultFeeConfig
																	.borrowTakerFeeRatio
															) / 1000000
														).toFixed(1)}
														%
													</p>
												</div>
											</div>
										</div>

										{/* Capacity & Liquidity */}
										<div className="space-y-4">
											<h4 className="font-semibold text-usdu-black border-b border-usdu-surface pb-2">
												Capacity & Liquidity
											</h4>
											<div className="space-y-3">
												<div>
													<p className="text-sm text-text-secondary">Borrow Capacity (USD)</p>
													<p className="font-medium text-usdu-black">
														{termMaxMarket.collection?.sortedOrderStats?.[0]
															?.borrowCapacityUsdValue
															? `$${termMaxMarket.collection.sortedOrderStats[0].borrowCapacityUsdValue.toLocaleString()}`
															: 'N/A'}
													</p>
												</div>
												<div>
													<p className="text-sm text-text-secondary">
														Borrow Capacity (Amount)
													</p>
													<p className="font-medium text-usdu-black">
														{termMaxMarket.collection?.sortedOrderStats?.[0]
															?.borrowCapacityAmount
															? parseFloat(
																	termMaxMarket.collection.sortedOrderStats[0]
																		.borrowCapacityAmount
																).toLocaleString(undefined, {
																	minimumFractionDigits: 0,
																	maximumFractionDigits: 2,
																})
															: 'N/A'}
													</p>
												</div>
												{/* <div>
														<p className="text-sm text-text-secondary">
															Lend Capacity (USD)
														</p>
														<p className="font-medium text-usdu-black">
															{termMaxMarket
																.collection
																?.sortedOrderStats?.[0]
																?.lendCapacityUsdValue !==
															undefined
																? `$${termMaxMarket.collection.sortedOrderStats[0].lendCapacityUsdValue.toLocaleString()}`
																: 'N/A'}
														</p>
													</div> */}
												<div>
													<p className="text-sm text-text-secondary">Leverage Ratio</p>
													<p className="font-medium text-usdu-black">
														{termMaxMarket.collection?.sortedOrderStats?.[0]?.leverageRatio
															? `${termMaxMarket.collection.sortedOrderStats[0].leverageRatio.toFixed(2)}x`
															: 'N/A'}
													</p>
												</div>
												<div>
													<p className="text-sm text-text-secondary">Leverage APY</p>
													<p
														className={`font-medium ${
															termMaxMarket.collection?.sortedOrderStats?.[0]?.leverageApy
																? termMaxMarket.collection.sortedOrderStats[0]
																		.leverageApy >= 0
																	? 'text-green-600'
																	: 'text-red-600'
																: 'text-usdu-black'
														}`}
													>
														{termMaxMarket.collection?.sortedOrderStats?.[0]
															?.leverageApy !== undefined
															? `${(termMaxMarket.collection.sortedOrderStats[0].leverageApy * 100).toFixed(2)}%`
															: 'N/A'}
													</p>
												</div>
											</div>
										</div>
									</div>

									{/* Contract Addresses - Collapsible Accordion */}
									<div className="mt-6 pt-6 border-t border-usdu-surface">
										<button
											onClick={() => setIsContractsExpanded(!isContractsExpanded)}
											className="w-full flex items-center justify-between text-left hover:bg-usdu-surface/30 p-2 rounded transition-colors"
										>
											<h4 className="font-semibold text-usdu-black">Contract Addresses</h4>
											<FontAwesomeIcon
												icon={isContractsExpanded ? faChevronUp : faChevronDown}
												className="w-4 h-4 text-usdu-black"
											/>
										</button>

										{isContractsExpanded && (
											<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
												{/* Market Address */}
												<div className="bg-gray-50 p-3 rounded-lg">
													<p className="text-sm text-text-secondary mb-2">Market</p>
													<div className="flex items-center justify-between">
														<p className="font-mono text-xs text-usdu-black break-all mr-3">
															{termMaxMarket.market.contracts.marketAddr}
														</p>
														<button
															onClick={() =>
																copyToClipboard(
																	termMaxMarket.market.contracts.marketAddr
																)
															}
															className="flex-shrink-0 p-2 hover:bg-white rounded transition-colors"
															title="Copy address"
														>
															<FontAwesomeIcon
																icon={
																	copiedAddress ===
																	termMaxMarket.market.contracts.marketAddr
																		? faCheck
																		: faCopy
																}
																className={`w-3 h-3 ${copiedAddress === termMaxMarket.market.contracts.marketAddr ? 'text-green-600' : 'text-usdu-black'}`}
															/>
														</button>
													</div>
												</div>

												{/* Router Address */}
												<div className="bg-gray-50 p-3 rounded-lg">
													<p className="text-sm text-text-secondary mb-2">Router</p>
													<div className="flex items-center justify-between">
														<p className="font-mono text-xs text-usdu-black break-all mr-3">
															{termMaxMarket.market.contracts.routerAddr}
														</p>
														<button
															onClick={() =>
																copyToClipboard(
																	termMaxMarket.market.contracts.routerAddr
																)
															}
															className="flex-shrink-0 p-2 hover:bg-white rounded transition-colors"
															title="Copy address"
														>
															<FontAwesomeIcon
																icon={
																	copiedAddress ===
																	termMaxMarket.market.contracts.routerAddr
																		? faCheck
																		: faCopy
																}
																className={`w-3 h-3 ${copiedAddress === termMaxMarket.market.contracts.routerAddr ? 'text-green-600' : 'text-usdu-black'}`}
															/>
														</button>
													</div>
												</div>

												{/* Underlying Address */}
												<div className="bg-gray-50 p-3 rounded-lg">
													<p className="text-sm text-text-secondary mb-2">Underlying</p>
													<div className="flex items-center justify-between">
														<p className="font-mono text-xs text-usdu-black break-all mr-3">
															{termMaxMarket.market.contracts.underlyingAddr}
														</p>
														<button
															onClick={() =>
																copyToClipboard(
																	termMaxMarket.market.contracts.underlyingAddr
																)
															}
															className="flex-shrink-0 p-2 hover:bg-white rounded transition-colors"
															title="Copy address"
														>
															<FontAwesomeIcon
																icon={
																	copiedAddress ===
																	termMaxMarket.market.contracts.underlyingAddr
																		? faCheck
																		: faCopy
																}
																className={`w-3 h-3 ${copiedAddress === termMaxMarket.market.contracts.underlyingAddr ? 'text-green-600' : 'text-usdu-black'}`}
															/>
														</button>
													</div>
												</div>

												{/* Collateral Address */}
												<div className="bg-gray-50 p-3 rounded-lg">
													<p className="text-sm text-text-secondary mb-2">Collateral</p>
													<div className="flex items-center justify-between">
														<p className="font-mono text-xs text-usdu-black break-all mr-3">
															{termMaxMarket.market.contracts.collateralAddr}
														</p>
														<button
															onClick={() =>
																copyToClipboard(
																	termMaxMarket.market.contracts.collateralAddr
																)
															}
															className="flex-shrink-0 p-2 hover:bg-white rounded transition-colors"
															title="Copy address"
														>
															<FontAwesomeIcon
																icon={
																	copiedAddress ===
																	termMaxMarket.market.contracts.collateralAddr
																		? faCheck
																		: faCopy
																}
																className={`w-3 h-3 ${copiedAddress === termMaxMarket.market.contracts.collateralAddr ? 'text-green-600' : 'text-usdu-black'}`}
															/>
														</button>
													</div>
												</div>

												{/* FT Address */}
												<div className="bg-gray-50 p-3 rounded-lg">
													<p className="text-sm text-text-secondary mb-2">FT Token</p>
													<div className="flex items-center justify-between">
														<p className="font-mono text-xs text-usdu-black break-all mr-3">
															{termMaxMarket.market.contracts.ftAddr}
														</p>
														<button
															onClick={() =>
																copyToClipboard(termMaxMarket.market.contracts.ftAddr)
															}
															className="flex-shrink-0 p-2 hover:bg-white rounded transition-colors"
															title="Copy address"
														>
															<FontAwesomeIcon
																icon={
																	copiedAddress ===
																	termMaxMarket.market.contracts.ftAddr
																		? faCheck
																		: faCopy
																}
																className={`w-3 h-3 ${copiedAddress === termMaxMarket.market.contracts.ftAddr ? 'text-green-600' : 'text-usdu-black'}`}
															/>
														</button>
													</div>
												</div>

												{/* XT Address */}
												<div className="bg-gray-50 p-3 rounded-lg">
													<p className="text-sm text-text-secondary mb-2">XT Token</p>
													<div className="flex items-center justify-between">
														<p className="font-mono text-xs text-usdu-black break-all mr-3">
															{termMaxMarket.market.contracts.xtAddr}
														</p>
														<button
															onClick={() =>
																copyToClipboard(termMaxMarket.market.contracts.xtAddr)
															}
															className="flex-shrink-0 p-2 hover:bg-white rounded transition-colors"
															title="Copy address"
														>
															<FontAwesomeIcon
																icon={
																	copiedAddress ===
																	termMaxMarket.market.contracts.xtAddr
																		? faCheck
																		: faCopy
																}
																className={`w-3 h-3 ${copiedAddress === termMaxMarket.market.contracts.xtAddr ? 'text-green-600' : 'text-usdu-black'}`}
															/>
														</button>
													</div>
												</div>

												{/* GT Address */}
												<div className="bg-gray-50 p-3 rounded-lg">
													<p className="text-sm text-text-secondary mb-2">GT Token</p>
													<div className="flex items-center justify-between">
														<p className="font-mono text-xs text-usdu-black break-all mr-3">
															{termMaxMarket.market.contracts.gtAddr}
														</p>
														<button
															onClick={() =>
																copyToClipboard(termMaxMarket.market.contracts.gtAddr)
															}
															className="flex-shrink-0 p-2 hover:bg-white rounded transition-colors"
															title="Copy address"
														>
															<FontAwesomeIcon
																icon={
																	copiedAddress ===
																	termMaxMarket.market.contracts.gtAddr
																		? faCheck
																		: faCopy
																}
																className={`w-3 h-3 ${copiedAddress === termMaxMarket.market.contracts.gtAddr ? 'text-green-600' : 'text-usdu-black'}`}
															/>
														</button>
													</div>
												</div>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Loading and Error States */}
			{isLoading && (
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-text-secondary">Loading markets...</p>
					</div>
				</div>
			)}

			{error && (
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-red-500">Error: {error}</p>
					</div>
				</div>
			)}

			{!isLoading && !error && markets.length === 0 && (
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="text-center py-8">
						<p className="text-text-secondary">No markets found</p>
					</div>
				</div>
			)}
		</div>
	);
}
