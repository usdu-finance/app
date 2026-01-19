import React, { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import ModuleCard from './ModuleCard';
import type { StablecoinModule, StablecoinModuleHistoryItem } from '@/hooks/useModulesData';
import { motion } from 'framer-motion';

interface ModulesListProps {
	sortedModules: StablecoinModule[];
	historyByModule: Record<string, StablecoinModuleHistoryItem[]>;
	getModuleStatus: (module: StablecoinModule) => {
		status: string;
		label: string;
		color: string;
		bgColor: string;
	};
}

export default function ModulesList({ sortedModules, historyByModule, getModuleStatus }: ModulesListProps) {
	const [showAll, setShowAll] = useState(false);

	// Filter modules: show active/pending by default, show all when showAll is true
	const displayedModules = useMemo(() => {
		if (showAll) return sortedModules;
		// Only show active and pending modules by default (hide expired and revoked)
		return sortedModules.filter((m) => {
			const status = getModuleStatus(m).status;
			return status === 'active' || status === 'pending';
		});
	}, [sortedModules, showAll, getModuleStatus]);

	// Count hidden modules to determine if toggle button should be shown
	const hiddenModulesCount = useMemo(() => {
		return sortedModules.filter((m) => {
			const status = getModuleStatus(m).status;
			return status !== 'active' && status !== 'pending';
		}).length;
	}, [sortedModules, getModuleStatus]);

	return (
		<div className="container mx-auto px-4 pb-12 pt-24">
			<div className="space-y-8 max-w-7xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="text-center mb-16"
				>
					<h2 className="text-4xl md:text-5xl font-bold text-usdu-black mb-6">Active Protocol Modules</h2>
					<p className="text-xl text-text-secondary max-w-3xl mx-auto">
						View all protocol modules and adapters with their current status, expiration dates, and proposal history. Monitor active modules and pending changes in real-time.
					</p>
				</motion.div>

				{displayedModules.length === 0 ? (
					<div className="bg-usdu-bg p-12 rounded-xl border border-usdu-surface text-center">
						<p className="text-text-secondary">
							{showAll ? 'No modules found' : 'No active modules found'}
						</p>
					</div>
				) : (
					displayedModules.map((module) => (
						<ModuleCard
							key={module.module}
							module={module}
							moduleHistory={historyByModule[module.module.toLowerCase()] || []}
							status={getModuleStatus(module)}
						/>
					))
				)}

				{/* Toggle Show All Button */}
				{hiddenModulesCount > 0 && (
					<div className="flex justify-center pt-6">
						<button
							onClick={() => setShowAll(!showAll)}
							className="px-6 py-3 bg-usdu-surface hover:bg-usdu-orange/10 border border-usdu-surface hover:border-usdu-orange/30 rounded-lg transition-colors flex items-center gap-2 text-usdu-black"
						>
							<FontAwesomeIcon icon={showAll ? faEyeSlash : faEye} className="w-4 h-4" />
							{showAll ? 'Hide Expired/Revoked' : `Show All Modules (${hiddenModulesCount} hidden)`}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
