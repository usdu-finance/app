/**
 * Umami event tracking. Every event is declared here, so names and properties stay consistent and typos fail
 * at compile time. Rules for the data: no wallet addresses, no raw amounts (use `amountBucket`), no free text
 * typed by the user. Property values are strings or numbers, Umami flattens them for filtering.
 */
type Props = Record<string, string | number | boolean | undefined>;

export interface AnalyticsEvents {
	// wallet
	wallet_connect_click: { source: string };
	wallet_connected: { wallet: string; chain_id?: number };
	wallet_disconnected: undefined;
	// transactions, one set for every on-chain action (lib/tx/send.ts)
	tx_signing: { action: string; mode: string; calls: number; chain_id: number };
	tx_submitted: { action: string; mode: string; calls: number; chain_id: number };
	tx_confirmed: { action: string; mode: string; calls: number; chain_id: number; seconds: number };
	tx_failed: { action: string; mode: string; calls: number; chain_id: number; reason: string };
	tx_rejected: { action: string; mode: string; calls: number; chain_id: number };
	// funnels
	quote_received: { page: string; pair: string; route?: string };
	quote_failed: { page: string; pair: string; reason: string };
	action_click: { page: string; action: string; pair?: string; amount?: string; needs_approval?: boolean };
	token_selected: { page: string; side: string; symbol: string };
	module_selected: { page: string; module: string };
	// navigation and content
	cta_click: { placement: string; target: string };
	outbound_click: { placement: string; target: string };
	tab_switch: { page: string; tab: string };
	filter_change: { page: string; filter: string; value: string };
	faq_toggle: { question: string };
	// utilities
	address_copy: { context?: string };
	proposal_copy: { routes: number };
	proposal_download: { routes: number };
	not_found: { path: string };
}

export type AnalyticsEvent = keyof AnalyticsEvents;

declare global {
	interface Window {
		umami?: { track: (event: string, data?: Props) => void; identify?: (data: Props) => void };
	}
}

/** Sends an event. Does nothing on the server, when the script is not loaded or blocked. Never throws. */
export function track<E extends AnalyticsEvent>(
	event: E,
	...[data]: AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]]
): void {
	try {
		if (typeof window === 'undefined') return;
		window.umami?.track(event, data as Props | undefined);
	} catch {
		// analytics must never break the app
	}
}

/** Declarative variant for plain elements: spread onto a link or button, Umami reads the data attributes on click. */
export function trackAttrs<E extends AnalyticsEvent>(
	event: E,
	...[data]: AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]]
): Record<string, string> {
	const attrs: Record<string, string> = { 'data-umami-event': event };
	for (const [k, v] of Object.entries((data ?? {}) as Props)) {
		if (v !== undefined) attrs[`data-umami-event-${k}`] = String(v);
	}
	return attrs;
}

/** Coarse USD size of an action, so amounts can be grouped without recording exact values. */
export function amountBucket(usd: number | undefined): string | undefined {
	if (usd === undefined || !Number.isFinite(usd) || usd <= 0) return undefined;
	if (usd < 100) return '<100';
	if (usd < 1_000) return '100-1k';
	if (usd < 10_000) return '1k-10k';
	if (usd < 100_000) return '10k-100k';
	return '100k+';
}

/** Short, stable reason for a failed tx or quote, for grouping (no raw error strings, they can carry addresses). */
export function errorReason(message: string): string {
	const m = message.toLowerCase();
	if (/reject|denied/.test(m)) return 'rejected';
	if (/revert/.test(m)) return 'reverted';
	if (/insufficient/.test(m)) return 'insufficient-funds';
	if (/timeout|timed out/.test(m)) return 'timeout';
	if (/network|fetch|failed to/.test(m)) return 'network';
	return 'other';
}
