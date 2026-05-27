/**
 * 本地存储工具
 */

/**
 * 设置存储
 */
export function setStorage(key: string, data: any): void {
  try {
    wx.setStorageSync(key, data);
  } catch (error) {
    console.error('设置存储失败:', error);
  }
}

/**
 * 获取存储
 */
export function getStorage<T = any>(key: string, defaultValue?: T): T | null {
  try {
    const data = wx.getStorageSync(key);
    return data || defaultValue || null;
  } catch (error) {
    console.error('获取存储失败:', error);
    return defaultValue || null;
  }
}

/**
 * 移除存储
 */
export function removeStorage(key: string): void {
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    console.error('移除存储失败:', error);
  }
}

/**
 * 清空存储
 */
export function clearStorage(): void {
  try {
    wx.clearStorageSync();
  } catch (error) {
    console.error('清空存储失败:', error);
  }
}

/**
 * Token 相关
 */
const TOKEN_KEY = 'wx_access_token';

export function setToken(token: string): void {
  setStorage(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return getStorage<string>(TOKEN_KEY);
}

export function removeToken(): void {
  removeStorage(TOKEN_KEY);
}

/**
 * 用户信息相关
 */
const USER_INFO_KEY = 'wx_user_info';

export function setUserInfo(userInfo: any): void {
  setStorage(USER_INFO_KEY, userInfo);
}

export function getUserInfo<T = any>(): T | null {
  return getStorage<T>(USER_INFO_KEY);
}

export function removeUserInfo(): void {
  removeStorage(USER_INFO_KEY);
}

/**
 * 清除登录信息
 */
export function clearAuth(): void {
  removeToken();
  removeUserInfo();
}
