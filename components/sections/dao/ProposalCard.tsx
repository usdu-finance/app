import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faDownload, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import Card from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/layout';
import { track } from '@/lib/analytics';

export interface ProposalStep {
	label: string;
	to: `0x${string}`;
	data: `0x${string}`;
}

const ICON_BTN =
	'flex items-center justify-center w-9 h-9 rounded-lg border border-usdu-orange text-usdu-orange hover:bg-usdu-orange hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none';

/** The steps collected for one DAO proposal, as a copyable / downloadable JSON payload for the Aragon app. */
export default function ProposalCard({
	proposal,
	setProposal,
	empty,
}: {
	proposal: ProposalStep[];
	setProposal: React.Dispatch<React.SetStateAction<ProposalStep[]>>;
	/** What to say while there are no steps yet. */
	empty: string;
}) {
	const [copied, setCopied] = useState(false);
	const proposalJson = JSON.stringify(
		proposal.map(({ to, data }) => ({ to, value: '0', data })),
		null,
		2
	);

	const copyProposal = () => {
		navigator.clipboard
			.writeText(proposalJson)
			.then(() => {
				track('proposal_copy', { routes: proposal.length });
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			})
			.catch(() => undefined);
	};

	const downloadProposal = () => {
		track('proposal_download', { routes: proposal.length });
		const url = URL.createObjectURL(new Blob([proposalJson], { type: 'application/json' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = 'dao-proposal.json';
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Card variant="panel" className="flex flex-col gap-6">
			<PageHeader
				title="DAO Proposal"
				description="Collect steps here and paste the JSON into the Aragon app. All steps are batched into one transaction of the proposal and executed by the DAO."
			/>
			<div className="space-y-2">
				{proposal.length === 0 && <div className="text-text-secondary">{empty}</div>}
				{proposal.map((step, i) => (
					<div key={i} className="flex items-center justify-between gap-4 rounded-lg bg-usdu-bg px-4 py-2">
						<span>
							<span className="text-text-muted">{i + 1}.</span> {step.label}
						</span>
						<button
							type="button"
							title="Remove this step"
							aria-label={`Remove proposal step ${i + 1}`}
							onClick={() => setProposal((p) => p.filter((_, j) => j !== i))}
							className={ICON_BTN}
						>
							<FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
						</button>
					</div>
				))}
			</div>
			{proposal.length > 0 && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<div className="flex w-full items-center justify-end gap-6">
							<button
								type="button"
								onClick={copyProposal}
								className="flex items-center gap-2 text-usdu-orange hover:underline"
							>
								<FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
								{copied ? 'Copied' : 'Copy JSON'}
							</button>
							<button
								type="button"
								onClick={downloadProposal}
								className="flex items-center gap-2 text-usdu-orange hover:underline"
							>
								<FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
								Download JSON
							</button>
							<button
								type="button"
								onClick={() => setProposal([])}
								className="flex items-center gap-2 text-usdu-orange hover:underline"
							>
								<FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
								Clear
							</button>
						</div>
					</div>
					<textarea
						readOnly
						value={proposalJson}
						rows={Math.min(proposalJson.split('\n').length, 16)}
						className="w-full rounded-lg bg-usdu-bg p-4 font-mono text-xs break-all"
					/>
				</div>
			)}
		</Card>
	);
}
