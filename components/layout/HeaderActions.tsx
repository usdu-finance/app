import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faLayerGroup, faCheck, faXmark, faSpinner, faEnvelope, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTx } from '@/hooks/useTx';
import { notificationStore } from '@/lib/notifications/store';
import { getBlockExplorerUrl } from '@/lib/web3/config';
import type { TxItemStatus } from '@/lib/tx/types';

const ago = (at: number) => {
	const m = Math.floor((Date.now() - at) / 60_000);
	return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
};

const STATUS_LABEL: Record<TxItemStatus, string> = {
	waiting: 'Waiting',
	signing: 'Sign in wallet',
	submitted: 'Confirming',
	confirmed: 'Confirmed',
	failed: 'Failed',
	skipped: 'Skipped',
};

function StatusIcon({ status }: { status: TxItemStatus }) {
	if (status === 'confirmed') return <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-success" />;
	if (status === 'failed' || status === 'skipped') return <FontAwesomeIcon icon={faXmark} className="w-3 h-3 text-error" />;
	return <FontAwesomeIcon icon={faSpinner} spin className="w-3 h-3 text-text-secondary" />;
}

/** Round header button with a count badge and a popover that closes on an outside click. */
function RoundPopover({
	icon,
	label,
	count,
	pulse,
	onOpen,
	children,
}: {
	icon: IconDefinition;
	label: string;
	count: number;
	pulse?: boolean;
	onOpen?: () => void;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
		const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		document.addEventListener('mousedown', close);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('mousedown', close);
			document.removeEventListener('keydown', esc);
		};
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				aria-label={label}
				title={label}
				onClick={() => {
					setOpen((o) => !o);
					if (!open) onOpen?.();
				}}
				className="relative w-9 h-9 rounded-full border border-usdu-surface bg-usdu-card flex items-center justify-center text-text-secondary hover:text-usdu-orange hover:border-usdu-orange transition-colors"
			>
				<FontAwesomeIcon icon={icon} className={`w-4 h-4 ${pulse ? 'text-usdu-orange' : ''}`} />
				{count > 0 && (
					<span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-usdu-orange text-white text-[10px] font-semibold flex items-center justify-center">
						{count > 9 ? '9+' : count}
					</span>
				)}
			</button>
			{open && (
				<div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-usdu-surface bg-usdu-card shadow-lg z-[60] overflow-hidden">
					{children}
				</div>
			)}
		</div>
	);
}

/** Transaction queue and notifications, as two round buttons next to the wallet. */
export default function HeaderActions() {
	const { batches, pendingCount } = useTx();
	const notifications = useSyncExternalStore(notificationStore.subscribe, notificationStore.getSnapshot, notificationStore.getServerSnapshot);
	const unread = notifications.filter((n) => !n.read).length;

	return (
		<div className="flex items-center gap-2">
			<RoundPopover icon={faLayerGroup} label="Transaction queue" count={batches.length} pulse={batches.length > 0}>
				<div className="px-4 py-3 border-b border-usdu-surface flex items-center justify-between">
					<p className="text-sm font-medium">Transaction queue</p>
					<p className="text-xs text-text-secondary">{pendingCount > 0 ? `${pendingCount} confirming` : 'Idle'}</p>
				</div>
				{batches.length === 0 ? (
					<p className="px-4 py-6 text-sm text-center text-text-secondary">Nothing in flight. New transactions show up here.</p>
				) : (
					<ul className="max-h-96 overflow-y-auto divide-y divide-usdu-surface">
						{batches.map((b) => (
							<li key={b.id} className="px-4 py-3">
								<div className="flex items-center justify-between gap-2">
									<p className="text-sm font-medium truncate">{b.title}</p>
									<span className="shrink-0 text-[10px] uppercase tracking-wide text-text-secondary">
										{b.mode === 'atomic' ? 'Bundle' : 'Queue'}
									</span>
								</div>
								<ul className="mt-2 space-y-1.5">
									{b.items.map((it, i) => (
										<li key={i} className="flex items-center gap-2 text-xs">
											<StatusIcon status={it.status} />
											<span className="flex-1 truncate">{it.label}</span>
											<span className="text-text-secondary">{STATUS_LABEL[it.status]}</span>
											{it.hash && (
												<a
													href={getBlockExplorerUrl(`tx/${it.hash}`)}
													target="_blank"
													rel="noreferrer"
													className="text-text-secondary hover:text-usdu-orange"
													aria-label="View on explorer"
												>
													<FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3 h-3" />
												</a>
											)}
										</li>
									))}
								</ul>
							</li>
						))}
					</ul>
				)}
			</RoundPopover>

			<RoundPopover icon={faBell} label="Notifications" count={unread} onOpen={notificationStore.markAllRead}>
				<div className="px-4 py-3 border-b border-usdu-surface flex items-center justify-between">
					<p className="text-sm font-medium">Notifications</p>
					{notifications.length > 0 && (
						<button type="button" onClick={notificationStore.clear} className="text-xs text-text-secondary hover:text-usdu-orange">
							Clear
						</button>
					)}
				</div>
				{notifications.length === 0 ? (
					<p className="px-4 py-6 text-sm text-center text-text-secondary">You are all caught up.</p>
				) : (
					<ul className="max-h-96 overflow-y-auto divide-y divide-usdu-surface">
						{notifications.map((n) => {
							const body = (
								<div className="flex items-start gap-3 px-4 py-3 hover:bg-usdu-bg transition-colors">
									<span className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-usdu-surface flex items-center justify-center">
										<FontAwesomeIcon
											icon={n.kind === 'message' ? faEnvelope : n.title.includes('failed') ? faXmark : faCheck}
											className="w-3 h-3"
										/>
									</span>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium truncate">{n.title}</p>
										{n.text && <p className="text-xs text-text-secondary truncate">{n.text}</p>}
									</div>
									<span className="text-xs text-text-secondary">{ago(n.at)}</span>
								</div>
							);
							return <li key={n.id}>{n.href ? <Link href={n.href}>{body}</Link> : body}</li>;
						})}
					</ul>
				)}
			</RoundPopover>
		</div>
	);
}
