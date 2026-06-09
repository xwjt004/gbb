import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types/common';

// 重试状态追踪（避免无限重试）
const retryMap = new Map<string, number>();
const MAX_RETRIES = 1;
const RETRYABLE_METHODS = ['GET'];

// 原始 env 值 (允许用户写 /api/v1 或 /api/v1/)
const RAW_BASE = import.meta.env.VITE_API_URL || '/api/v1';
// 去掉末尾斜杠，避免双 //
export const BASE_URL = RAW_BASE.replace(/\/$/, '');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 计算 basePath（仅路径部分），用于在请求路径已经包含 basePath 时去重防止重复拼接
const computeBasePath = (rawBase: string) => {
  try {
    if (/^https?:\/\//i.test(rawBase)) {
      return new URL(rawBase).pathname.replace(/\/$/, '') || '/';
    }
    return rawBase || '';
  } catch {
    return rawBase || '';
  }
};
const BASE_PATH = computeBasePath(BASE_URL);

const normalizeUrl = (url: string) => {
  if (!url) return url;
  // 绝对 URL 保持不变
  if (/^https?:\/\//i.test(url)) return url;
  // 如果请求以 basePath 开头，则去掉前缀，交由 axios 的 baseURL 处理，避免出现重复的 /api/v1/api/v1
  if (BASE_PATH && url.startsWith(BASE_PATH)) {
    const rst = url.slice(BASE_PATH.length) || '/';
    return rst.startsWith('/') ? rst : '/' + rst;
  }
  return url;
};

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // 如果是文件 / blob / 流下载，直接透传
    if (response.config.responseType === 'blob') return response;

    // 成功响应，派发恢复事件（UI 可监听以取消离线提示）
    try {
      window.dispatchEvent(new CustomEvent('api:success', { detail: { url: response.config.url } }));
    } catch (e) {
      // ignore
    }

    const { data } = response;
    if (!data || typeof data !== 'object') return response; // 非标准结构透传

    // 优先 success 语义
    if ('success' in data) {
      if ((data as any).success) return response;
      const msg = (data as any).message || '请求失败';
      console.error('API Error:', msg);
      return Promise.reject(new Error(msg));
    }
    // 次优先 code 语义
    // 兼容两类约定：
    // - code === 0 表示成功（部分后端或旧约定）
    // - code === 200 表示成功（后端常用 HTTP-like 返回码）
    if ('code' in data) {
      const code = (data as any).code;
      if (code === 0 || code === 200) return response;
      const msg = (data as any).message || '请求失败';
      console.error('API Code Error:', msg);
      return Promise.reject(new Error(msg));
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message || '网络或服务器错误';

    // 网络错误或 5xx 时自动重试一次（仅 GET 请求）
    const config = error.config;
    if (config && RETRYABLE_METHODS.includes(config.method?.toUpperCase() || '')) {
      const retryKey = `${config.method}:${config.url}`;
      const retryCount = retryMap.get(retryKey) || 0;
      if (retryCount < MAX_RETRIES && (!status || status >= 500)) {
        retryMap.set(retryKey, retryCount + 1);
        console.warn(`请求失败，自动重试第 ${retryCount + 1} 次: ${config.url}`);
        return api(config);
      }
      retryMap.delete(retryKey);
    }

    if (status === 401) {
      console.error('登录已过期，请重新登录');
      localStorage.removeItem('admin_token');
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    } else if (status === 403) {
      console.error('权限不足');
    } else if (status && status >= 500) {
      console.error('服务器错误，请稍后重试');
    } else if (errorMessage) {
      console.error(errorMessage);
    } else {
      console.error('网络错误');
    }
    
    // 创建包含后端错误信息的 Error 对象
    const errorObj = new Error(errorMessage);
    (errorObj as any).status = status;
    
    // 全局派发错误事件，供 UI 层统一监听并提示
    try {
      const detail = { message: errorMessage, status };
      window.dispatchEvent(new CustomEvent('api:error', { detail }));
    } catch (e) {
      // ignore
    }
    return Promise.reject(errorObj);
  }
);

// 保持兼容: 仍返回 AxiosResponse (外层代码使用 resp.data 不受影响)
export const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => api.get(normalizeUrl(url), config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => api.post(normalizeUrl(url), data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => api.put(normalizeUrl(url), data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => api.delete(normalizeUrl(url), config),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> => api.patch(normalizeUrl(url), data, config),
};

// 若需要直接拿 data（去除最外层 AxiosResponse），可使用该轻量封装
export const simple = {
  get: async <T=any>(url: string, config?: AxiosRequestConfig): Promise<T> => (await api.get<ApiResponse<T>>(normalizeUrl(url), config)).data as any,
  post: async <T=any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => (await api.post<ApiResponse<T>>(normalizeUrl(url), data, config)).data as any,
  put: async <T=any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => (await api.put<ApiResponse<T>>(normalizeUrl(url), data, config)).data as any,
  patch: async <T=any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => (await api.patch<ApiResponse<T>>(normalizeUrl(url), data, config)).data as any,
  delete: async <T=any>(url: string, config?: AxiosRequestConfig): Promise<T> => (await api.delete<ApiResponse<T>>(normalizeUrl(url), config)).data as any,
};

export default api;
