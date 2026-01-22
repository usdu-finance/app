import { useUSDUTermMaxMarkets } from '@/hooks/useTermMaxMarkets';
import Tabs, { Tab } from '@/components/ui/Tabs';
import AddressDisplay from '@/components/ui/AddressDisplay';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

export default function BorrowPage() {
	const { markets, isLoading, error } = useUSDUTermMaxMarkets();
	const [selectedCollateralIndex, setSelectedCollateralIndex] = useState(0);
	const [selectedMaturityIndex, setSelectedMaturityIndex] = useState(0);
	const [isContractsExpanded, setIsContractsExpanded] = useState(false);

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
												<AddressDisplay
													label="Market"
													address={termMaxMarket.market.contracts.marketAddr}
													type="address"
												/>
												<AddressDisplay
													label="Router"
													address={termMaxMarket.market.contracts.routerAddr}
													type="address"
												/>
												<AddressDisplay
													label="Underlying"
													address={termMaxMarket.market.contracts.underlyingAddr}
													type="address"
												/>
												<AddressDisplay
													label="Collateral"
													address={termMaxMarket.market.contracts.collateralAddr}
													type="address"
												/>
												<AddressDisplay
													label="FT Token"
													address={termMaxMarket.market.contracts.ftAddr}
													type="address"
												/>
												<AddressDisplay
													label="XT Token"
													address={termMaxMarket.market.contracts.xtAddr}
													type="address"
												/>
												<AddressDisplay
													label="GT Token"
													address={termMaxMarket.market.contracts.gtAddr}
													type="address"
												/>
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
