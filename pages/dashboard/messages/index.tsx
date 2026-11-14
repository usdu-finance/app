import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { isAddress } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faShieldHalved, faPaperPlane, faPen, faChevronLeft, faEye, faEyeSlash, faCheck } from '@fortawesome/free-solid-svg-icons';
import { PageHeader } from '@/components/ui/layout';
import { ButtonInput, AddressInput } from '@/components/ui/input';
import { Badge } from '@/components/ui/Badge';
import { DEMO_CONVERSATIONS, mockCiphertext, type DemoConversation, type DemoMessage } from '@/lib/demo/messages';
import { cn, formatAddress } from '@/lib/utils';
import { NextSeo } from 'next-seo';
import { SEO } from '@/lib/constants';

type SendState = 'sealing' | 'delivered';
type ThreadMessage = DemoMessage & { state?: SendState };

const ago = (at: number) => {
	const m = Math.floor((Date.now() - at) / 60_000);
	return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
};

// a stable color per address, so the avatar is recognizable without an image
const hue = (address: string) => parseInt(address.slice(2, 8), 16) % 360;

function Avatar({ address, label, size = 40 }: { address: string; label: string; size?: number }) {
	return (
		<span
			className="shrink-0 rounded-full flex items-center justify-center text-white font-semibold"
			style={{ width: size, height: size, background: `hsl(${hue(address)} 55% 48%)`, fontSize: size * 0.4 }}
		>
			{label.slice(0, 1).toUpperCase()}
		</span>
	);
}

export default function MessagesPage() {
	const router = useRouter();
	const [conversations, setConversations] = useState<DemoConversation[]>(DEMO_CONVERSATIONS);
	const [thread, setThread] = useState<Record<string, ThreadMessage[]>>(() =>
		Object.fromEntries(DEMO_CONVERSATIONS.map((c) => [c.id, c.messages]))
	);
	const [activeId, setActiveId] = useState<string | null>(null); // null on a phone shows the list
	const [composing, setComposing] = useState(false);
	const [recipient, setRecipient] = useState('');
	const [draft, setDraft] = useState('');
	const [revealed, setRevealed] = useState<Set<string>>(new Set());
	const bottomRef = useRef<HTMLDivElement>(null);

	// a notification links to ?c=<conversation>
	const queryId = typeof router.query.c === 'string' ? router.query.c : null;
	useEffect(() => {
		if (queryId && conversations.some((c) => c.id === queryId)) open(queryId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryId]);

	const active = conversations.find((c) => c.id === activeId) ?? null;
	const messages = useMemo(() => (active ? (thread[active.id] ?? []) : []), [active, thread]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}, [messages.length, activeId]);

	function open(id: string) {
		setActiveId(id);
		setComposing(false);
		setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
	}

	const trimmedRecipient = recipient.trim();
	const invalidRecipient = trimmedRecipient.length > 0 && !isAddress(trimmedRecipient);
	const canSend = draft.trim().length > 0 && (composing ? isAddress(trimmedRecipient) : !!active);

	const send = () => {
		if (!canSend) return;
		let target = active;

		if (composing) {
			const existing = conversations.find((c) => c.address.toLowerCase() === trimmedRecipient.toLowerCase());
			target =
				existing ??
				({
					id: trimmedRecipient.toLowerCase(),
					name: formatAddress(trimmedRecipient, 4),
					address: trimmedRecipient as `0x${string}`,
					fingerprint: mockCiphertext(trimmedRecipient).slice(2, 18).toUpperCase().replace(/(.{4})/g, '$1 ').trim(),
					verified: false,
					unread: 0,
					messages: [],
				} satisfies DemoConversation);
			if (!existing) setConversations((cs) => [target!, ...cs]);
			setActiveId(target.id);
			setComposing(false);
			setRecipient('');
		}

		const id = crypto.randomUUID();
		const targetId = target!.id;
		setThread((t) => ({ ...t, [targetId]: [...(t[targetId] ?? []), { id, from: 'me', text: draft.trim(), at: Date.now(), state: 'sealing' }] }));
		setDraft('');
		// MOCK: sealing and delivery are only simulated
		setTimeout(
			() => setThread((t) => ({ ...t, [targetId]: (t[targetId] ?? []).map((m) => (m.id === id ? { ...m, state: 'delivered' } : m)) })),
			1100
		);
	};

	const toggleReveal = (id: string) =>
		setRevealed((r) => {
			const next = new Set(r);
			if (!next.delete(id)) next.add(id);
			return next;
		});

	const lastOf = (c: DemoConversation) => (thread[c.id] ?? []).at(-1);

	return (
		<>
			<NextSeo title={SEO.messages.title} description={SEO.messages.description} openGraph={SEO.messages.openGraph} />
			<div className="space-y-6">
				<PageHeader
					title="Messages"
					description="Send private messages to other wallets. Every message is encrypted on your device to the recipient's key, so only the two of you can read it."
					badge={{ text: 'Preview', variant: 'info' }}
				/>

				<div className="grid lg:grid-cols-[320px_1fr] bg-usdu-bg border border-usdu-surface rounded-xl overflow-hidden min-h-[560px]">
					{/* Conversations */}
					<aside className={cn('border-r border-usdu-surface flex flex-col', (active || composing) && 'max-lg:hidden')}>
						<div className="p-4 border-b border-usdu-surface">
							<ButtonInput
								label="New message"
								size="md"
								className="w-full"
								icon={<FontAwesomeIcon icon={faPen} className="w-3 h-3" />}
								onClick={() => {
									setComposing(true);
									setActiveId(null);
								}}
							/>
						</div>
						<ul className="flex-1 overflow-y-auto">
							{conversations.map((c) => {
								const last = lastOf(c);
								return (
									<li key={c.id}>
										<button
											type="button"
											onClick={() => open(c.id)}
											className={cn(
												'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-usdu-card',
												activeId === c.id && 'bg-usdu-card'
											)}
										>
											<Avatar address={c.address} label={c.name} />
											<div className="min-w-0 flex-1">
												<div className="flex items-center justify-between gap-2">
													<p className="text-sm font-medium truncate">{c.name}</p>
													{last && <span className="text-xs text-text-secondary">{ago(last.at)}</span>}
												</div>
												<div className="flex items-center gap-2">
													<p className="text-xs text-text-secondary truncate flex-1">
														{last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : 'No messages yet'}
													</p>
													{c.unread > 0 && (
														<span className="w-2 h-2 rounded-full bg-usdu-orange shrink-0" aria-label="Unread" />
													)}
												</div>
											</div>
										</button>
									</li>
								);
							})}
						</ul>
						<div className="p-4 border-t border-usdu-surface flex items-start gap-2 text-xs text-text-secondary">
							<FontAwesomeIcon icon={faLock} className="w-3 h-3 mt-0.5" />
							<p>End-to-end encrypted. Not even we can read your messages.</p>
						</div>
					</aside>

					{/* Thread */}
					<section className={cn('flex flex-col min-w-0', !active && !composing && 'max-lg:hidden')}>
						{composing ? (
							<div className="p-4 border-b border-usdu-surface space-y-3">
								<button
									type="button"
									onClick={() => setComposing(false)}
									className="lg:hidden text-sm text-text-secondary inline-flex items-center gap-2"
								>
									<FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" /> Back
								</button>
								<AddressInput
									label="To"
									placeholder="0x..."
									value={recipient}
									onChange={setRecipient}
									isTextLeft
									error={invalidRecipient ? 'Not a valid address.' : undefined}
									note="Their public key is looked up from the key registry, so they need to have enabled messages."
								/>
							</div>
						) : active ? (
							<div className="px-4 py-3 border-b border-usdu-surface flex items-center gap-3">
								<button
									type="button"
									onClick={() => setActiveId(null)}
									className="lg:hidden p-2 -ml-2 text-text-secondary"
									aria-label="Back"
								>
									<FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
								</button>
								<Avatar address={active.address} label={active.name} size={36} />
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium truncate">{active.name}</p>
									<p className="text-xs text-text-secondary font-mono truncate">{formatAddress(active.address)}</p>
								</div>
								<div className="text-right hidden sm:block">
									<Badge
										text={active.verified ? 'Key verified' : 'Key not verified'}
										customColor={active.verified ? 'text-success' : 'text-yellow-400'}
										customBgColor={active.verified ? 'bg-success-bg' : 'bg-yellow-400/20'}
									/>
									<p className="mt-1 text-[11px] text-text-secondary font-mono">{active.fingerprint}</p>
								</div>
							</div>
						) : (
							<div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-text-secondary">
								<span className="w-14 h-14 rounded-full bg-usdu-surface flex items-center justify-center">
									<FontAwesomeIcon icon={faShieldHalved} className="w-6 h-6" />
								</span>
								<p className="text-sm max-w-xs">Pick a conversation, or write a new message to any wallet. Everything stays private between you two.</p>
							</div>
						)}

						{(active || composing) && (
							<>
								<div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[420px]">
									{composing && messages.length === 0 && (
										<p className="text-center text-xs text-text-secondary py-10">
											<FontAwesomeIcon icon={faLock} className="w-3 h-3 mr-1" />
											Messages to this address are encrypted before they leave your device.
										</p>
									)}
									{messages.map((m) => {
										const mine = m.from === 'me';
										const showCipher = revealed.has(m.id);
										return (
											<div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
												<div className={cn('max-w-[78%] space-y-1', mine && 'items-end')}>
													<div
														className={cn(
															'px-4 py-2 rounded-2xl text-sm break-words',
															mine ? 'bg-usdu-orange text-white rounded-br-md' : 'bg-usdu-card border border-usdu-surface rounded-bl-md'
														)}
													>
														{showCipher ? <span className="font-mono text-xs break-all">{mockCiphertext(m.text)}</span> : m.text}
													</div>
													<div className={cn('flex items-center gap-2 text-[11px] text-text-secondary', mine && 'justify-end')}>
														<span>{ago(m.at)}</span>
														{m.state === 'sealing' ? (
															<span>Encrypting...</span>
														) : (
															mine && (
																<span className="inline-flex items-center gap-1">
																	<FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5" /> Delivered
																</span>
															)
														)}
														<button
															type="button"
															onClick={() => toggleReveal(m.id)}
															className="inline-flex items-center gap-1 hover:text-usdu-orange"
															title="What the server stores"
														>
															<FontAwesomeIcon icon={showCipher ? faEyeSlash : faEye} className="w-2.5 h-2.5" />
															{showCipher ? 'Plain text' : 'Ciphertext'}
														</button>
													</div>
												</div>
											</div>
										);
									})}
									<div ref={bottomRef} />
								</div>

								<div className="p-4 border-t border-usdu-surface">
									<div className="flex items-end gap-2">
										<textarea
											value={draft}
											onChange={(e) => setDraft(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' && !e.shiftKey) {
													e.preventDefault();
													send();
												}
											}}
											rows={2}
											maxLength={2000}
											placeholder="Write an encrypted message..."
											className="flex-1 resize-none rounded-lg border-2 border-input-border bg-transparent px-3 py-2 text-sm outline-none transition-colors hover:border-brand focus:!border-brand"
										/>
										<ButtonInput
											label="Send"
											size="md"
											disabled={!canSend}
											onClick={send}
											icon={<FontAwesomeIcon icon={faPaperPlane} className="w-3 h-3" />}
										/>
									</div>
									<p className="mt-2 text-[11px] text-text-secondary">
										<FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5 mr-1" />
										Preview with sample data. Nothing is sent or encrypted yet.
									</p>
								</div>
							</>
						)}
					</section>
				</div>
			</div>
		</>
	);
}
