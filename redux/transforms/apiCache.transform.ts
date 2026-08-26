import { createTransform } from 'redux-persist';
import type { Reducer } from '@reduxjs/toolkit';

interface RtkQueryApiState {
	queries: Record<string, unknown>;
}

interface RtkQueryApi<S extends RtkQueryApiState> {
	reducerPath: string;
	reducer: Reducer<S>;
}

// Persists only the `queries` cache of an RTK Query api slice (skips subscriptions,
// in-flight mutations, and provided tags, which are runtime-only and shouldn't
// survive a reload). Each cached entry keeps RTK Query's own `fulfilledTimeStamp`,
// which `refetchOnMountOrArgChange` uses to decide whether rehydrated data is still
// fresh enough to show immediately or needs a background refetch.
export const createApiCacheTransform = <S extends RtkQueryApiState>(api: RtkQueryApi<S>) =>
	createTransform(
		(inboundState: S) => ({ queries: inboundState.queries }),
		(outboundState: Partial<RtkQueryApiState> | undefined) => ({
			...api.reducer(undefined, { type: '@@redux-persist/REHYDRATE_INIT' }),
			queries: outboundState?.queries ?? {},
		}),
		{ whitelist: [api.reducerPath] }
	);
