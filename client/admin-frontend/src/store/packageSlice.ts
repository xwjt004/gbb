import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Package, PackageSearchParams, PackageStats } from '@/types/package';

interface PackageState {
  packages: Package[];
  currentPackage: Package | null;
  stats: PackageStats | null;
  searchParams: PackageSearchParams;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: PackageState = {
  packages: [],
  currentPackage: null,
  stats: null,
  searchParams: {},
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  loading: false,
  error: null,
};

const packageSlice = createSlice({
  name: 'package',
  initialState,
  reducers: {
    setPackages: (state, action: PayloadAction<Package[]>) => {
      state.packages = action.payload;
    },
    setCurrentPackage: (state, action: PayloadAction<Package>) => {
      state.currentPackage = action.payload;
    },
    setStats: (state, action: PayloadAction<PackageStats>) => {
      state.stats = action.payload;
    },
    setSearchParams: (state, action: PayloadAction<PackageSearchParams>) => {
      state.searchParams = action.payload;
    },
    setPagination: (state, action: PayloadAction<Partial<typeof initialState.pagination>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setPackages,
  setCurrentPackage,
  setStats,
  setSearchParams,
  setPagination,
  setLoading,
  setError,
  clearError,
} = packageSlice.actions;

export default packageSlice.reducer;
