import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Address } from 'viem';
import type { StablecoinModule } from '@/hooks/useModulesData';
import { shortenAddress } from '@/lib/utils';
import { GLASS } from '@/components/pages/godeye/GodEyeUi';
import type { ModuleFigures } from '@/hooks/useModuleFigures';
import { expiryText, proposalTiming, matchesStatus, type PendingProposal } from './helpers';
import {
	figureRows,
	moduleFigureRows,
	MODULE_CURRENCIES,
	MODULE_TYPES,
	getModuleCurrency,
	getModuleType,
	moduleKey,
	type ModuleStatusKey,
	type ModuleType,
} from './helpers';
import { ModulesMapEngine, type MapNodeInput } from './modulesMap.engine';

interface ModulesMapProps {
	modules: StablecoinModule[];
	getStatus: (m: StablecoinModule) => { status: ModuleStatusKey; label: string; pending: PendingProposal | null };
	selected: string | null;
	onSelect: (key: string | null) => void;
	/** on-chain figures by lowercase module address */
	figures?: Map<string, ModuleFigures>;
}

const short = (s: string) => (s.length > 24 ? s.slice(0, 23).trimEnd() + '…' : s);
type Reg = { m: StablecoinModule; label: string; status: ModuleStatusKey; pending: PendingProposal | null; currency: string; key: string };
const TABS = ['all', 'pending', 'active', 'revoked', 'expired'] as const;
const BTN = `${GLASS} w-8 h-8 flex items-center justify-center text-sm hover:bg-white`;

/** Draggable / zoomable canvas map in the style of GodEye: one hub per stablecoin, modules relaxed around it. */
export default function ModulesMap({ modules, getStatus, selected, onSelect, figures }: ModulesMapProps) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const engine = useRef<ModulesMapEngine | null>(null);
	const cb = useRef({ selected, onSelect });
	cb.current = { selected, onSelect };
	const [tip, setTip] = useState<{ id: string; x: number; y: number } | null>(null);

	const [mapSel, setMapSel] = useState<string | null>(null);
	const [tab, setTab] = useState<(typeof TABS)[number]>('all');

	const { input, byKey, hubStats } = useMemo(() => {
		const input: MapNodeInput[] = [];
		// a module registered on several stablecoins becomes one shared node, keyed by its address
		const byKey = new Map<string, Reg[]>();
		const groups = new Map<string, Reg[]>();
		modules.forEach((m) => {
			const currency = getModuleCurrency(m.stablecoin);
			if (!currency) return;
			const s = getStatus(m);
			const reg: Reg = { m, label: s.label, status: s.status, pending: s.pending, currency, key: moduleKey(m.stablecoin, m.module) };
			const id = m.module.toLowerCase();
			groups.set(id, [...(groups.get(id) ?? []), reg]);
		});
		const isInactive = (s: ModuleStatusKey) => s === 'expired' || s === 'revoked' || s === 'unknown';
		const hubIndex = (r: Reg) => MODULE_CURRENCIES.findIndex((c) => c.currency === r.currency);
		// per stablecoin aggregates over ALL registrations (independent of the toggle); shared modules are excluded
		// because their figures belong to the contract and would be counted once per stablecoin
		const hubStats = MODULE_CURRENCIES.map((c) => {
			const own: Reg[] = [];
			const sharedIds: string[] = [];
			let shared = 0;
			groups.forEach((regs, id) => {
				const hit = regs.find((r) => r.currency === c.currency);
				if (!hit) return;
				if (regs.length > 1) {
					shared++;
					sharedIds.push(id);
				} else own.push(hit);
			});
			const all = own.length + shared;
			const active = [...groups.values()].filter((regs) =>
				regs.some((r) => r.currency === c.currency && !isInactive(r.status))
			).length;
			return { currency: c.currency, own, shared, sharedIds, all, active };
		});
		const order: ModuleType[] = ['curve', 'morpho', 'bridge', 'streamer', 'other'];
		groups.forEach((regs, id) => {
			regs.sort(
				(a, b) =>
					MODULE_CURRENCIES.findIndex((c) => c.currency === a.currency) -
					MODULE_CURRENCIES.findIndex((c) => c.currency === b.currency)
			);
			regs.forEach((r) => byKey.set(r.key, regs));
			const m = regs[0].m;
			const type = getModuleType(m.message);
			const shown = regs.filter((r) => matchesStatus(r, tab));
			if (!shown.length) return;
			const sts = shown.map((r) => r.status);
			// an open proposal pulses the node even though its base status stays active
			const pulse = shown.some((r) => r.pending);
			const status: ModuleStatusKey = sts.includes('pending') ? 'pending' : sts.every(isInactive) ? 'expired' : 'active';
			input.push({
				id,
				hubs: shown.map(hubIndex),
				isHub: false,
				label: short(m.message || shortenAddress(m.module as Address)),
				color: MODULE_TYPES[type].color,
				cat: order.indexOf(type),
				status,
				pulse,
			});
		});
		const hubs: MapNodeInput[] = MODULE_CURRENCIES.map((c, hub) => ({
			id: `hub:${c.currency}`,
			hubs: [hub],
			isHub: true,
			label: c.currency,
			color: '#0c0c0c',
			cat: 0,
			status: 'active',
		}));
		return { input: [...hubs, ...input], byKey, hubStats };
	}, [modules, getStatus, tab]);

	// aggregate figures per hub (modules whose calls failed are skipped)
	const hubAgg = useMemo(
		() =>
			hubStats.map((h) => {
				let debt = 0n,
					funds = 0n,
					revenue = 0n,
					nBoth = 0,
					nRev = 0;
				// shared modules count only if they report per stablecoin (CurveSeedAdapterV1), then just their leg in this one
				let sharedLeft = h.shared;
				let bothFromShared = 0;
				h.sharedIds.forEach((id) => {
					const leg = figures?.get(id)?.byCurrency?.[h.currency];
					if (!leg) return;
					debt += leg.debt;
					funds += leg.funds;
					bothFromShared++;
					sharedLeft--;
				});
				h.own.forEach((r) => {
					const f = figures?.get(r.m.module.toLowerCase());
					if (!f) return;
					if (f.debt !== undefined && f.funds !== undefined) {
						debt += f.debt;
						funds += f.funds;
						nBoth++;
					}
					if (f.revenue !== undefined) {
						revenue += f.revenue;
						nRev++;
					}
				});
				nBoth += bothFromShared;
				return {
					...h,
					sharedLeft,
					rows:
						nBoth + nRev
							? figureRows(nBoth ? { debt, funds, revenue: nRev ? revenue : undefined } : { revenue }, h.currency)
							: [],
				};
			}),
		[hubStats, figures]
	);

	useEffect(() => {
		const e = new ModulesMapEngine(canvas.current!, {
			// a click only selects on the map (pinned info card); Details performs the table action
			onSelect: (id) => setMapSel((cur) => (id && id !== cur ? id : null)),
			onHover: setTip,
		});
		engine.current = e;
		return () => {
			e.destroy();
			engine.current = null;
		};
	}, []);

	const mapInput = useMemo(
		() =>
			input.map((n) => {
				if (!n.isHub) return n;
				const rows = hubAgg[n.hubs[0]]?.rows ?? [];
				const sub = rows
					.filter((r) => r.label === 'Funds' || r.label === 'Claimable')
					.map((r) => `${r.label} ${r.value}`)
					.join(' · ');
				return { ...n, sub: sub || undefined };
			}),
		[input, hubAgg]
	);
	useEffect(() => engine.current?.setData(mapInput), [mapInput]);
	// a row expanded in the table shows up as the selected node
	useEffect(() => {
		const regs = selected ? byKey.get(selected) : undefined;
		if (regs) setMapSel(regs[0].m.module.toLowerCase());
	}, [selected, byKey]);
	useEffect(() => engine.current?.setSelected(mapSel), [mapSel]);

	const w = canvas.current?.clientWidth ?? 600;
	const regsOf = (id: string) => [...byKey.values()].find((r) => r[0].m.module.toLowerCase() === id);
	const hubOf = (id: string) => MODULE_CURRENCIES.findIndex((c) => `hub:${c.currency}` === id);
	const closeSel = () => setMapSel(null);

	/** one line summary for the compact mobile bar */
	const summary = (id: string) => {
		const hi = hubOf(id);
		if (hi >= 0) return `${hubAgg[hi].all} modules · ${hubAgg[hi].active} active`;
		const rs = regsOf(id);
		if (!rs) return '';
		const st = (r: Reg) => `${r.label.toLowerCase()}${r.pending && r.status !== 'pending' ? ' + proposal' : ''}`;
		return rs.length > 1 ? rs.map((r) => `${r.currency}: ${st(r)}`).join(' · ') : `${rs[0].currency} · ${st(rs[0])}`;
	};
	const titleOf = (id: string) => {
		const hi = hubOf(id);
		if (hi >= 0) return MODULE_CURRENCIES[hi].currency;
		return regsOf(id)?.[0].m.message || 'Unnamed Module';
	};
	const colorOf = (id: string) => {
		const rs = regsOf(id);
		return rs ? MODULE_TYPES[getModuleType(rs[0].m.message)].color : '#0c0c0c';
	};

	/** shared body of the hover tooltip and the pinned card */
	const renderInfo = (id: string) => {
		const hi = hubOf(id);
		const regs = regsOf(id);
		const info = regs?.[0];
		if (hi >= 0) {
			const h = hubAgg[hi];
			return (
				<>
					<div className="font-semibold">{MODULE_CURRENCIES[hi].currency}</div>
					<div className="text-[11px] text-text-muted">{shortenAddress(MODULE_CURRENCIES[hi].stablecoin as Address)}</div>
					<div className="text-[11px] text-text-muted">
						{h.all} modules · {h.active} active
					</div>
					{h.rows.length > 0 && (
						<div className="mt-1 grid grid-cols-[auto_1fr_auto_1fr] gap-x-2 text-[11px]">
							{h.rows.map((r) => (
								<React.Fragment key={r.label}>
									<span className="text-text-muted" title={r.title}>
										{r.label}
									</span>
									<span className={r.negative ? 'text-red-600' : 'text-usdu-black'}>{r.value}</span>
								</React.Fragment>
							))}
						</div>
					)}
					<div className="mt-1 text-[10px] text-text-muted">
						Sum over all its modules incl. inactive
						{h.sharedLeft > 0 && `, excl. ${h.sharedLeft} shared module${h.sharedLeft > 1 ? 's' : ''}`}
					</div>
				</>
			);
		}
		if (!info || !regs) return null;
		const fig = moduleFigureRows(figures?.get(info.m.module.toLowerCase()), regs.length === 1 ? regs[0].currency : undefined);
		return (
			<>
				<div className="font-semibold" style={{ color: colorOf(id) }}>
					{info.m.message || 'Unnamed Module'}
				</div>
				<div className="text-[11px] text-text-muted">{shortenAddress(info.m.module as Address)}</div>
				{regs.length > 1 ? (
					<div className="text-[11px] text-text-muted">{summary(id)}</div>
				) : (
					<div className="text-[11px] text-text-muted">
						{info.currency} · {info.label} · expires {expiryText(info.m.expiredAt)}
					</div>
				)}
				{regs.length === 1 && info.pending && info.status !== 'pending' && (
					<div className="text-[11px] text-yellow-700">
						Proposal pending: expires {expiryText(info.pending.expiredAt)} · {proposalTiming(info.pending)}
					</div>
				)}
				{fig.length > 0 && (
					<div className="mt-2 flex flex-col text-[11px]">
						{[...new Set(fig.map((r) => r.currency))].map((cur) => (
							<div
								key={cur ?? 'all'}
								className="grid grid-cols-[auto_auto_auto_auto] justify-start gap-x-4 gap-y-0.5 border-t border-black/10 py-1.5 first:border-t-0 first:pt-0"
							>
								{cur && <span className="col-span-4 font-semibold text-usdu-black">{cur}</span>}
								{fig
									.filter((r) => r.currency === cur)
									.map((r) => (
										<React.Fragment key={r.label}>
											<span className="text-text-muted" title={r.title}>
												{r.label}
											</span>
											<span className={`whitespace-nowrap ${r.negative ? 'text-red-600' : 'text-usdu-black'}`}>
												{r.value}
											</span>
										</React.Fragment>
									))}
							</div>
						))}
						{regs.length > 1 && !figures?.get(info.m.module.toLowerCase())?.byCurrency && (
							<span className="text-text-muted">module totals, shared by all stablecoins</span>
						)}
					</div>
				)}
			</>
		);
	};

	/** Details actions: one per stablecoin registration of the module */
	const detailButtons = (id: string, cls: string) => {
		const rs = regsOf(id);
		if (!rs) return null;
		return rs.map((r) => (
			<button
				key={r.key}
				onClick={() => cb.current.onSelect(r.key)}
				className={`${cls} ${selected === r.key ? 'bg-usdu-orange/20' : ''}`}
			>
				{rs.length > 1 ? `Details ${r.currency}` : 'Details'}
			</button>
		));
	};
	const DETAIL_BTN = 'rounded-lg border border-usdu-orange/50 bg-usdu-orange/10 px-2.5 py-1 text-xs hover:bg-usdu-orange/20';

	const pinned = mapSel && (hubOf(mapSel) >= 0 || regsOf(mapSel)) ? mapSel : null;
	const hoverId = tip && tip.id !== pinned && (hubOf(tip.id) >= 0 || regsOf(tip.id)) ? tip.id : null;

	return (
		<div className="relative h-[520px] md:h-[680px] rounded-lg border border-usdu-surface overflow-hidden select-none">
			<canvas ref={canvas} className="absolute inset-0 block" role="img" aria-label="Map of stablecoin modules" />

			<div
				className="absolute right-3 top-3 left-3 flex justify-end gap-1.5 overflow-x-auto"
				role="tablist"
				aria-label="Filter map by status"
			>
				{TABS.map((t) => (
					<button
						key={t}
						role="tab"
						aria-selected={tab === t}
						onClick={() => setTab(t)}
						className={`shrink-0 px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
							tab === t ? 'bg-usdu-black text-usdu-card' : `${GLASS} text-text-secondary hover:bg-white`
						}`}
					>
						{t}
					</button>
				))}
			</div>

			<div className={`absolute right-3 flex flex-col gap-1.5 ${pinned ? 'bottom-3 max-md:bottom-[5.25rem]' : 'bottom-3'}`}>
				<button
					className={`${BTN} text-xs font-medium`}
					aria-label="Fit view"
					title="Fit view"
					onClick={() => engine.current?.fit(true)}
				>
					Fit
				</button>
				<button className={BTN} aria-label="Zoom in" onClick={() => engine.current?.zoomBy(1.5)}>
					+
				</button>
				<button className={BTN} aria-label="Zoom out" onClick={() => engine.current?.zoomBy(1 / 1.5)}>
					−
				</button>
			</div>

			<div
				className={`${GLASS} absolute left-3 bottom-3 max-w-[calc(100%-5.5rem)] px-3 py-2 text-[11px] text-text-secondary ${
					pinned ? 'max-md:hidden' : ''
				}`}
			>
				<div className="flex flex-wrap gap-x-3 gap-y-1">
					{Object.values(MODULE_TYPES).map((t) => (
						<span key={t.name} className="flex items-center gap-1.5">
							<span className="inline-block w-2 h-2 rounded-full" style={{ background: t.color }} />
							{t.name}
						</span>
					))}
				</div>
				<div className="mt-1 text-text-muted">Pulsing = pending · dashed = expired / revoked · drag, scroll, double-click</div>
			</div>

			{/* hover tooltip: desktop only, never wider than the map */}
			{hoverId && tip && (
				<div
					className={`${GLASS} pointer-events-none absolute z-40 max-md:hidden w-max max-w-[min(340px,calc(100%-8px))] px-4 py-3 text-xs`}
					style={{ left: Math.max(4, Math.min(tip.x + 16, w - 350)), top: tip.y + 16 }}
				>
					{renderInfo(hoverId)}
				</div>
			)}

			{/* pinned card (desktop): stays for the selected node, Details performs the table action */}
			{pinned && (
				<div className={`${GLASS} absolute left-3 top-12 z-30 max-md:hidden w-max max-w-[340px] px-4 py-3 text-xs`}>
					<button
						aria-label="Deselect"
						onClick={closeSel}
						className="absolute right-2.5 top-2 text-text-muted hover:text-usdu-black"
					>
						✕
					</button>
					<div className="pr-5">{renderInfo(pinned)}</div>
					{regsOf(pinned) && <div className="mt-2 flex flex-wrap gap-1.5">{detailButtons(pinned, DETAIL_BTN)}</div>}
				</div>
			)}

			{/* compact bottom bar (phones), like GodEye's MobileDetailBar */}
			{pinned && (
				<div className={`${GLASS} absolute bottom-3 left-3 right-3 z-30 flex items-center gap-2.5 px-3.5 py-2.5 md:hidden`}>
					<span className="inline-block h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: colorOf(pinned) }} />
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-semibold">{titleOf(pinned)}</span>
						<span className="block truncate text-[11px] text-text-muted">
							{hubOf(pinned) >= 0
								? shortenAddress(MODULE_CURRENCIES[hubOf(pinned)].stablecoin as Address)
								: shortenAddress(regsOf(pinned)![0].m.module as Address)}
							{' · '}
							{summary(pinned)}
						</span>
					</span>
					{regsOf(pinned) && <span className="flex shrink-0 gap-1">{detailButtons(pinned, `${DETAIL_BTN} whitespace-nowrap`)}</span>}
					<button aria-label="Deselect" onClick={closeSel} className="px-1 text-text-muted">
						✕
					</button>
				</div>
			)}
		</div>
	);
}
