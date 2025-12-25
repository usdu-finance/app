import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';

// slices
import { transactionQueueReducer } from './slices/transactionQueue.slice';
// transforms
import { bigIntTransform } from './transforms/bigint.transform';

// Combine reducers
const rootReducer = combineReducers({
	transactionQueue: transactionQueueReducer,
});

// Redux Persist configuration
const persistConfig = {
	key: 'usdu_finance_redux_store',
	version: 1,
	storage,
	// Only persist the transaction queue
	whitelist: ['transactionQueue'],
	// Add BigInt transform
	transforms: [bigIntTransform],
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer as any);

// store with persisted reducers
export const store = configureStore({
	reducer: persistedReducer,
	devTools: {
		serialize: {
			replacer: (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
		},
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				// Ignore redux-persist actions
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
				// Ignore certain field paths that contain non-serializable values
				ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
				ignoredPaths: ['persist'],
				// Custom function to check if value is serializable
				isSerializable: (value: any) => {
					// Allow BigInt values - they'll be handled by our transform
					if (typeof value === 'bigint') return true;
					// Allow Date objects
					if (value instanceof Date) return true;
					// Allow functions in ABI (they get removed during serialization anyway)
					if (typeof value === 'function') return true;
					// Default serializable check for other values
					return (
						typeof value === 'undefined' ||
						typeof value === 'string' ||
						typeof value === 'boolean' ||
						typeof value === 'number' ||
						value === null ||
						Array.isArray(value) ||
						(typeof value === 'object' && value.constructor === Object)
					);
				},
			},
		}),
});

// Create persistor
export const persistor = persistStore(store);

// types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;