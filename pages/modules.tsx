import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useModuleDataAll } from '@/hooks/useModulesData';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRefresh, faFileSignature, faHourglassHalf, faPlugCircleCheck, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { mainnet } from 'viem/chains';
import ModulesMap from '@/components/sections/modules/ModulesMap';
import {
	groupHistoryByModule,
	createAllModules,
	getModuleStatus,
	getModuleCurrency,
	getModuleType,
	moduleKey,
	MODULE_TYPES,
	STATUS_ORDER,
	type ModuleStatusKey,
} from '@/components/sections/modules/helpers';
import Card from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableRowEmpty } from '@/components/ui/table';
import HeroSteps from '@/components/ui/HeroSteps';
import AddressLink from '@/components/ui/AddressLink';
import { useSort } from '@/hooks/ui/useSort';
import type { StablecoinModule, StablecoinModuleHistoryItem } from '@/hooks/useModulesData';
import { formatTimestampLocale, formatDateOnly, formatTimeOnly } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

const HEADERS = ['Module', 'Stablecoin', 'Type', 'Status', 'Expires', 'Created'];
const STATUS_FILTERS: ('all' | ModuleStatusKey)[] = ['all', 'pending', 'active', 'revoked', 'expired'];
const KIND_BADGE = {
	Proposed: 'bg-blue-100 text-blue-700',
	Set: 'bg-green-100 text-green-700',
	Revoked: 'bg-red-100 text-red-700',
};

const STEPS = [
	{
		icon: <FontAwesomeIcon icon={faFileSignature} className="w-3 h-3 text-usdu-card" />,
		title: 'Proposed per stablecoin',
		description:
			'A module is proposed on one stablecoin at a time. The same contract on USDU, EURU and CHFU is three separate modules, each with its own proposal and status.',
	},
	{
		icon: <FontAwesomeIcon icon={faHourglassHalf} className="w-3 h-3 text-usdu-card" />,
		title: 'Timelock and veto',
		description:
			'A proposal waits out a timelock. During that window it can be reviewed and revoked by the DAO; afterwards it is accepted.',
	},
	{
		icon: <FontAwesomeIcon icon={faPlugCircleCheck} className="w-3 h-3 text-usdu-card" />,
		title: 'Active until expiry',
		description:
			'An accepted module may mint and burn that stablecoin, for swaps, adapters and savings, until its expiry date passes or it is revoked.',
	},
];

const isNever = (v: bigint) => v >= BigInt(10) ** BigInt(12);
const fmtExpiry = (v: bigint) => (isNever(v) ? 'Never' : formatTimestampLocale(v));
const cmpBig = (a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0);

function timelockStatus(createdAt: bigint, timelock: bigint | null) {
	if (!timelock) return null;
	const end = Number(createdAt) + Number(timelock);
	const now = Math.floor(Date.now() / 1000);
	if (now >= end) return { isPast: true, display: formatTimestampLocale(BigInt(end)) };
	const r = end - now;
	return { isPast: false, display: `${Math.floor(r / 3600)}h ${Math.floor((r % 3600) / 60)}m ${r % 60}s remaining` };
}

function Header({ children }: { children: React.ReactNode }) {
	return (
		<section className="relative min-h-screen px-4 pt-32 text-center bg-usdu-card">
			<h1 className="text-3xl font-bold text-usdu-black mb-2">Modules</h1>
			{children}
		</section>
	);
}

export default function ModulesPage() {
	const { modules: allModulesRaw, history: allHistory, isLoading, error } = useModuleDataAll(mainnet.id);

	const [statusFilter, setStatusFilter] = useState<'all' | ModuleStatusKey>('all');
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState<string | null>(null);
	const [, setTick] = useState(0);
	const { sortTab, sortReverse, handleSort } = useSort('Status');
	const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

	// Per stablecoin + module: the same module on another stablecoin is a separate entry with its own history
	const historyByModule = useMemo(() => groupHistoryByModule(allHistory), [allHistory]);
	const allModules = useMemo(() => createAllModules(allModulesRaw, historyByModule), [allModulesRaw, historyByModule]);
	const getStatus = useMemo(
		() => (m: StablecoinModule) => getModuleStatus(m, historyByModule),
		[historyByModule]
	);

	const inTab = allModules;

	const rows = useMemo(() => {
		const q = search.trim().toLowerCase();
		const dir = sortReverse ? -1 : 1;
		const filtered = inTab.filter((m) => {
			if (statusFilter !== 'all' && getStatus(m).status !== statusFilter) return false;
			if (!q) return true;
			return (
				m.message.toLowerCase().includes(q) ||
				(m.messageUpdated ?? '').toLowerCase().includes(q) ||
				m.module.toLowerCase().includes(q)
			);
		});
		const cmp = (a: StablecoinModule, b: StablecoinModule) => {
			switch (sortTab) {
				case 'Module':
					return a.message.localeCompare(b.message);
				case 'Stablecoin':
					return (getModuleCurrency(a.stablecoin) ?? '').localeCompare(getModuleCurrency(b.stablecoin) ?? '');
				case 'Type':
					return getModuleType(a.message).localeCompare(getModuleType(b.message));
				case 'Expires':
					return cmpBig(a.expiredAt, b.expiredAt);
				case 'Created':
					return cmpBig(b.createdAt, a.createdAt);
				default:
					return STATUS_ORDER[getStatus(a).status] - STATUS_ORDER[getStatus(b).status];
			}
		};
		return [...filtered].sort((a, b) => dir * cmp(a, b));
	}, [inTab, search, statusFilter, sortTab, sortReverse, getStatus]);

	// live timelock countdown while a row is expanded
	useEffect(() => {
		if (!selected) return;
		const i = setInterval(() => setTick((t) => t + 1), 1000);
		return () => clearInterval(i);
	}, [selected]);

	// clicking a map node reveals the row; make sure filters don't hide it
	const selectFromMap = (key: string | null) => {
		setSelected(key);
		if (!key) return;
		if (!rows.some((m) => moduleKey(m.stablecoin, m.module) === key)) {
			setSearch('');
			setStatusFilter('all');
		}
		setTimeout(() => rowRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
	};

	if (isLoading) {
		return (
			<>
				<NextSeo title={SEO.modules.title} description={SEO.modules.description} openGraph={SEO.modules.openGraph} />
				<Header>
					<p className="text-text-secondary">Loading modules...</p>
					<div className="flex items-center justify-center py-20">
						<FontAwesomeIcon icon={faRefresh} className="w-8 h-8 text-usdu-orange animate-spin" />
					</div>
				</Header>
			</>
		);
	}

	if (error) {
		return (
			<>
				<NextSeo title={SEO.modules.title} description={SEO.modules.description} openGraph={SEO.modules.openGraph} />
				<Header>
					<p className="text-text-secondary">Manage protocol modules and governance</p>
					<div className="bg-red-50 border border-red-200 rounded-xl mt-12 p-6 md:mx-12">
						<p className="text-red-600">Error loading modules: {error}</p>
					</div>
				</Header>
			</>
		);
	}

	const count = (s: ModuleStatusKey) => inTab.filter((m) => getStatus(m).status === s).length;

	return (
		<>
			<NextSeo title={SEO.modules.title} description={SEO.modules.description} openGraph={SEO.modules.openGraph} />

			<div className="px-4 md:px-8 lg:px-16 pt-32 pb-24 bg-usdu-card min-h-screen space-y-8">
				<div className="text-center">
					<h1 className="text-4xl md:text-5xl font-bold text-usdu-black mb-4">Modules & Adapters</h1>
					<p className="text-lg text-text-secondary max-w-3xl mx-auto">
						Modules are contracts authorised to mint and burn a stablecoin. They are governed by expiration-based
						proposals, per stablecoin.
					</p>
				</div>

				<HeroSteps steps={STEPS} />

				<div className="space-y-4">
					<ModulesMap modules={inTab} getStatus={getStatus} selected={selected} onSelect={selectFromMap} />
					<p className="text-sm text-text-secondary">
						{inTab.length} modules · {count('active')} active · {count('pending')} pending · {count('revoked')} revoked ·{' '}
						{count('expired')} expired
					</p>
				</div>

				<Card variant="panel" className="space-y-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div className="relative md:w-96">
							<FontAwesomeIcon
								icon={faMagnifyingGlass}
								className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary"
							/>
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search by name, message or address"
								className="w-full rounded-lg bg-usdu-bg border border-usdu-surface py-2 pl-9 pr-3 text-sm text-usdu-black outline-none focus:border-brand"
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							{STATUS_FILTERS.map((s) => (
								<button
									key={s}
									onClick={() => setStatusFilter(s)}
									className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
										statusFilter === s ? 'bg-usdu-black text-usdu-card' : 'bg-usdu-bg text-text-secondary hover:bg-usdu-surface'
									}`}
								>
									{s}
								</button>
							))}
						</div>
					</div>

					<Table>
						<TableHead headers={HEADERS} colSpan={6} tab={sortTab} reverse={sortReverse} tabOnChange={handleSort} />
						<TableBody>
							{rows.length === 0 ? (
								<TableRowEmpty>No modules found.</TableRowEmpty>
							) : (
								rows.map((m) => {
									const key = moduleKey(m.stablecoin, m.module);
									const status = getStatus(m);
									const type = MODULE_TYPES[getModuleType(m.message)];
									const history: StablecoinModuleHistoryItem[] = historyByModule[key] ?? [];
									const open = selected === key;
									return (
										<Fragment key={key}>
											<div ref={(el) => { rowRefs.current[key] = el; }} className={open ? 'ring-1 ring-brand rounded-lg' : ''}>
												<TableRow
													headers={HEADERS}
													colSpan={6}
													tab={sortTab}
													onClick={() => setSelected(open ? null : key)}
												>
													<div>
														<div className="font-semibold text-text-primary">{m.message || 'Unnamed Module'}</div>
														<div className="text-xs">{m.module.slice(0, 10)}...{m.module.slice(-6)}</div>
													</div>
													<span>{getModuleCurrency(m.stablecoin) ?? '—'}</span>
													<span className="inline-flex items-center gap-1.5">
														<span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: type.color }} />
														{type.name}
													</span>
													<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
														{status.label}
													</span>
													<span>{fmtExpiry(m.expiredAt)}</span>
													<span>{formatDateOnly(m.createdAt)}</span>
												</TableRow>
											</div>

											{open && (
												<div className="bg-usdu-bg rounded-lg mt-3 mb-2 px-4 pt-5 pb-5 space-y-5 text-sm">
													<div className="flex flex-wrap gap-x-8 gap-y-2">
														<div>
															<p className="text-text-secondary">Module</p>
															<AddressLink address={m.module} type="address" />
														</div>
														<div>
															<p className="text-text-secondary">Stablecoin</p>
															<AddressLink address={m.stablecoin} type="address" />
														</div>
														<div>
															<p className="text-text-secondary">Last updated</p>
															<p className="text-usdu-black">{formatTimestampLocale(m.updatedAt)}</p>
														</div>
													</div>
													{m.messageUpdated && (
														<p className="text-usdu-black">
															<span className="font-medium">Update:</span> {m.messageUpdated}
														</p>
													)}
													<div className="font-medium text-usdu-black">History ({history.length} events)</div>
													{history.map((h, idx) => {
														const tl = timelockStatus(h.createdAt, h.timelock);
														return (
															<div
																key={`${h.txHash}-${h.logIndex}`}
																className={`pb-4 ${idx !== history.length - 1 ? 'border-b border-usdu-surface' : ''}`}
															>
																<div className="flex items-start justify-between mb-3">
																	<div className="flex items-center gap-3">
																		<span className={`px-2 py-1 rounded text-xs font-medium ${KIND_BADGE[h.kind]}`}>{h.kind}</span>
																		<span className="text-usdu-black font-medium">{h.message}</span>
																	</div>
																	<div className="text-xs text-text-secondary text-right">
																		<div>{formatDateOnly(h.createdAt)}</div>
																		<div>{formatTimeOnly(h.createdAt)}</div>
																	</div>
																</div>
																<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
																	<div>
																		<p className="text-text-secondary mb-1">Transaction</p>
																		<AddressLink address={h.txHash} type="tx" />
																	</div>
																	<div>
																		<p className="text-text-secondary mb-1">Caller</p>
																		<AddressLink address={h.caller} type="address" />
																	</div>
																	{h.expiredAt && (
																		<div>
																			<p className="text-text-secondary mb-1">Expires At</p>
																			<p className="text-usdu-black">{fmtExpiry(h.expiredAt)}</p>
																		</div>
																	)}
																	{tl && (
																		<div>
																			<p className="text-text-secondary mb-1">{tl.isPast ? 'Timelock Ended' : 'Timelock'}</p>
																			<p className={tl.isPast ? 'text-usdu-black' : 'text-yellow-600 font-medium'}>{tl.display}</p>
																		</div>
																	)}
																</div>
															</div>
														);
													})}
												</div>
											)}
										</Fragment>
									);
								})
							)}
						</TableBody>
					</Table>
				</Card>
			</div>
		</>
	);
}
