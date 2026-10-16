import { useCallback, useEffect, useRef, useState } from 'react';
import GodEyeJourneyView from './GodEyeJourneyView';
import GodEyeView from './GodEyeView';

type View = { kind: 'map' } | { kind: 'journey'; address: string; token: string | null };

const TITLE = 'Transparency Timeline - USDU Finance';

/** reads which view the url hash asks for */
function fromHash(): View {
	const p = new URLSearchParams(window.location.hash.slice(1));
	const addr = p.get('addr');
	return p.get('view') === 'journey' && addr && /^0x[0-9a-fA-F]{40}$/.test(addr)
		? { kind: 'journey', address: addr.toLowerCase(), token: p.get('token') }
		: { kind: 'map' };
}

/**
 * The map stays mounted (paused) underneath the account timeline, so coming back restores token, selection, focus,
 * time travel position and camera. Entering a timeline pushes a history entry, the browser back button leaves it.
 */
export default function GodEye() {
	const [view, setView] = useState<View>({ kind: 'map' });
	// journey entries pushed since the map, so "← Map" can unwind them in one go
	const depth = useRef(0);
	const baseTitle = useRef<string | null>(null);

	// a link with #view=journey&addr=… opens the timeline directly
	useEffect(() => {
		setView(fromHash());
		const pop = () => {
			const v = fromHash();
			if (v.kind === 'map') depth.current = 0;
			setView(v);
		};
		window.addEventListener('popstate', pop);
		window.addEventListener('hashchange', pop);
		return () => {
			window.removeEventListener('popstate', pop);
			window.removeEventListener('hashchange', pop);
		};
	}, []);

	useEffect(() => {
		if (baseTitle.current === null) baseTitle.current = document.title;
		if (view.kind === 'journey') document.title = TITLE;
		else if (baseTitle.current) document.title = baseTitle.current;
	}, [view]);

	const open = useCallback((address: string, token: string | null) => {
		const p = new URLSearchParams({ view: 'journey', addr: address.toLowerCase() });
		if (token) p.set('token', token);
		window.history.pushState(null, '', window.location.pathname + window.location.search + '#' + p.toString());
		depth.current += 1;
		setView({ kind: 'journey', address: address.toLowerCase(), token });
	}, []);

	const back = useCallback(() => {
		if (depth.current > 0) {
			// popstate flips the view and the map rewrites its own hash
			window.history.go(-depth.current);
			return;
		}
		window.history.replaceState(null, '', window.location.pathname + window.location.search);
		setView({ kind: 'map' });
	}, []);

	return (
		<div className="absolute inset-0">
			<div className={view.kind === 'journey' ? 'invisible pointer-events-none absolute inset-0' : 'absolute inset-0'}>
				<GodEyeView active={view.kind === 'map'} onTimeline={open} />
			</div>
			{view.kind === 'journey' && (
				<div className="absolute inset-0 z-40">
					<GodEyeJourneyView key={view.address} address={view.address} token={view.token} onBack={back} onOpenAddress={open} />
				</div>
			)}
		</div>
	);
}
