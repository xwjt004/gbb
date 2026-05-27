/**
 * 优惠券API工具类
 * 封装所有优惠券相关的API请求
 */

import config from '../config/index';

const BASE_URL = `${config.BASE_URL}/wx-coupon`;

/**
 * 获取请求头
 */
function getHeaders(needAuth: boolean = false): any {
  const headers: any = {
    'Content-Type': 'application/json'
  };

  if (needAuth) {
    const token = wx.getStorageSync('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * 发起请求
 */
function request(options: {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  needAuth?: boolean;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: options.url,
      method: options.method,
      header: getHeaders(options.needAuth),
      data: options.data,
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data);
        } else {
          const errorData = res.data as any;
          const errorMessage = errorData?.message || '请求失败';
          reject(new Error(errorMessage));
        }
      },
      fail: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * 优惠券API接口
 */
export const CouponAPI = {
  /**
   * 获取可领取的优惠券列表
   */
  getAvailableCoupons(params: {
    page?: number;
    limit?: number;
    discountType?: 'FIXED' | 'PERCENTAGE';
  }): Promise<any> {
    const query = Object.keys(params)
      .filter(key => params[key as keyof typeof params] !== undefined)
      .map(key => `${key}=${params[key as keyof typeof params]}`)
      .join('&');

    return request({
      url: `${BASE_URL}${query ? '?' + query : ''}`,
      method: 'GET',
      needAuth: false
    });
  },

  /**
   * 领取优惠券
   */
  claimCoupon(code: string): Promise<any> {
    return request({
      url: `${BASE_URL}/claim`,
      method: 'POST',
      data: { code },
      needAuth: true
    });
  },

  /**
   * 获取我的优惠券列表
   */
  getMyCoupons(params: {
    page?: number;
    limit?: number;
    status?: 'UNUSED' | 'USED' | 'EXPIRED';
  }): Promise<any> {
    const query = Object.keys(params)
      .filter(key => params[key as keyof typeof params] !== undefined)
      .map(key => `${key}=${params[key as keyof typeof params]}`)
      .join('&');

    return request({
      url: `${BASE_URL}/my${query ? '?' + query : ''}`,
      method: 'GET',
      needAuth: true
    });
  },

  /**
   * 获取订单可用的优惠券列表
   */
  getAvailableCouponsForOrder(amount: number): Promise<any> {
    return request({
      url: `${BASE_URL}/available-for-order?amount=${amount}`,
      method: 'GET',
      needAuth: true
    });
  },

  /**
   * 获取优惠券详情
   */
  getCouponDetail(id: number): Promise<any> {
    const token = wx.getStorageSync('accessToken');
    
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'GET',
      needAuth: !!token
    });
  }
};

/**
 * 检查是否已登录
 */
export function checkLogin(onNeedLogin?: () => void): boolean {
  const token = wx.getStorageSync('accessToken');
  
  if (!token) {
    wx.showModal({
      title: '提示',
      content: '请先登录',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          if (onNeedLogin) {
            onNeedLogin();
          } else {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      }
    });
    return false;
  }

  return true;
}

/**
 * 格式化折扣显示
 */
export function formatDiscount(
  discountType: 'FIXED' | 'PERCENTAGE',
  discountValue: number
): string {
  if (discountType === 'FIXED') {
    return `¥${discountValue}`;
  } else {
    return `${discountValue * 10}折`;
  }
}

/**
 * 格式化使用条件
 */
export function formatCondition(minAmount: number | null): string {
  if (minAmount) {
    return `满¥${minAmount}可用`;
  }
  return '无门槛';
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
