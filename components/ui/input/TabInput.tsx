import { Dispatch, SetStateAction } from 'react';

export interface TabInputProps {
	tabs?: string[];
	tab?: string;
	setTab?: Dispatch<SetStateAction<string>>;
}

export function TabInput({ tabs = [], tab = '', setTab = () => {} }: TabInputProps) {
	if (tabs.length === 0) return null;

	return (
		<div className="bg-card mb-5 rounded-lg">
			<div className="flex flex-row justify-between px-6 text-text-secondary">
				{tabs.map((t) => (
					<div
						key={t}
						className={`px-6 max-md:px-2 py-2 text-sm text-center ${
							t === tab ? 'text-text-primary font-semibold' : 'cursor-pointer hover:text-text-primary'
						}`}
						onClick={() => setTab(t)}
					>
						{t}
					</div>
				))}
			</div>
		</div>
	);
}
