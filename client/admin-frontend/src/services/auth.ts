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

// 微信登录请求接口
export interface WxLoginRequest {
  openid: string;
  nickname: string;
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

// 微信登录 - 用于小程序
export const wxLogin = async (data: WxLoginRequest): Promise<LoginResponse> => {
  const response = await api.post('/users/wx-login', data);
  return response.data;
};

export default {
  adminLogin,
  wxLogin,
};
