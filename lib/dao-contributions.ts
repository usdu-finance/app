/**
 * Money that people put into the DAO wallet themselves, as opposed to what the protocol earned. The chain only shows a
 * transfer from a wallet, which cannot be told from any other deposit, so they are listed here by transaction.
 *
 * A contribution is shown next to the earnings but never counted as earned. The coin counts one-to-one in its
 * stablecoin's currency, like the swap-out fees do (USDC for USDU).
 */

export interface Contribution {
	txHash: string;
	/** when it landed, ISO 8601 */
	at: string;
	amount: number;
	/** the coin it was paid in */
	coin: string;
	/** the stablecoin view it belongs to */
	currency: 'USDU' | 'EURU' | 'CHFU';
}

export const CONTRIBUTION = {
	name: 'Contribution',
	caption: 'Initial funding by the two contributors',
	color: '#0ea5e9',
};

export const CONTRIBUTIONS: Contribution[] = [
	// the two people that funded the DAO wallet at the start: 550 + 500 USDC, which went into the Curve adapter
	{
		txHash: '0x8a7f561cac7dd20a8e22e9435c61fa9d59e0cd28d9bfb1f33f1037287542ebc4',
		at: '2025-11-11T11:53:35Z',
		amount: 550,
		coin: 'USDC',
		currency: 'USDU',
	},
	{
		txHash: '0x84f3c3c43dc7bb1d7ddde545d4dd1df09a02d824f54702ccb5025e114ec03555',
		at: '2025-11-11T11:56:11Z',
		amount: 500,
		coin: 'USDC',
		currency: 'USDU',
	},
];
