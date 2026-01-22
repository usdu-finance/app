import { Address, getAddress } from 'viem';

/**
 * Capitalize the first letter of a string
 * @param data - The string to capitalize
 */
export function capLetter(data: string) {
	return data.charAt(0).toUpperCase() + data.slice(1);
}

/**
 * Shorten a string by showing start and end with ellipsis in the middle
 * @param str - The string to shorten
 * @param start - Number of characters to show at start (default: 8)
 * @param end - Number of characters to show at end (default: 6)
 */
export const shortenString = (str: string, start = 8, end = 6) => {
	return str.substring(0, start) + '...' + str.substring(str.length - end);
};

/**
 * Shorten an Ethereum address for display with checksum validation
 * @param address - The address to shorten
 * @throws TypeError if address is invalid
 */
export const shortenAddress = (address: Address): string => {
	try {
		const formattedAddress = getAddress(address);
		return shortenString(formattedAddress);
	} catch {
		throw new TypeError("Invalid input, address can't be parsed");
	}
};

/**
 * Format an address for display (alternative implementation)
 * @param address - The address to format
 * @param chars - Number of characters to show on each side (default: 6)
 */
export function formatAddress(address: string, chars = 6): string {
	if (!address) return '';
	return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
