import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, UserSearchParams, UserStats } from '@/types/user';
import { PaginatedResponse } from '@/types/common';
import { userService } from '@/services/users';

interface UserState {
  users: User[];
  currentUser: User | null;
  stats: UserStats | null;
  searchParams: UserSearchParams;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [],
  currentUser: null,
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

// 异步获取用户列表
export const fetchUsers = createAsyncThunk(
  'user/fetchUsers',
  async (params: { pagination: { current: number; pageSize: number }; searchParams: UserSearchParams }) => {
    const response = await userService.getUsers({
      page: params.pagination.current,
      pageSize: params.pagination.pageSize,
      ...params.searchParams,
    });
    return response.data;
  }
);

// 异步获取用户统计
export const fetchUserStats = createAsyncThunk('user/fetchUserStats', async () => {
  const response = await userService.getUserStats();
  return response.data;
});

// 异步删除用户
export const deleteUser = createAsyncThunk('user/deleteUser', async (id: string) => {
  await userService.deleteUser(id);
  return id;
});

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setSearchParams: (state, action: PayloadAction<UserSearchParams>) => {
      state.searchParams = action.payload;
    },
    setPagination: (state, action: PayloadAction<Partial<typeof initialState.pagination>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取用户列表
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<PaginatedResponse<User>>) => {
        state.loading = false;
        state.users = action.payload.list;
        state.pagination = {
          current: action.payload.pagination.current,
          pageSize: action.payload.pagination.pageSize,
          total: action.payload.pagination.total,
        };
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取用户列表失败';
      })
      // 获取用户统计
      .addCase(fetchUserStats.fulfilled, (state, action: PayloadAction<UserStats>) => {
        state.stats = action.payload;
      })
      // 删除用户
      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<string>) => {
        state.users = state.users.filter(user => user.id !== action.payload);
      });
  },
});

export const { setSearchParams, setPagination, clearError, setCurrentUser } = userSlice.actions;
export default userSlice.reducer;
