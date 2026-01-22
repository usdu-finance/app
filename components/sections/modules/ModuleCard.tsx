import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faHourglass, faTimesCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import Accordion from '@/components/ui/Accordion';
import AddressLink from '@/components/ui/AddressLink';
import type { StablecoinModule, StablecoinModuleHistoryItem } from '@/hooks/useModulesData';
import { formatTimestampLocale, formatDateOnly, formatTimeOnly } from '@/lib/utils';

interface ModuleCardProps {
	module: StablecoinModule;
	moduleHistory: StablecoinModuleHistoryItem[];
	status: {
		status: string;
		label: string;
		color: string;
		bgColor: string;
	};
}

export default function ModuleCard({ module, moduleHistory, status }: ModuleCardProps) {
	const [, setTick] = useState(0);

	// Update countdown every second
	useEffect(() => {
		const interval = setInterval(() => {
			setTick((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const getTimelockStatus = (createdAt: bigint, timelock: bigint | null) => {
		if (!timelock) return null;

		const timelockEndTime = Number(createdAt) + Number(timelock);
		const now = Math.floor(Date.now() / 1000);
		const isPast = now >= timelockEndTime;

		if (isPast) {
			return {
				isPast: true,
				display: formatTimestampLocale(BigInt(timelockEndTime)),
			};
		} else {
			const remaining = timelockEndTime - now;
			const hours = Math.floor(remaining / 3600);
			const minutes = Math.floor((remaining % 3600) / 60);
			const seconds = remaining % 60;

			return {
				isPast: false,
				display: `${hours}h ${minutes}m ${seconds}s remaining`,
			};
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'active':
				return faCheckCircle;
			case 'pending':
				return faHourglass;
			case 'expired':
				return faTimesCircle;
			case 'revoked':
				return faTimesCircle;
			default:
				return faClock;
		}
	};

	const getKindBadge = (kind: 'Proposed' | 'Revoked' | 'Set') => {
		const badges = {
			Proposed: { color: 'text-blue-700', bgColor: 'bg-blue-100', label: 'Proposed' },
			Set: { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Set' },
			Revoked: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Revoked' },
		};
		const badge = badges[kind];
		return (
			<span className={`px-2 py-1 rounded text-xs font-medium ${badge.bgColor} ${badge.color}`}>
				{badge.label}
			</span>
		);
	};

	return (
		<div className="bg-usdu-card rounded-xl border border-usdu-surface overflow-hidden">
			{/* Module Header */}
			<div className="p-6">
				<div className="flex items-start justify-between mb-4">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-2">
							<h3 className="text-lg font-semibold text-usdu-black">
								{module.message || 'Unnamed Module'}
							</h3>
							<span
								className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color} flex items-center gap-2`}
							>
								<FontAwesomeIcon icon={getStatusIcon(status.status)} className="w-3 h-3" />
								{status.label}
							</span>
						</div>
						<AddressLink address={module.module} type="address" />
						{module.messageUpdated && (
							<p className="text-sm text-usdu-black mb-2">
								<span className="font-medium">Update:</span> {module.messageUpdated}
							</p>
						)}
					</div>
				</div>

				{/* Module Details Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
					<div>
						<p className="text-text-secondary mb-1">Created</p>
						<p className="text-usdu-black font-medium">{formatTimestampLocale(module.createdAt)}</p>
					</div>
					<div>
						<p className="text-text-secondary mb-1">Last Updated</p>
						<p className="text-usdu-black font-medium">{formatTimestampLocale(module.updatedAt)}</p>
					</div>
					<div>
						<p className="text-text-secondary mb-1">Expires</p>
						<p className="text-usdu-black font-medium">{formatTimestampLocale(module.expiredAt)}</p>
					</div>
				</div>
			</div>

			{/* Module History Accordion */}
			{moduleHistory.length > 0 && (
				<div className="">
					<Accordion
						title={
							<div className="flex items-center justify-between w-full">
								<span className="font-medium text-usdu-black">
									History ({moduleHistory.length} events)
								</span>
							</div>
						}
					>
						<div className="space-y-4">
							{moduleHistory.map((historyItem, idx) => {
								const timelockStatus = getTimelockStatus(historyItem.createdAt, historyItem.timelock);

								return (
									<div
										key={`${historyItem.txHash}-${historyItem.logIndex}`}
										className={`pb-4 ${idx !== moduleHistory.length - 1 ? 'border-b border-usdu-surface' : ''}`}
									>
										<div className="flex items-start justify-between mb-3">
											<div className="flex items-center gap-3">
												{getKindBadge(historyItem.kind)}
												<span className="text-sm text-usdu-black font-medium">
													{historyItem.message}
												</span>
											</div>
											<div className="text-xs text-text-secondary text-right">
												<div>{formatDateOnly(historyItem.createdAt)}</div>
												<div>{formatTimeOnly(historyItem.createdAt)}</div>
											</div>
										</div>
										<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
											<div className="order-1">
												<p className="text-text-secondary mb-1">Transaction</p>
												<AddressLink address={historyItem.txHash} type="tx" />
											</div>
											<div className="order-2">
												<p className="text-text-secondary mb-1">Caller</p>
												<AddressLink address={historyItem.caller} type="address" />
											</div>
											{historyItem.expiredAt && (
												<div className="order-3">
													<p className="text-text-secondary mb-1">Expires At</p>
													<p className="text-usdu-black">
														{formatTimestampLocale(historyItem.expiredAt)}
													</p>
												</div>
											)}
											{timelockStatus && (
												<div className="order-4">
													<p className="text-text-secondary mb-1">
														{timelockStatus.isPast ? 'Timelock Ended' : 'Timelock'}
													</p>
													<p
														className={`${timelockStatus.isPast ? 'text-usdu-black' : 'text-yellow-600 font-medium'}`}
													>
														{timelockStatus.display}
													</p>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</Accordion>
				</div>
			)}
		</div>
	);
}
