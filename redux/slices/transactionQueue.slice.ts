import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Basic transaction queue state for now
interface TransactionQueueState {
  transactions: any[];
  isExecuting: boolean;
  activeTransactionId: string | null;
  lastUpdated: number;
}

const initialState: TransactionQueueState = {
  transactions: [],
  isExecuting: false,
  activeTransactionId: null,
  lastUpdated: Date.now(),
};

export const transactionQueueSlice = createSlice({
  name: 'transactionQueue',
  initialState,
  reducers: {
    addTransaction: (state, action: PayloadAction<any>) => {
      state.transactions.push(action.payload);
      state.lastUpdated = Date.now();
    },
    removeTransaction: (state, action: PayloadAction<string>) => {
      state.transactions = state.transactions.filter(tx => tx.id !== action.payload);
      state.lastUpdated = Date.now();
    },
    clearAllTransactions: (state) => {
      state.transactions = [];
      state.activeTransactionId = null;
      state.isExecuting = false;
      state.lastUpdated = Date.now();
    },
    setIsExecuting: (state, action: PayloadAction<boolean>) => {
      state.isExecuting = action.payload;
      state.lastUpdated = Date.now();
    },
  },
});

export const { addTransaction, removeTransaction, clearAllTransactions, setIsExecuting } = transactionQueueSlice.actions;
export const transactionQueueReducer = transactionQueueSlice.reducer;