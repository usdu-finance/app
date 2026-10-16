import React, { useMemo, useRef, useState } from 'react';
import type { Address } from 'viem';
import type { StablecoinModule } from '@/hooks/useModulesData';
import { formatTimestampLocale, shortenAddress } from '@/lib/utils';
import { GLASS } from '@/components/pages/godeye/GodEyeUi';
import { MODULE_CURRENCIES, MODULE_TYPES, getModuleCurrency, getModuleType, moduleKey, type ModuleStatusKey } from './helpers';

interface ModulesMapProps {
	modules: StablecoinModule[];
	getStatus: (m: StablecoinModule) => { status: ModuleStatusKey; label: string };
	selected: string | null;
	onSelect: (key: string | null) => void;
}

const W = 1000;
const H = 460;
const HUB_X = [190, 500, 810];
const HUB_Y = 230;
const HUB_R = 30;
const STATUS_ORDER: ModuleStatusKey[] = ['pending', 'active', 'revoked', 'expired', 'unknown'];

type MapNode = { key: string; x: number; y: number; hub: number; module: StablecoinModule; status: ModuleStatusKey; label: string };

function expiryLabel(m: StablecoinModule) {
	return m.expiredAt >= BigInt(10) ** BigInt(12) ? 'Never' : formatTimestampLocale(m.expiredAt);
}

/** Static radial map: one hub per stablecoin, one node per module registered on it. */
export default function ModulesMap({ modules, getStatus, selected, onSelect }: ModulesMapProps) {
	const box = useRef<HTMLDivElement>(null);
	const [hover, setHover] = useState<{ node: MapNode | null; hub: number; x: number; y: number } | null>(null);

	const nodes = useMemo(() => {
		const out: MapNode[] = [];
		MODULE_CURRENCIES.forEach((c, hub) => {
			const list = modules
				.filter((m) => getModuleCurrency(m.stablecoin) === c.currency)
				.map((m) => ({ m, s: getStatus(m) }))
				.sort(
					(a, b) =>
						getModuleType(a.m.message).localeCompare(getModuleType(b.m.message)) ||
						STATUS_ORDER.indexOf(a.s.status) - STATUS_ORDER.indexOf(b.s.status)
				);
			const n = list.length;
			list.forEach(({ m, s }, i) => {
				// two alternating rings when crowded
				const ring = n > 8 ? (i % 2 === 0 ? 85 : 125) : 105;
				const a = (i / n) * Math.PI * 2 - Math.PI / 2;
				out.push({
					key: moduleKey(m.stablecoin, m.module),
					x: HUB_X[hub] + Math.cos(a) * ring,
					y: HUB_Y + Math.sin(a) * ring * 1.3,
					hub,
					module: m,
					status: s.status,
					label: s.label,
				});
			});
		});
		return out;
	}, [modules, getStatus]);

	const move = (e: React.MouseEvent, node: MapNode | null, hub: number) => {
		const r = box.current?.getBoundingClientRect();
		if (r) setHover({ node, hub, x: e.clientX - r.left, y: e.clientY - r.top });
	};

	const hubNode = hover && !hover.node ? MODULE_CURRENCIES[hover.hub] : null;
	const inactive = (s: ModuleStatusKey) => s === 'expired' || s === 'revoked' || s === 'unknown';

	return (
		<div ref={box} className="relative rounded-lg border border-usdu-surface bg-usdu-bg overflow-hidden">
			<svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" onClick={() => onSelect(null)} role="img" aria-label="Map of stablecoin modules">
				<defs>
					{Object.entries(MODULE_TYPES).map(([k, t]) => (
						<radialGradient key={k} id={`mm-${k}`} cx="35%" cy="35%" r="70%">
							<stop offset="0" stopColor={t.color} stopOpacity="0.55" />
							<stop offset="0.3" stopColor={t.color} />
							<stop offset="1" stopColor={t.color} />
						</radialGradient>
					))}
				</defs>
				{/* no connectors: each stablecoin is a soft orbit, its modules cluster inside it */}
				{HUB_X.map((x) => (
					<ellipse key={x} cx={x} cy={HUB_Y} rx={148} ry={196} fill="#0c0c0c" fillOpacity={0.025} stroke="#0c0c0c" strokeOpacity={0.06} />
				))}
				{MODULE_CURRENCIES.map((c, i) => (
					<g
						key={c.currency}
						onMouseMove={(e) => move(e, null, i)}
						onMouseLeave={() => setHover(null)}
						onClick={(e) => e.stopPropagation()}
					>
						<circle cx={HUB_X[i]} cy={HUB_Y} r={HUB_R} fill="#0c0c0c" />
						<circle cx={HUB_X[i]} cy={HUB_Y} r={HUB_R + 5} fill="none" stroke="#0c0c0c" strokeOpacity={0.15} />
						<text x={HUB_X[i]} y={HUB_Y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
							{c.currency}
						</text>
					</g>
				))}
				{nodes.map((n) => {
					const color = MODULE_TYPES[getModuleType(n.module.message)].color;
					const dim = inactive(n.status);
					const sel = selected === n.key;
					return (
						<g
							key={n.key}
							className="cursor-pointer"
							onMouseMove={(e) => move(e, n, n.hub)}
							onMouseLeave={() => setHover(null)}
							onClick={(e) => {
								e.stopPropagation();
								onSelect(sel ? null : n.key);
							}}
						>
							{n.status === 'pending' && (
								<>
									<circle cx={n.x} cy={n.y} r={11} fill={color} fillOpacity={0.35}>
										<animate attributeName="r" values="11;26;11" dur="2s" repeatCount="indefinite" />
										<animate attributeName="fill-opacity" values="0.45;0;0.45" dur="2s" repeatCount="indefinite" />
									</circle>
									<circle cx={n.x} cy={n.y} r={16} fill={color} fillOpacity={0.18} />
								</>
							)}
							{sel && <circle cx={n.x} cy={n.y} r={18} fill="none" stroke="#0c0c0c" strokeOpacity={0.85} strokeWidth={1.6} />}
							<circle
								cx={n.x}
								cy={n.y}
								r={11}
								fill={dim ? color : `url(#mm-${getModuleType(n.module.message)})`}
								fillOpacity={dim ? 0.15 : 1}
								stroke={color}
								strokeWidth={dim ? 1.2 : 0}
								strokeDasharray={dim ? '4 4' : undefined}
								strokeOpacity={0.8}
							/>
						</g>
					);
				})}
			</svg>

			<div className="absolute left-3 bottom-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
				{Object.values(MODULE_TYPES).map((t) => (
					<span key={t.name} className="flex items-center gap-1.5">
						<span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
						{t.name}
					</span>
				))}
				<span>Glowing = pending, dashed = expired / revoked</span>
			</div>

			{hover && (
				<div
					className={`${GLASS} pointer-events-none absolute z-40 max-w-[280px] px-2.5 py-2 text-xs`}
					style={{ left: Math.min(hover.x + 14, (box.current?.clientWidth ?? 600) - 290), top: hover.y + 14 }}
				>
					{hover.node ? (
						<>
							<div className="font-semibold" style={{ color: MODULE_TYPES[getModuleType(hover.node.module.message)].color }}>
								{hover.node.module.message || 'Unnamed Module'}
							</div>
							<div className="text-[11px] text-text-muted">{shortenAddress(hover.node.module.module as Address)}</div>
							<div className="text-[11px] text-text-muted">
								{getModuleCurrency(hover.node.module.stablecoin)} · {hover.node.label} · expires {expiryLabel(hover.node.module)}
							</div>
						</>
					) : (
						<>
							<div className="font-semibold">{hubNode?.currency}</div>
							<div className="text-[11px] text-text-muted">{hubNode ? shortenAddress(hubNode.stablecoin as Address) : null}</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}
