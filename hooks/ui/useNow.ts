import { useEffect, useState } from 'react';
import { nowSeconds } from '@/lib/borrow/math';

/** Unix seconds, re-rendering every `intervalMs`. Auction prices move every second. */
export function useNow(intervalMs: number = 1000): number {
	const [now, setNow] = useState(nowSeconds);

	useEffect(() => {
		const id = setInterval(() => setNow(nowSeconds()), intervalMs);
		return () => clearInterval(id);
	}, [intervalMs]);

	return now;
}
