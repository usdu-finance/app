import { type ClassValue, clsx } from 'clsx';

/**
 * Utility function to combine class names
 * Combines clsx for conditional classes
 */
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}
