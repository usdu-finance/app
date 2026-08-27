import { TokenConfig, CUSTOM_TOKENS } from './config';

const COW_TOKEN_LIST_URL = 'https://files.cow.fi/tokens/CowSwap.json';
const CACHE_KEY = 'cow-token-list';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CowTokenListCache {
	tokens: TokenConfig[];
	timestamp: number;
}

interface CowTokenListResponse {
	tokens: TokenConfig[];
}

function getCachedTokens(): TokenConfig[] | null {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const cached: CowTokenListCache = JSON.parse(raw);
		if (Date.now() - cached.timestamp > CACHE_TTL) {
			localStorage.removeItem(CACHE_KEY);
			return null;
		}
		return cached.tokens;
	} catch {
		return null;
	}
}

function setCachedTokens(tokens: TokenConfig[]): void {
	try {
		const cache: CowTokenListCache = { tokens, timestamp: Date.now() };
		localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
	} catch {
		// Storage full or unavailable — ignore
	}
}

export async function fetchCowTokenList(): Promise<TokenConfig[]> {
	// Check cache first
	const cached = getCachedTokens();
	if (cached) return cached;

	const res = await fetch(COW_TOKEN_LIST_URL);
	if (!res.ok) {
		throw new Error(`Failed to fetch CoW token list: ${res.status}`);
	}
	const data: CowTokenListResponse = await res.json();
	const tokens = data.tokens ?? [];
	setCachedTokens(tokens);
	return tokens;
}

export function getMergedTokenList(cowTokens: TokenConfig[], chainId: number): TokenConfig[] {
	const filtered = cowTokens.filter((t) => t.chainId === chainId);

	// Index CoW tokens by lowercase address
	const byAddress = new Map<string, TokenConfig>();
	for (const t of filtered) {
		byAddress.set(t.address.toLowerCase(), t);
	}

	// Custom tokens override CoW entries with the same address
	for (const t of CUSTOM_TOKENS) {
		if (t.chainId === chainId) {
			byAddress.set(t.address.toLowerCase(), t);
		}
	}

	return Array.from(byAddress.values());
}

export function searchTokens(tokens: TokenConfig[], query: string): TokenConfig[] {
	if (!query.trim()) return tokens;
	const q = query.toLowerCase();
	return tokens.filter(
		(t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.address.toLowerCase() === q
	);
}

export function getTokenByAddress(tokens: TokenConfig[], address: string): TokenConfig | undefined {
	const addr = address.toLowerCase();
	return tokens.find((t) => t.address.toLowerCase() === addr);
}
