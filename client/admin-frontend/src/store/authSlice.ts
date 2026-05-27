import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { adminLogin, LoginRequest, LoginResponse } from '@/services/auth';

// 用户状态接口
interface User {
  id: number;
  openid: string;
  nickname: string;
  phone: string;
  isAdmin: boolean;
  token: string;
}

// Auth状态接口
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// 初始状态
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('token'),
};

// 异步登录action - 修正为POST请求
export const login = createAsyncThunk<
  LoginResponse,
  LoginRequest,
  { rejectValue: string }
>('auth/login', async (loginData, { rejectWithValue }) => {
  try {
    // 调用修正后的adminLogin API（POST请求）
    const response = await adminLogin(loginData);
    return response;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || '登录失败，请检查网络连接'
    );
  }
});

// 登出action
export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
});

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
  },
  extraReducers: (builder) => {
    builder
      // 登录处理
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.data;
        state.token = action.payload.data.token;
        state.isAuthenticated = true;
        state.error = null;
        // 保存到localStorage
        localStorage.setItem('token', action.payload.data.token);
        localStorage.setItem('user', JSON.stringify(action.payload.data));
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || '登录失败';
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // 登出处理
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
