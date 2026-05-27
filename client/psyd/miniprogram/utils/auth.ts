/**
 * 统一的认证工具类
 * 提供登录检查、token管理、自动跳转等功能
 */

import config from '../config/index';

export interface UserInfo {
  id: string;
  openid: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  memberLevel?: string;
}

/**
 * 检查用户是否已登录
 */
export function isLoggedIn(): boolean {
  const token = wx.getStorageSync('accessToken');
  return !!token;
}

/**
 * 获取accessToken
 */
export function getAccessToken(): string {
  return wx.getStorageSync('accessToken') || '';
}

/**
 * 获取refreshToken
 */
export function getRefreshToken(): string {
  return wx.getStorageSync('refreshToken') || '';
}

/**
 * 获取用户信息
 */
export function getUserInfo(): UserInfo | null {
  const userInfo = wx.getStorageSync('userInfo');
  return userInfo || null;
}

/**
 * 保存登录信息
 */
export function saveAuthData(accessToken: string, refreshToken: string, userInfo: UserInfo) {
  wx.setStorageSync('accessToken', accessToken);
  wx.setStorageSync('refreshToken', refreshToken);
  wx.setStorageSync('userInfo', userInfo);
}

/**
 * 清除登录信息
 */
export function clearAuthData() {
  wx.removeStorageSync('accessToken');
  wx.removeStorageSync('refreshToken');
  wx.removeStorageSync('userInfo');
}

/**
 * 检查登录状态，未登录则跳转到登录页
 * @param redirectUrl 登录成功后要跳转的页面
 * @returns boolean 是否已登录
 */
export function requireLogin(redirectUrl?: string): boolean {
  if (isLoggedIn()) {
    return true;
  }

  // 获取当前页面路径作为默认跳转地址
  if (!redirectUrl) {
    const pages = getCurrentPages();
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      redirectUrl = `/${currentPage.route}`;
      // 如果有参数，加上参数
      const options = (currentPage as any).options;
      if (options && Object.keys(options).length > 0) {
        const query = Object.keys(options)
          .map(key => `${key}=${options[key]}`)
          .join('&');
        redirectUrl += `?${query}`;
      }
    }
  }

  // 跳转到登录页
  wx.navigateTo({
    url: `/pages/login/login${redirectUrl ? `?redirectUrl=${encodeURIComponent(redirectUrl)}` : ''}`,
    fail: () => {
      // 如果跳转失败（比如页面栈太深），使用redirectTo
      wx.redirectTo({
        url: `/pages/login/login${redirectUrl ? `?redirectUrl=${encodeURIComponent(redirectUrl)}` : ''}`,
      });
    },
  });

  return false;
}

/**
 * 执行微信登录
 * @returns Promise<{accessToken, refreshToken, userInfo}>
 */
export async function wxLogin(): Promise<{
  accessToken: string;
  refreshToken: string;
  userInfo: UserInfo;
}> {
  try {
    // 1. 获取微信登录 code
    console.log('[wxLogin] 开始调用 wx.login()');
    const loginRes = await new Promise<WechatMiniprogram.LoginSuccessCallbackResult>((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject,
      });
    });
    console.log('[wxLogin] wx.login() 成功，code:', loginRes.code);

    // 2. 调用后端登录接口
    console.log('[wxLogin] 开始调用后端登录接口');
    const res: any = await new Promise((resolve, reject) => {
      wx.request({
        url: `${config.BASE_URL}/wx-auth/login`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
        },
        data: {
          code: loginRes.code,
        },
        success: resolve,
        fail: reject,
      });
    });

    console.log('[wxLogin] 后端响应:', res);

    if (res.statusCode === 200 || res.statusCode === 201) {
      // 登录成功
      const { accessToken, refreshToken, user } = res.data;

      // 保存登录信息
      saveAuthData(accessToken, refreshToken, user);

      console.log('[wxLogin] 登录成功，用户信息:', user);

      return {
        accessToken,
        refreshToken,
        userInfo: user,
      };
    } else {
      throw new Error(`HTTP ${res.statusCode}: ${res.data?.message || '未知错误'}`);
    }
  } catch (error: any) {
    console.error('[wxLogin] 登录失败:', error);

    let errorMessage = '登录失败，请重试';

    if (error.errMsg) {
      errorMessage = error.errMsg;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // 特殊错误处理
    if (errorMessage.includes('request:fail')) {
      errorMessage = '无法连接到后端服务器\n请确认后端服务正在运行';
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = '微信登录失败\n原因: code 无效或已过期';
    }

    throw new Error(errorMessage);
  }
}

/**
 * 发送带Token的请求
 * @param options 请求配置
 */
export function requestWithAuth(options: any): Promise<any> {
  const token = getAccessToken();

  if (!token) {
    return Promise.reject(new Error('未登录'));
  }

  // 处理PATCH方法（微信小程序不直接支持PATCH）
  let method = options.method || 'GET';
  const isPatch = method.toUpperCase() === 'PATCH';
  
  if (isPatch) {
    // 使用POST代替PATCH，通过header指定
    method = 'POST';
  }

  // 添加Authorization头
  const header = {
    ...options.header,
    Authorization: `Bearer ${token}`,
  };
  
  // 如果是PATCH请求，添加X-HTTP-Method-Override头
  if (isPatch) {
    header['X-HTTP-Method-Override'] = 'PATCH';
  }

  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      method,
      header,
      success: (res: any) => {
        // 如果返回401，说明token过期
        if (res.statusCode === 401) {
          clearAuthData();
          wx.showModal({
            title: '登录已过期',
            content: '请重新登录',
            showCancel: false,
            success: () => {
              requireLogin();
            },
          });
          reject(new Error('登录已过期'));
        } else {
          resolve(res);
        }
      },
      fail: reject,
    });
  });
}
