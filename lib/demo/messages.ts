/**
 * MOCK: conversations for the messages page. Nothing is sent or encrypted, the page only shows how an
 * end-to-end encrypted inbox between wallets would look. A real version would encrypt to the recipient's
 * published public key, so only the two wallets can read a message and the server only sees ciphertext.
 */
export interface DemoMessage {
	id: string;
	from: 'me' | 'them';
	text: string;
	at: number;
}

export interface DemoConversation {
	id: string;
	name: string;
	address: `0x${string}`;
	/** Short fingerprint of the recipient's public key, compared out of band to rule out a man in the middle. */
	fingerprint: string;
	verified: boolean;
	unread: number;
	messages: DemoMessage[];
}

const ago = (minutes: number) => Date.now() - minutes * 60_000;

export const DEMO_CONVERSATIONS: DemoConversation[] = [
	{
		id: 'maya',
		name: 'maya.eth',
		address: '0x7a3f1c9d2b84e5a60f1d93c7b2e48a5d6c01f9e2',
		fingerprint: '4F2A 91CE 07B3 D8A6',
		verified: true,
		unread: 0,
		messages: [
			{ id: 'm1', from: 'them', text: 'Hey, did the CHFU module proposal go through on your side?', at: ago(190) },
			{ id: 'm2', from: 'me', text: 'Submitted it this morning. The timelock runs for another two days.', at: ago(176) },
			{ id: 'm3', from: 'them', text: 'Perfect. I will seed the Curve pool as soon as it is accepted.', at: ago(140) },
			{ id: 'm4', from: 'them', text: 'Also, can we move the revenue split discussion to here instead of the public channel?', at: ago(12) },
		],
	},
	{
		id: 'curator',
		name: 'Curator multisig',
		address: '0x2c91be40d7a5f3860e1d4b9a7c35f208e6d1a4b7',
		fingerprint: 'A81D 5E30 C2F7 96B4',
		verified: true,
		unread: 0,
		messages: [
			{ id: 'c1', from: 'them', text: 'Reconcile for the EURU module is ready to be claimed.', at: ago(60 * 26) },
			{ id: 'c2', from: 'me', text: 'Thanks, I will claim it with the next batch.', at: ago(60 * 25) },
		],
	},
	{
		id: 'otto',
		name: 'otto',
		address: '0xd40e7b1a93c5268f0ae1b7d4c9382f5a60e1c7b3',
		fingerprint: '19C7 B2E8 4D05 F3A1',
		verified: false,
		unread: 0,
		messages: [{ id: 'o1', from: 'me', text: 'Sent you the vault details, let me know if the numbers look right.', at: ago(60 * 52) }],
	},
];

/** A readable stand-in for ciphertext, derived from the text so the same message always shows the same bytes. */
export function mockCiphertext(text: string): string {
	let h = 2166136261;
	const bytes: string[] = [];
	for (let i = 0; i < Math.max(24, Math.ceil(text.length * 1.4)); i++) {
		h = Math.imul(h ^ (text.charCodeAt(i % text.length) + i), 16777619) >>> 0;
		bytes.push((h & 0xff).toString(16).padStart(2, '0'));
	}
	return `0x${bytes.join('')}`;
}
