import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(duration);
dayjs.extend(relativeTime);

/**
 * Convert a Date to Unix timestamp (seconds)
 * @param value - The date to convert
 */
export const toTimestamp = (value: Date) => {
	return Math.floor(value.getTime() / 1000);
};

/**
 * Format timestamp to ISO-like locale string (no separators)
 * @param timestamp - Unix timestamp in seconds
 */
export const formatDateLocale = (timestamp: number | bigint): string => {
	const date = dayjs(Number(timestamp) * 1000);
	return date.toISOString().replaceAll('-', '').replaceAll(':', '').replaceAll('.', '');
};

/**
 * Format timestamp to readable date string (YYYY-MM-DD HH:mm)
 * @param timestamp - Unix timestamp in seconds
 */
export const formatDate = (timestamp: number | bigint): string => {
	const date = dayjs(Number(timestamp) * 1000);
	return date.format('YYYY-MM-DD HH:mm');
};

/**
 * Format timestamp as relative time duration (e.g., "2 hours ago")
 * @param timestamp - Unix timestamp in seconds
 */
export const formatDateDuration = (timestamp: number | bigint): string => {
	const date = dayjs(Number(timestamp) * 1000);
	return dayjs.duration(date.toISOString()).humanize(true);
};

/**
 * Format duration in seconds to human-readable string (e.g., "2 hours")
 * @param time - Duration in seconds
 */
export const formatDuration = (time: number | bigint): string => {
	const duration = dayjs.duration(Number(time), 'seconds').humanize(false);
	return time > 0 ? duration : '-';
};

/**
 * Check if a timestamp is in the past (expired)
 * @param timestamp - Unix timestamp in seconds
 */
export const isDateExpired = (timestamp: number | bigint): boolean => {
	const date = dayjs(Number(timestamp) * 1000);
	return date.isBefore();
};

/**
 * Check if a timestamp is in the future (upcoming)
 * @param timestamp - Unix timestamp in seconds
 */
export const isDateUpcoming = (timestamp: number | bigint): boolean => {
	const date = dayjs(Number(timestamp) * 1000);
	return date.isAfter();
};
