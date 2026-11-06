import { useEffect, useMemo, useState } from 'react';
import { useGodEyeBoot } from '@/hooks/useGodEye';
import { useDaoFx } from '@/hooks/useDaoFx';
import DaoEarnings from './DaoEarnings';
import DaoExpenses from './DaoExpenses';
import GodEyeLoading from './GodEyeLoading';

const STABLES = ['USDU', 'EURU', 'CHFU'];
// the combined view: all three currencies added up in dollars
const ALL = 'all';

/**
 * The DAO's earnings and expenses, one under the other. They share the currency (each card has the switch) and the
 * selected quarter, so picking a quarter in either chart filters both tables. "All" adds USDU, EURU and CHFU up in dollars, each payment at the
 * exchange rate of the day it was made.
 */
export default function DaoFinances() {
	const boot = useGodEyeBoot();
	const fx = useDaoFx();
	const [token, setToken] = useState<string | null>(null);
	const [selected, setSelected] = useState<number | null>(null);

	// default to USDU once the ledgers are ready
	useEffect(() => {
		if (!boot.ready) return;
		setToken((cur) => cur ?? (boot.tokens.find((t) => t.symbol === 'USDU' && t.chainId === 1) ?? boot.tokens[0]).key);
	}, [boot.ready, boot.tokens]);
	// a quarter picked for one currency says nothing about another
	useEffect(() => setSelected(null), [token]);

	const stables = useMemo(() => STABLES.flatMap((s) => boot.tokens.filter((t) => t.chainId === 1 && t.symbol === s)), [boot.tokens]);
	const options = useMemo(() => [...stables.map((t) => ({ value: t.key, label: t.symbol })), { value: ALL, label: 'All' }], [stables]);
	const usd = token === ALL;
	const currencies = useMemo(() => (usd ? stables : stables.filter((t) => t.key === token)), [usd, stables, token]);
	const symbol = usd ? 'USD' : (currencies[0]?.symbol ?? '');

	if (!boot.ready)
		return (
			<div className="relative min-h-[420px] rounded-lg border border-usdu-surface bg-usdu-bg">
				<GodEyeLoading sync={boot.sync} unreachable={boot.unreachable} />
			</div>
		);

	const shared = {
		// both sections carry the same switch, wired to the same state, so changing it in one changes the other
		token,
		currencyOptions: options,
		onToken: setToken,
		currencies,
		usd,
		rateOf: fx.rateOf,
		fxReady: fx.ready,
		fxError: fx.error,
		symbol,
		selected,
		onSelect: setSelected,
	};

	return (
		<div className="space-y-6">
			<DaoEarnings {...shared} />
			<DaoExpenses {...shared} />
		</div>
	);
}
