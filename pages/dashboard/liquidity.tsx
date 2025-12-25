import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDroplet } from '@fortawesome/free-solid-svg-icons';

export default function LiquidityPage() {
	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-usdu-black mb-2">
					Liquidity Management
				</h1>
				<p className="text-usdu-black">
					Manage your liquidity positions and provide liquidity to USDU pools
					for earning rewards and supporting protocol stability.
				</p>
			</div>

			{/* Coming Soon Section */}
			<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
				<div className="text-center">
					<div className="w-16 h-16 bg-usdu-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<FontAwesomeIcon
							icon={faDroplet}
							className="w-8 h-8 text-usdu-orange"
						/>
					</div>
					<h2 className="text-xl font-bold text-usdu-black mb-2">
						Coming Soon
					</h2>
					<p className="text-text-secondary">
						The liquidity management interface is currently under
						development. You'll soon be able to provide liquidity,
						monitor your positions, and earn rewards directly from
						this dashboard.
					</p>
				</div>
			</div>
		</div>
	);
}