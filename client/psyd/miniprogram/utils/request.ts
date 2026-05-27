/**
 * 网络请求封装
 */

import config from '../config/index';

let currentBaseUrl = config.BASE_URL;
const FALLBACK_URL = config.FALLBACK_URL;
const TOKEN_KEY = config.TOKEN_KEY;

// 切换到备用URL
function switchToFallback() {
  if (FALLBACK_URL && currentBaseUrl !== FALLBACK_URL) {
    console.warn('🔄 切换到备用URL:', FALLBACK_URL);
    currentBaseUrl = FALLBACK_URL;
    return true;
  }
  return false;
}

interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE' | 'CONNECT';
  data?: any;
  header?: any;
  needAuth?: boolean;
  showLoading?: boolean;
}

/**
 * 通用请求方法
 */
export async function request<T = any>(config: RequestConfig, retryCount = 0): Promise<T> {
  const MAX_RETRIES = 1; // 最多重试1次（避免无限递归）
  const {
    url,
    method = 'GET',
    data,
    header = {},
    needAuth = true,
    showLoading = false
  } = config;

  // 显示加载提示
  if (showLoading) {
    wx.showLoading({ title: '加载中...', mask: true });
  }

  // 添加 Token
  if (needAuth) {
    const token = wx.getStorageSync(TOKEN_KEY);
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    console.log('🌐 发起请求:', {
      url: `${currentBaseUrl}${url}`,
      method,
      data,
      header: { 'Content-Type': 'application/json', ...header }
    });

    const response: any = await new Promise((resolve, reject) => {
      wx.request({
        url: `${currentBaseUrl}${url}`,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        success: resolve,
        fail: reject
      });
    });

    // 隐藏加载提示
    if (showLoading) {
      wx.hideLoading();
    }

    // 处理响应
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.data as T;
    } else if (response.statusCode === 401) {
      // Token 过期，尝试刷新 token
      console.log('🔐 检测到 401，尝试刷新 token...');
      
      const refreshToken = wx.getStorageSync('refreshToken');
      
      // 如果有 refreshToken 且不是刷新接口本身，尝试刷新
      if (refreshToken && !url.includes('/wx-auth/refresh')) {
        try {
          const refreshRes: any = await new Promise((resolve, reject) => {
            wx.request({
              url: `${currentBaseUrl}/wx-auth/refresh`,
              method: 'POST',
              header: {
                'Content-Type': 'application/json',
              },
              data: {
                refreshToken
              },
              success: resolve,
              fail: reject,
            });
          });

          if (refreshRes.statusCode === 200 || refreshRes.statusCode === 201) {
            const { accessToken, refreshToken: newRefreshToken } = refreshRes.data;
            
            // 保存新的 token
            wx.setStorageSync(TOKEN_KEY, accessToken);
            if (newRefreshToken) {
              wx.setStorageSync('refreshToken', newRefreshToken);
            }
            
            console.log('✅ Token 刷新成功，重试原请求');
            
            // 重试原请求（限制重试次数）
            if (retryCount < MAX_RETRIES) {
              return request(config, retryCount + 1);
            } else {
              console.error('❌ Token 刷新重试次数已达上限');
            }
          }
        } catch (refreshError) {
          console.error('❌ Token 刷新失败:', refreshError);
        }
      }
      
      // 刷新失败或没有 refreshToken，清除登录信息并跳转到登录页
      wx.removeStorageSync(TOKEN_KEY);
      wx.removeStorageSync('refreshToken');
      wx.removeStorageSync('userInfo');
      
      wx.showToast({
        title: '登录已过期，请重新登录',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/login/login' });
      }, 2000);
      throw new Error('登录已过期');
    } else {
      const message = response.data?.message || '请求失败';
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
      throw new Error(message);
    }
  } catch (error: any) {
    // 隐藏加载提示
    if (showLoading) {
      wx.hideLoading();
    }

    console.error('请求失败:', error);
    
    // 网络错误，尝试切换到备用URL（只重试一次）
    if (error.errMsg && error.errMsg.includes('request:fail') && retryCount < 1) {
      const switched = switchToFallback();
      if (switched) {
        console.log('🔄 使用备用URL重试...');
        // 使用备用URL重试一次
        return request(config, retryCount + 1);
      }
    }
    
    // 网络错误提示
    if (!error.message || error.message === 'request:fail') {
      wx.showToast({
        title: '网络连接失败',
        icon: 'none',
        duration: 2000
      });
    }
    
    throw error;
  }
}

/**
 * GET 请求
 */
export function get<T = any>(url: string, data?: any, options?: Partial<RequestConfig>): Promise<T> {
  return request<T>({ url, method: 'GET', data, ...options });
}

/**
 * POST 请求
 */
export function post<T = any>(url: string, data?: any, options?: Partial<RequestConfig>): Promise<T> {
  return request<T>({ url, method: 'POST', data, ...options });
}

/**
 * PUT 请求
 */
export function put<T = any>(url: string, data?: any, options?: Partial<RequestConfig>): Promise<T> {
  return request<T>({ url, method: 'PUT', data, ...options });
}

/**
 * DELETE 请求
 */
export function del<T = any>(url: string, data?: any, options?: Partial<RequestConfig>): Promise<T> {
  return request<T>({ url, method: 'DELETE', data, ...options });
}

/**
 * PATCH 请求 (使用 POST 模拟，因为微信小程序不支持 PATCH)
 * 注意：后端需要能够处理 POST 请求作为 PATCH
 */
export function patch<T = any>(url: string, data?: any, options?: Partial<RequestConfig>): Promise<T> {
  // 微信小程序不支持 PATCH 方法，使用 POST 代替
  // 可以在 header 中添加 X-HTTP-Method-Override 来告知后端这是一个 PATCH 请求
  const headers = {
    ...(options?.header || {}),
    'X-HTTP-Method-Override': 'PATCH'
  };
  return request<T>({ 
    url, 
    method: 'POST', 
    data, 
    ...options,
    header: headers
  });
}
