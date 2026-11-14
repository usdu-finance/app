import { useRouter } from 'next/router';

const slug = (tab: string) => tab.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Selected tab of a page, kept in the `?tab=` query (the label as a slug, e.g. `fx-swap`) so a view can be
 * shared. The default tab (the first one unless given) leaves the url clean. Other query params, like `currency`, stay.
 */
export function useQueryTab<T extends string>(tabs: readonly T[], defaultTab: T = tabs[0]!): [T, (tab: T) => void] {
	const router = useRouter();
	const query = typeof router.query.tab === 'string' ? router.query.tab : '';
	const tab = tabs.find((t) => slug(t) === query) ?? defaultTab;

	const setTab = (next: T) => {
		const rest = { ...router.query };
		delete rest.tab;
		router.replace({ query: next === defaultTab ? rest : { ...rest, tab: slug(next) } }, undefined, { shallow: true });
	};

	return [tab, setTab];
}
