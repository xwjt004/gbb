import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NetworkState {
  isOffline: boolean;
  lastError: string | null;
}

const initialState: NetworkState = {
  isOffline: false,
  lastError: null,
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setOffline: (state, action: PayloadAction<string | null>) => {
      state.isOffline = true;
      state.lastError = action.payload;
    },
    setOnline: (state) => {
      state.isOffline = false;
      state.lastError = null;
    },
  },
});

export const { setOffline, setOnline } = networkSlice.actions;
export default networkSlice.reducer;
