import { useEffect, useRef } from 'react';
import { useGodEyeAddress } from '@/hooks/useGodEye';
import { EXPLORER, KIND_META } from './godeye.constants';
import { dateStr, fmt, pct, rgba, shortAddr } from './godeye.format';
import { GodEyePeer } from './godeye.types';
import { Dot, Glass, IconButton, SectionTitle, StatCard } from './GodEyeUi';

function HistoryChart({ history, color }: { history: { t: number; balance: number }[]; color: string }) {
	const ref = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		const c = ref.current;
		if (!c) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = c.clientWidth,
			h = c.clientHeight;
		c.width = w * dpr;
		c.height = h * dpr;
		const g = c.getContext('2d')!;
		g.setTransform(dpr, 0, 0, dpr, 0, 0);
		g.clearRect(0, 0, w, h);
		if (history.length < 2) {
			g.fillStyle = '#6b7280';
			g.fillText('not enough history', 10, 20);
			return;
		}
		const t0 = history[0].t,
			t1 = history[history.length - 1].t;
		const mx = Math.max(...history.map((p) => p.balance), 1e-9);
		const X = (t: number) => 6 + ((t - t0) / Math.max(t1 - t0, 1)) * (w - 12);
		const Y = (v: number) => h - 8 - (Math.max(v, 0) / mx) * (h - 20);
		const path = () => {
			let py = Y(history[0].balance);
			g.moveTo(X(t0), py);
			for (const p of history) {
				g.lineTo(X(p.t), py);
				py = Y(p.balance);
				g.lineTo(X(p.t), py);
			}
			g.lineTo(X(t1), py);
			return py;
		};
		const grd = g.createLinearGradient(0, 0, 0, h);
		grd.addColorStop(0, rgba(color, 0.5));
		grd.addColorStop(1, rgba(color, 0));
		g.beginPath();
		path();
		g.lineTo(X(t1), h - 8);
		g.lineTo(X(t0), h - 8);
		g.closePath();
		g.fillStyle = grd;
		g.fill();
		g.beginPath();
		path();
		g.strokeStyle = color;
		g.lineWidth = 1.5;
		g.stroke();
		g.fillStyle = '#6b7280';
		g.font = '10px sans-serif';
		g.textAlign = 'left';
		g.fillText('peak ' + fmt(mx), 8, 12);
		g.textAlign = 'right';
		g.fillText(`${dateStr(t0)} → ${dateStr(t1)}`, w - 6, 12);
	}, [history, color]);
	return <canvas ref={ref} className="block h-[90px] w-full rounded-lg bg-black/[0.04]" />;
}

function Peer({ p, onPick }: { p: GodEyePeer; onPick: (a: string) => void }) {
	return (
		<div
			onClick={() => onPick(p.address)}
			className="grid cursor-pointer grid-cols-[10px_1fr_auto] items-center gap-2 rounded-lg px-1 py-1 text-[13px] hover:bg-black/10"
		>
			<Dot color={KIND_META[p.kind].color} size={8} />
			<span className="truncate">{p.label || shortAddr(p.address)}</span>
			<span className="text-[11px] tabular-nums text-text-muted">{fmt(p.amount)}</span>
		</div>
	);
}

type Props = {
	token: string;
	address: string;
	fallbackLabel?: string | null;
	onClose: () => void;
	onFocus: (address: string) => void;
	onJump: (address: string) => void;
	onTimeline: (address: string) => void;
};

export default function GodEyeDetail({ token, address, fallbackLabel, onClose, onFocus, onJump, onTimeline }: Props) {
	const { data: a, loading, failed } = useGodEyeAddress(token, address);
	const scan = a ? EXPLORER[a.token.chainId] || EXPLORER[1] : EXPLORER[1];
	const kcol = a ? KIND_META[a.kind].color : KIND_META.wallet.color;

	return (
		<Glass className="flex h-full min-h-0 flex-col overflow-auto p-3.5 [scrollbar-width:thin]">
			<div className="space-y-4">
				<div className="flex items-start justify-between gap-2">
					<div>
						<div className="text-base font-semibold">
							{a?.label || fallbackLabel || shortAddr(address)}
							{a && (
								<span
									className="ml-2 rounded-full border px-2 py-px align-middle text-[10px]"
									style={{ color: kcol, borderColor: kcol }}
								>
									{KIND_META[a.kind].name}
								</span>
							)}
						</div>
						<div className="break-all font-mono text-[11px] text-text-muted">{address}</div>
					</div>
					<button className="px-1.5 text-lg leading-none text-text-muted hover:text-usdu-black" onClick={onClose}>
						×
					</button>
				</div>

				{loading && <div className="text-xs text-text-muted">loading history…</div>}
				{failed && <div className="text-xs text-text-muted">No activity for this address on the selected token.</div>}

				{a && (
					<>
						<div className="flex flex-wrap gap-1.5">
							<IconButton onClick={() => onFocus(a.address)}>◎ Focus map</IconButton>
							<button
								onClick={() => onTimeline(a.address)}
								className="rounded-lg border border-usdu-orange/50 bg-usdu-orange/15 px-2.5 py-1 text-xs text-usdu-black hover:bg-usdu-orange/25"
							>
								◈ Deep timeline
							</button>
							<a
								className="rounded-lg border border-black/10 bg-black/5 px-2.5 py-1 text-xs text-text-secondary hover:bg-black/10"
								href={`${scan}/address/${a.address}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								Explorer ↗
							</a>
							<IconButton onClick={() => navigator.clipboard?.writeText(a.address)}>Copy</IconButton>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<StatCard
								label="Balance"
								value={fmt(a.balance)}
								sub={`${a.token.symbol}${a.share ? ' · ' + pct(a.share, 2) + ' of supply' : ''}`}
							/>
							<StatCard label="Transfers" value={a.txs.toLocaleString()} sub={`${dateStr(a.first)} → ${dateStr(a.last)}`} />
							<StatCard
								label="Received"
								value={fmt(a.inflow)}
								valueClass="text-green-600"
								sub={a.minted ? `minted ${fmt(a.minted)}` : 'all-time'}
							/>
							<StatCard
								label="Sent"
								value={fmt(a.outflow)}
								valueClass="text-rose-600"
								sub={a.burned ? `burned ${fmt(a.burned)}` : `net ${fmt(a.inflow - a.outflow)}`}
							/>
						</div>

						<div>
							<SectionTitle>Balance history</SectionTitle>
							<HistoryChart history={a.history} color={kcol} />
						</div>

						<div>
							<SectionTitle right="2 hops">Where the funds came from</SectionTitle>
							{a.origin.length === 0 && <div className="text-xs text-text-muted">No inbound transfers.</div>}
							{a.origin.map((o) => (
								<div key={o.address}>
									<Peer p={o} onPick={onJump} />
									<div className="ml-1.5 border-l border-dashed border-black/15 pl-2">
										{o.via.map((v) => (
											<Peer key={v.address} p={v} onPick={onJump} />
										))}
									</div>
								</div>
							))}
						</div>

						<div>
							<SectionTitle>Biggest destinations</SectionTitle>
							{a.destinations.length === 0 && <div className="text-xs text-text-muted">No outbound transfers.</div>}
							{a.destinations.slice(0, 8).map((d) => (
								<Peer key={d.address} p={d} onPick={onJump} />
							))}
						</div>

						<div>
							<SectionTitle>Latest transfers</SectionTitle>
							{a.recent.map((t) => {
								const inbound = t.to.toLowerCase() === a.address;
								return (
									<div
										key={t.txHash + t.amount}
										className="grid grid-cols-[1fr_auto] gap-2 border-b border-black/5 py-1 text-[11px]"
									>
										<span>
											<span className={inbound ? 'text-green-600' : 'text-rose-600'}>
												{inbound ? '← in' : '→ out'}
											</span>{' '}
											{shortAddr(inbound ? t.from : t.to)} ·{' '}
											<a
												className="font-mono text-usdu-orange"
												href={`${scan}/tx/${t.txHash}`}
												target="_blank"
												rel="noopener noreferrer"
											>
												{shortAddr(t.txHash)}
											</a>
										</span>
										<span className="text-right">
											{fmt(t.amount)}
											<br />
											<span className="text-text-muted">{dateStr(t.t)}</span>
										</span>
									</div>
								);
							})}
						</div>
					</>
				)}
			</div>
		</Glass>
	);
}
