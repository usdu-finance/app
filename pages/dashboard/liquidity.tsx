import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDroplet, faPlus, faMinus, faRoute, faBalanceScale, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { usePoolData } from '@/hooks/usePoolData';
import { formatValue } from '@/lib/utils';

export default function LiquidityPage() {
	const poolData = usePoolData();

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">Liquidity</h1>
				<p className="text-usdu-black">
					Provide or remove liquidity from the USDU/USDC pool. Choose the optimal route based on current pool
					conditions.
				</p>
			</div>

			{/* Pool Stats */}
			<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
				<h2 className="text-xl font-bold text-usdu-black mb-4">Pool Statistics</h2>

				{poolData.isLoading && (
					<div className="text-center py-4">
						<p className="text-text-secondary">Loading pool data...</p>
					</div>
				)}

				{poolData.error && (
					<div className="text-center py-4">
						<p className="text-red-500">Error: {poolData.error}</p>
					</div>
				)}

				{!poolData.isLoading && !poolData.error && (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{/* Pool Balances */}
						<div className="space-y-4">
							<h3 className="font-semibold text-usdu-black border-b border-usdu-surface pb-2">
								Pool Balances
							</h3>
							<div className="space-y-3">
								<div>
									<p className="text-sm text-text-secondary">USDC Balance</p>
									<p className="font-medium text-usdu-black">
										{poolData.usdcBalance
											? formatValue((Number(poolData.usdcBalance) / 1e6).toFixed(2), '', '')
											: 'N/A'}
									</p>
									<p className="text-xs text-text-secondary">
										{poolData.usdcRatio ? `${poolData.usdcRatio.toFixed(1)}% of 100%` : ''}
									</p>
								</div>
								<div>
									<p className="text-sm text-text-secondary">USDU Balance</p>
									<p className="font-medium text-usdu-black">
										{poolData.usduBalance
											? formatValue((Number(poolData.usduBalance) / 1e18).toFixed(2), '', '')
											: 'N/A'}
									</p>
									<p className="text-xs text-text-secondary">
										{poolData.usduRatio ? `${poolData.usduRatio.toFixed(1)}% of 100%` : ''}
									</p>
								</div>
							</div>
						</div>

						{/* LP Token Stats */}
						<div className="space-y-4">
							<h3 className="font-semibold text-usdu-black border-b border-usdu-surface pb-2">
								LP Token Stats
							</h3>
							<div className="space-y-3">
								<div>
									<p className="text-sm text-text-secondary">Total LP Supply</p>
									<p className="font-medium text-usdu-black">
										{poolData.totalSupply
											? formatValue((Number(poolData.totalSupply) / 1e18).toFixed(2), '', '')
											: 'N/A'}
									</p>
								</div>
								<div>
									<p className="text-sm text-text-secondary">Adapter LP Holdings</p>
									<p className="font-medium text-usdu-black">
										{poolData.adapterLPBalance
											? formatValue((Number(poolData.adapterLPBalance) / 1e18).toFixed(2), '', '')
											: 'N/A'}
									</p>
									<p className="text-xs text-text-secondary">100%</p>
								</div>
							</div>
						</div>

						{/* Pool Status */}
						<div className="space-y-4">
							<h3 className="font-semibold text-usdu-black border-b border-usdu-surface pb-2">
								Adapter Status
							</h3>
							<div className="space-y-3">
								<div>
									<div className="flex items-center space-x-2">
										<div
											className={`w-3 h-3 rounded-full ${
												poolData.usduRatio && poolData.usduRatio < 50
													? 'bg-green-500'
													: poolData.usduRatio &&
														  poolData.usduRatio >= 50 &&
														  poolData.adapterLPRatio &&
														  poolData.adapterLPRatio > 0
														? 'bg-blue-500'
														: 'bg-gray-400'
											}`}
										></div>
										<p
											className={`font-medium ${
												poolData.usduRatio && poolData.usduRatio < 50
													? 'text-green-600'
													: poolData.usduRatio &&
														  poolData.usduRatio >= 50 &&
														  poolData.adapterLPRatio &&
														  poolData.adapterLPRatio > 0
														? 'text-blue-600'
														: 'text-gray-600'
											}`}
										>
											{poolData.usduRatio && poolData.usduRatio < 50
												? 'Provide with Adapter'
												: poolData.usduRatio &&
													  poolData.usduRatio >= 50 &&
													  poolData.adapterLPRatio &&
													  poolData.adapterLPRatio > 0
													? 'Remove with Adapter'
													: 'Not Available'}
										</p>
									</div>
									<p className="text-xs text-text-secondary">
										{poolData.usduRatio && poolData.usduRatio < 50
											? 'USDU < 50%, adapter can provide liquidity'
											: poolData.usduRatio &&
												  poolData.usduRatio >= 50 &&
												  poolData.adapterLPRatio &&
												  poolData.adapterLPRatio > 0
												? 'USDC > 50%, adapter can remove if profitable'
												: 'Adapter conditions not met'}
									</p>
								</div>
								<div>
									<p className="text-sm text-text-secondary">Total Pool Value</p>
									<p className="font-medium text-usdu-black">
										{poolData.usdcBalance && poolData.usduBalance
											? formatValue(
													(
														Number(poolData.usdcBalance) / 1e6 +
														Number(poolData.usduBalance) / 1e18
													).toFixed(0),
													'',
													''
												)
											: 'N/A'}
									</p>
									<p className="text-xs text-text-secondary">100%</p>
								</div>
							</div>
						</div>

						{/* Recommendations */}
						<div className="space-y-4">
							<h3 className="font-semibold text-usdu-black border-b border-usdu-surface pb-2">
								Recommendation
							</h3>
							<div className="space-y-3">
								<div className="bg-white p-3 rounded-lg">
									<div className="flex items-center space-x-2 mb-2">
										<FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4 text-usdu-orange" />
										<p className="font-medium text-usdu-black">Best Route</p>
									</div>
									<p className="text-sm text-text-secondary">
										{poolData.usduRatio && poolData.usduRatio < 50
											? 'Use Protocol Adapter for better balance and pricing'
											: poolData.usduRatio &&
												  poolData.usduRatio >= 50 &&
												  poolData.adapterLPRatio &&
												  poolData.adapterLPRatio > 0
												? 'Use Protocol Adapter for profitable removal'
												: 'Direct pool interaction available'}
									</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Liquidity Routes */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Direct Pool Route */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="flex items-center space-x-3 mb-4">
						<FontAwesomeIcon icon={faRoute} className="w-6 h-6 text-usdu-orange" />
						<h3 className="text-lg font-bold text-usdu-black">Direct Pool</h3>
					</div>

					<p className="text-text-secondary mb-4">
						Interact directly with the Curve pool using standard add/remove liquidity functions.
					</p>

					<div className="space-y-3 mb-6">
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Route Type</span>
							<span className="text-sm font-medium">Standard Curve</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Gas Cost</span>
							<span className="text-sm font-medium">Lower</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Price Impact</span>
							<span className="text-sm font-medium">Standard</span>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<button className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors">
							<FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
							<span>Add Liquidity</span>
						</button>
						<button className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition-colors">
							<FontAwesomeIcon icon={faMinus} className="w-4 h-4" />
							<span>Remove</span>
						</button>
					</div>
				</div>

				{/* Protocol Adapter Route */}
				<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
					<div className="flex items-center space-x-3 mb-4">
						<FontAwesomeIcon icon={faBalanceScale} className="w-6 h-6 text-usdu-orange" />
						<h3 className="text-lg font-bold text-usdu-black">Protocol Adapter</h3>
						{(poolData.usduRatio && poolData.usduRatio < 50) ||
						(poolData.usduRatio &&
							poolData.usduRatio >= 50 &&
							poolData.adapterLPRatio &&
							poolData.adapterLPRatio > 0) ? (
							<span className="bg-usdu-orange/10 text-usdu-orange px-2 py-1 rounded text-xs font-medium">
								Recommended
							</span>
						) : null}
					</div>

					<p className="text-text-secondary mb-4">
						Use the protocol adapter to mint USDU and balance the pool for better pricing.
					</p>

					<div className="space-y-3 mb-6">
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Route Type</span>
							<span className="text-sm font-medium">Protocol Adapter</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Gas Cost</span>
							<span className="text-sm font-medium">Higher</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Price Impact</span>
							<span className="text-sm font-medium text-green-600">Better</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-text-secondary">Pool Balance</span>
							<span className="text-sm font-medium text-green-600">Improved</span>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<button className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors">
							<FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
							<span>Add (USDC)</span>
						</button>
						<button
							disabled
							className="flex items-center justify-center space-x-2 bg-gray-400 text-white px-4 py-3 rounded-lg cursor-not-allowed"
						>
							<FontAwesomeIcon icon={faMinus} className="w-4 h-4" />
							<span>Not Available</span>
						</button>
					</div>

					<div className="mt-3 p-3 bg-white rounded-lg">
						<p className="text-xs text-text-secondary">
							<FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3 mr-1" />
							Adapter only supports adding USDC liquidity when pool is imbalanced
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
