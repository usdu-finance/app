import { useState } from 'react';

/**
 * Minimal sort state hook for table headers.
 * Pass sortTab/sortReverse to TableHead and use them to sort data before rendering.
 */
export function useSort(initialCol: string) {
	const [sortTab, setSortTab] = useState(initialCol);
	const [sortReverse, setSortReverse] = useState(false);

	const handleSort = (col: string) => {
		if (col === sortTab) {
			setSortReverse((r) => !r);
		} else {
			setSortTab(col);
			setSortReverse(false);
		}
	};

	return { sortTab, sortReverse, handleSort };
}
