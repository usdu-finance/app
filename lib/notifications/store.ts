export type NotificationKind = 'tx' | 'message' | 'info';

export interface AppNotification {
	id: string;
	kind: NotificationKind;
	title: string;
	text?: string;
	/** Where a click leads, e.g. the conversation of a message. */
	href?: string;
	at: number;
	read: boolean;
}

/**
 * The bell's list, kept outside of React like the tx store so anything can post to it: the tx runner when a
 * batch settles or fails, the messages page when a message arrives. In memory only, it starts over on reload.
 * MOCK: the seed below stands in for the messages a backend would push.
 */
const MAX = 30;
const seed: AppNotification[] = [
	{
		id: 'seed-message',
		kind: 'message',
		title: 'New encrypted message',
		text: 'maya.eth sent you a message',
		href: '/dashboard/messages?c=maya',
		at: Date.now() - 12 * 60_000,
		read: false,
	},
];

let items: AppNotification[] = seed;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const notificationStore = {
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	getSnapshot: () => items,
	getServerSnapshot: () => items,

	push(n: Omit<AppNotification, 'id' | 'at' | 'read'>) {
		items = [{ ...n, id: crypto.randomUUID(), at: Date.now(), read: false }, ...items].slice(0, MAX);
		emit();
	},
	markAllRead() {
		if (items.every((n) => n.read)) return;
		items = items.map((n) => ({ ...n, read: true }));
		emit();
	},
	markRead(id: string) {
		items = items.map((n) => (n.id === id ? { ...n, read: true } : n));
		emit();
	},
	clear() {
		items = [];
		emit();
	},
};
