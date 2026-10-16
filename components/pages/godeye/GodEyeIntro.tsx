import { useEffect, useState } from 'react';
import { Glass, IconButton } from './GodEyeUi';

const STORAGE_KEY = 'godeye:intro-dismissed';

const STEPS = [
	{ title: 'Tokens flow between addresses', text: 'Each dot is an address, each line a flow of the selected token.' },
	{ title: 'Nodes are grouped by category', text: 'Minters, DEX pools, savings and more share a colour.' },
	{ title: 'Click a node or press play', text: 'Open an address for details, or replay the timeline.' },
];

export default function GodEyeIntro() {
	// hidden until the stored choice is known, so a dismissed card never flashes
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		try {
			setVisible(window.localStorage.getItem(STORAGE_KEY) !== '1');
		} catch {
			setVisible(true);
		}
	}, []);

	const dismiss = () => {
		setVisible(false);
		try {
			window.localStorage.setItem(STORAGE_KEY, '1');
		} catch {
			/* ignore */
		}
	};

	if (!visible) return null;

	return (
		<Glass className="absolute bottom-[160px] left-1/2 z-10 w-[calc(100%-24px)] max-w-[560px] -translate-x-1/2 p-4 max-md:hidden">
			<div className="mb-3 flex items-center justify-between">
				<span className="text-sm font-bold">What am I looking at?</span>
				<IconButton onClick={dismiss}>Got it</IconButton>
			</div>
			<div className="grid grid-cols-3 gap-3">
				{STEPS.map((s, i) => (
					<div key={s.title} className="flex flex-col gap-1">
						<span className="flex h-5 w-5 items-center justify-center rounded-full bg-usdu-black text-[11px] font-bold text-usdu-card">
							{i + 1}
						</span>
						<span className="text-xs font-semibold">{s.title}</span>
						<span className="text-[11px] leading-snug text-text-secondary">{s.text}</span>
					</div>
				))}
			</div>
		</Glass>
	);
}
