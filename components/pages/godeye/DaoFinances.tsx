import { useEffect, useMemo, useState } from 'react';
import { useDaoFx } from '@/hooks/useDaoFx';
import { useDaoTransfers } from '@/hooks/useDaoTransfers';
import { ALL_CURRENCIES } from '@/components/ui/input';
import type { DaoCurrency } from '@/lib/dao-transfers';
import DaoEarnings from './DaoEarnings';
import DaoExpenses from './DaoExpenses';

const STABLES: DaoCurrency[] = ['USDU', 'EURU', 'CHFU'];

/**
 * The DAO's earnings and expenses, one under the other, both read from one feed of the DAO wallet's transfers (served and
 * cached by /api/dao/transfers). They share the currency (picked with the currency tabs of the transparency page) and the
 * selected period, so picking a bar in either chart filters both tables. `ALL_CURRENCIES` adds USDU, EURU and CHFU up in
 * dollars, each payment at the exchange rate of the day it was made.
 */
export default function DaoFinances({ currency }: { currency: string }) {
	const fx = useDaoFx();
	const transfers = useDaoTransfers();
	const [selected, setSelected] = useState<number | null>(null);

	const usd = currency === ALL_CURRENCIES;
	const currencies = useMemo(() => (usd ? STABLES : STABLES.filter((s) => s === currency)), [usd, currency]);

	// a period picked for one currency says nothing about another
	useEffect(() => setSelected(null), [currency]);

	const shared = {
		currencies,
		usd,
		rateOf: fx.rateOf,
		fxReady: fx.ready,
		fxError: fx.error,
		symbol: usd ? 'USD' : currency,
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
