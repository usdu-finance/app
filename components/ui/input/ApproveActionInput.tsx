import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faWallet } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import ButtonInput from './ButtonInput';

export interface ApprovalStep {
	/** symbol of the token to approve, e.g. "CHFU" */
	tokenSymbol: string;
	/** true while the allowance is insufficient for the action */
	needsApproval: boolean;
	isApproving?: boolean;
	onApprove: () => void;
}

interface ApproveActionInputProps {
	/** label of the follow-up action, e.g. "Stake" */
	actionLabel: string;
	/** approvals in the order they have to be sent */
	approvals?: ApprovalStep[];
	isActing?: boolean;
	/** disables all steps, e.g. on input errors */
	disabled?: boolean;
	/** disables only the action step, on top of `disabled` */
	actionDisabled?: boolean;
	onAction: () => void;
	isConnected: boolean;
	onConnect: () => void;
	hint?: string;
}

/**
 * Shows the approval(s) and the action side by side, so users see that
 * approving is only the first of two (or more) transactions.
 */
export default function ApproveActionInput({
	actionLabel,
	approvals = [],
	isActing,
	disabled,
	actionDisabled,
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

	const pendingIndex = approvals.findIndex((s) => s.needsApproval);
	const pending = pendingIndex >= 0 ? approvals[pendingIndex] : undefined;
	const anyApproving = approvals.some((s) => s.isApproving);

	const defaultHint = anyApproving || isActing
		? 'Waiting for transaction confirmation.'
		: pending
			? `Approve ${pending.tokenSymbol} first to enable ${actionLabel}.`
			: approvals.length > 0
				? `Approval done. Click ${actionLabel} to continue.`
				: undefined;

	const cols = approvals.length > 1 ? 'grid-cols-1 sm:grid-cols-3' : approvals.length === 1 ? 'grid-cols-2' : 'grid-cols-1';
	const shownHint = hint ?? defaultHint;

	return (
		<div>
			<div className={cn('grid gap-3', cols)}>
				{approvals.map((step, i) =>
					step.needsApproval ? (
						<ButtonInput
							key={step.tokenSymbol}
							label={step.isApproving ? `Approving ${step.tokenSymbol}...` : `Approve ${step.tokenSymbol}`}
							size="lg"
							className="w-full"
							// later approvals wait for the earlier ones
							disabled={disabled || i > pendingIndex || isActing}
							loading={step.isApproving}
							onClick={step.onApprove}
						/>
					) : (
						<div
							key={step.tokenSymbol}
							className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 text-base font-medium rounded-lg cursor-default border border-success-border bg-success-bg text-green-700"
						>
							<FontAwesomeIcon icon={faCheck} />
							{step.tokenSymbol} approved
						</div>
					)
				)}

				<ButtonInput
					label={actionLabel}
					size="lg"
					className="w-full"
					disabled={!!pending || disabled || actionDisabled || anyApproving}
					loading={isActing}
					onClick={onAction}
				/>
			</div>
			{shownHint && <div className="mt-2 text-center text-sm text-text-secondary">{shownHint}</div>}
		</div>
	);
}
