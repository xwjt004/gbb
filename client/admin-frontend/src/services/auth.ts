import axios from 'axios';

// 登录请求接口
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应接口
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    openid: string;
    nickname: string;
    phone: string;
    isAdmin: boolean;
    token: string;
  };
}

// 配置axios实例
const api = axios.create({
  baseURL: '/api/v1', // 使用Vite代理，会转发到http://localhost:3000/api/v1
  headers: {
    'Content-Type': 'application/json',
  },
});

// 管理员登录 - 用于后台管理系统
export const adminLogin = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await api.post('/users/admin-login', data);
  return response.data;
};

// 修改密码
export const changePassword = async (userId: number, oldPassword: string, newPassword: string) => {
  const token = localStorage.getItem('token');
  const response = await api.post('/auth/change-password', { userId, oldPassword, newPassword }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// 忘记密码
export const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

// 重置密码
export const resetPassword = async (token: string, newPassword: string) => {
  const response = await api.post('/auth/reset-password', { token, newPassword });
  return response.data;
};

export default {
  adminLogin,
  changePassword,
  forgotPassword,
  resetPassword,
};
