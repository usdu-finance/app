import { useMemo, useState } from 'react';
import { useDaoFx } from '@/hooks/useDaoFx';
import { useDaoTransfers } from '@/hooks/useDaoTransfers';
import type { DaoCurrency } from '@/lib/dao-transfers';
import DaoEarnings from './DaoEarnings';
import DaoExpenses from './DaoExpenses';

const STABLES: DaoCurrency[] = ['USDU', 'EURU', 'CHFU'];
// the combined view: all three currencies added up in dollars
const ALL = 'all';
const OPTIONS = [{ value: ALL, label: 'All' }, ...STABLES.map((s) => ({ value: s, label: s }))];

/**
 * The DAO's earnings and expenses, one under the other, both read from one feed of the DAO wallet's transfers (served and
 * cached by /api/dao/transfers). They share the currency (each card has the switch) and the selected quarter, so picking a
 * quarter in either chart filters both tables. "All" adds USDU, EURU and CHFU up in dollars, each payment at the
 * exchange rate of the day it was made.
 */
export default function DaoFinances() {
	const fx = useDaoFx();
	const transfers = useDaoTransfers();
	const [token, setToken] = useState<string>(ALL);
	const [selected, setSelected] = useState<number | null>(null);

	const usd = token === ALL;
	const currencies = useMemo(() => (usd ? STABLES : STABLES.filter((s) => s === token)), [usd, token]);

	// both sections carry the same switch, wired to the same state, so changing it in one changes the other
	const shared = {
		token,
		currencyOptions: OPTIONS,
		onToken: (t: string) => {
			setToken(t);
			// a quarter picked for one currency says nothing about another
			setSelected(null);
		},
		currencies,
		usd,
		rateOf: fx.rateOf,
		fxReady: fx.ready,
		fxError: fx.error,
		symbol: usd ? 'USD' : token,
		selected,
		onSelect: setSelected,
		transfers,
	};

	return (
		<div className="space-y-6">
			<DaoEarnings {...shared} />
			<DaoExpenses {...shared} />
		</div>
	);
}
