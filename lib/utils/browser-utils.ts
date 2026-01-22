/**
 * Check if code is running on client side
 */
export const isClient = typeof window !== 'undefined';

/**
 * Copy text to clipboard
 * @param text - The text to copy
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	if (!isClient || !navigator.clipboard) {
		return false;
	}

	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (error) {
		console.error('Failed to copy to clipboard:', error);
		return false;
	}
}

/**
 * Sleep/delay utility
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
