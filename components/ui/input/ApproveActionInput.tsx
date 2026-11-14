import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet } from '@fortawesome/free-solid-svg-icons';
import ButtonInput from './ButtonInput';

export interface ApprovalStep {
	/** symbol of the token to approve, e.g. "CHFU" */
	tokenSymbol: string;
	/** true while the allowance is insufficient for the action */
	needsApproval: boolean;
}

interface ApproveActionInputProps {
	/** label of the action, e.g. "Stake" */
	actionLabel: string;
	/** approvals the action needs, sent in the same batch as the action */
	approvals?: ApprovalStep[];
	/** the wallet is asking for a signature */
	isActing?: boolean;
	/** disables the button, e.g. on input errors */
	disabled?: boolean;
	onAction: () => void;
	isConnected: boolean;
	onConnect: () => void;
	hint?: string;
}

/**
 * One button for the action. Missing approvals are sent along with it, as a single wallet bundle where the
 * wallet can batch, else as consecutive transactions without waiting in between.
 */
export default function ApproveActionInput({
	actionLabel,
	approvals = [],
	isActing,
	disabled,
	onAction,
	isConnected,
	onConnect,
	hint,
}: ApproveActionInputProps) {
	if (!isConnected) {
		return (
			<ButtonInput
				label="Connect Wallet"
				size="lg"
				className="w-full"
				onClick={onConnect}
				icon={<FontAwesomeIcon icon={faWallet} className="w-4 h-4" />}
			/>
		);
	}

	const missing = approvals.filter((s) => s.needsApproval);
	const label = missing.length > 0 ? `Approve & ${actionLabel}` : actionLabel;
	const defaultHint = isActing
		? 'Confirm in your wallet.'
		: missing.length > 0
			? `${missing.map((s) => s.tokenSymbol).join(' and ')} ${missing.length > 1 ? 'are' : 'is'} approved in the same step.`
			: undefined;

	return (
		<div>
			<ButtonInput label={label} size="lg" className="w-full" disabled={disabled} loading={isActing} onClick={onAction} />
			{(hint ?? defaultHint) && <div className="mt-2 text-center text-sm text-text-secondary">{hint ?? defaultHint}</div>}
		</div>
	);
}
