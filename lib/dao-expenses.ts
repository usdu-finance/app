/**
 * What the DAO curator paid out, by category. Categories cannot be read from the chain (a transfer to a wallet does not
 * say whether it was a bug bounty or a development payout), so they are kept here, keyed by transaction hash. A payout
 * that is not listed shows up as "uncategorised", so nothing is hidden by a missing entry.
 *
 * Add a line to EXPENSE_LEDGER for every new payout. The amounts come from the DAO wallet's transfers (every counted coin, see lib/dao-transfers.ts), only the category lives here. Only transfers to plain wallets count as payouts.
 * Reward streams into the reward vaults are not listed: anyone can fund those, so they are not a DAO expense (yet).
 */

export type ExpenseCategory = 'development' | 'security' | 'uncategorised';

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { name: string; caption: string; color: string }> = {
	development: {
		name: 'Development',
		caption: 'Contributor distributions, also covering running costs',
		color: '#2563eb',
	},
	security: { name: 'Security & audits', caption: 'Bug bounties, audits and other security work', color: '#d97706' },
	uncategorised: { name: 'Uncategorised', caption: 'Not in the ledger yet', color: '#64748b' },
};

/** A payout is one category, or split by the coin it was paid in (`default` covers the other coins) */
export type LedgerEntry = ExpenseCategory | ({ default: ExpenseCategory } & Partial<Record<string, ExpenseCategory>>);

export const categoryOf = (txHash: string, coin: string): ExpenseCategory => {
	const e = EXPENSE_LEDGER[txHash.toLowerCase()];
	return !e ? 'uncategorised' : typeof e === 'string' ? e : (e[coin] ?? e.default);
};

export const EXPENSE_LEDGER: Record<string, LedgerEntry> = {
	// 2026-01-14: 500 + 500 USDU for security, the 50 USDC on top for development
	'0xda73168824acd6faf346e070267fa50e054267363cfd014a268b44a2e0265032': { USDU: 'security', default: 'development' },
	// 2026-02-25: 545.23 USDU
	'0x2d24b2a7c53950d6b7d45a487a0984e50e786fd02d6894395e912d8308143881': 'security',
	// 2026-03-30: 524 + 524 USDU, the Curve Adapter #2 surplus split between the two developers
	'0x79dcc5bdfb406f8e274bf9e2e07a8e6d0a54cbf6b877a67399f3523d4f4213d1': 'development',
	// 2026-07-14: 19.48 + 19.48 USDU
	'0x0a6054b197e6d22f989d18000bb9603fb3a09546de66935f9266752d30bebd0b': 'development',
};
