import type { TxBatch } from './types';

/**
 * Batches in flight, kept outside of React so a transaction keeps being tracked when the page that sent it
 * unmounts. Finished batches stay a few seconds for the status line, then drop out.
 */
const FINISHED_TTL = 8_000;

let batches: TxBatch[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const txStore = {
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	getSnapshot: () => batches,
	getServerSnapshot: () => batches,

	upsert(batch: TxBatch) {
		batches = batches.some((b) => b.id === batch.id) ? batches.map((b) => (b.id === batch.id ? batch : b)) : [...batches, batch];
		emit();
		if (batch.status === 'confirmed' || batch.status === 'failed') {
			setTimeout(() => {
				batches = batches.filter((b) => b.id !== batch.id);
				emit();
			}, FINISHED_TTL);
		}
	},
};
