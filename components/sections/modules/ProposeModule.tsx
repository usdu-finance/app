import { useState } from 'react';
import { formatUnits, isAddress, erc20Abi } from 'viem';
import { useReadContract } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Stablecoin_ABI } from '@usdu-finance/usdu-core';
import { useAuth } from '@/contexts/AuthContext';
import { useTx } from '@/hooks/useTx';
import { PUBLIC_PROPOSAL_FEE, proposeModuleCall } from '@/lib/tx/calls';
import { PageHeader } from '@/components/ui/layout';
import { AddressInput, TextInput, TabInput, ApproveActionInput } from '@/components/ui/input';
import { DetailRow } from '@/components/ui/modal';
import Card from '@/components/ui/Card';
import { MODULE_CURRENCIES } from './helpers';
import { formatCompactNumber, formatTimestampLocale } from '@/lib/utils';

const DAY = 86400;
const EXPIRIES: Record<string, number> = { '6 months': 182 * DAY, '1 year': 365 * DAY, '2 years': 730 * DAY };

/** Public module proposal on one stablecoin: an address, a name and an expiry, for a fee. The DAO can still veto it. */
export default function ProposeModule({ currency }: { currency: string }) {
	const { isConnected, address } = useAuth();
	const { open } = useAppKit();
	const tx = useTx();

	const [module, setModule] = useState('');
	const [name, setName] = useState('');
	const [expiry, setExpiry] = useState('1 year');

	const stablecoin = MODULE_CURRENCIES.find((c) => c.currency === currency)!.stablecoin as `0x${string}`;
	const { data: balance = 0n, refetch } = useReadContract({
		address: stablecoin,
		abi: erc20Abi,
		functionName: 'balanceOf',
		args: [address as `0x${string}`],
		query: { enabled: isConnected },
	});
	const { data: timelock } = useReadContract({ address: stablecoin, abi: Stablecoin_ABI, functionName: 'timelock' });

	const trimmed = module.trim();
	const invalidAddress = trimmed.length > 0 && !isAddress(trimmed);
	const insufficient = isConnected && balance < PUBLIC_PROPOSAL_FEE;
	const busy = tx.isSigning;
	const expiredAt = Math.floor(Date.now() / 1000) + EXPIRIES[expiry]!;
	// public proposals wait twice the timelock
	const delayDays = timelock !== undefined ? Math.ceil((Number(timelock) * 2) / DAY) : undefined;

	const handlePropose = async () => {
		try {
			await tx.submit([proposeModuleCall(stablecoin, trimmed as `0x${string}`, BigInt(expiredAt), name.trim())], {
				title: 'Propose module',
				onConfirmed: refetch,
			});
			setModule('');
			setName('');
		} catch {
			// the user declined, the toast shows it
		}
	};

	return (
		<Card variant="panel" className="space-y-8">
			<PageHeader
				title={`Propose a Module for ${currency}`}
				description={`Anyone can propose a module for ${currency} by paying a fee. The proposal waits out twice the timelock, during which the DAO can still veto it. Select the stablecoin above.`}
			/>

			<div className="max-w-xl space-y-6">
				<AddressInput
					label="Module address"
					placeholder="0x..."
					value={module}
					onChange={setModule}
					isTextLeft
					error={invalidAddress ? 'Not a valid address.' : undefined}
				/>

				<TextInput
					label="Name"
					placeholder="e.g. Curve adapter USDC / USDU"
					value={name}
					onChange={setName}
					maxLength={80}
					note="Shown in the module list and its history."
				/>

				<div>
					<p className="mb-2 text-input-label">Expires after</p>
					<TabInput tabs={Object.keys(EXPIRIES)} tab={expiry} setTab={setExpiry} />
				</div>

				<div className="space-y-1">
					<DetailRow label="Stablecoin" value={currency} />
					<DetailRow
						label="Proposal fee"
						value={`${formatCompactNumber(formatUnits(PUBLIC_PROPOSAL_FEE, 18), 0, '')} ${currency}`}
					/>
					<DetailRow
						label="Your balance"
						value={isConnected ? `${formatCompactNumber(formatUnits(balance, 18), 2, '')} ${currency}` : '—'}
					/>
					<DetailRow label="Can be accepted after" value={delayDays !== undefined ? `${delayDays} days` : '—'} />
					<DetailRow label="Expires" value={formatTimestampLocale(expiredAt)} />
				</div>

				<ApproveActionInput
					actionLabel="Propose module"
					isActing={busy}
					disabled={!trimmed || invalidAddress || !name.trim() || insufficient || busy}
					onAction={handlePropose}
					isConnected={isConnected}
					onConnect={() => open()}
					hint={
						insufficient
							? `You need ${formatCompactNumber(formatUnits(PUBLIC_PROPOSAL_FEE, 18), 0, '')} ${currency} to propose a module.`
							: undefined
					}
				/>
			</div>
		</Card>
	);
}
