import dayjs from 'dayjs';
import { REGEX, DATE_FORMATS } from './constants';

/**
 * 格式化日期
 */
export const formatDate = (
  date: string | Date | dayjs.Dayjs,
  format: string = DATE_FORMATS.DATETIME
): string => {
  if (!date) return '';
  return dayjs(date).format(format);
};

/**
 * 格式化金额
 */
export const formatCurrency = (
  amount: number,
  currency: string = '¥',
  decimals: number = 2
): string => {
  if (typeof amount !== 'number') return `${currency}0.00`;
  return `${currency}${amount.toFixed(decimals)}`;
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 手机号脱敏
 */
export const maskPhoneNumber = (phone: string): string => {
  if (!phone || phone.length < 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

/**
 * 身份证号脱敏
 */
export const maskIdCard = (idCard: string): string => {
  if (!idCard) return '';
  if (idCard.length === 15) {
    return idCard.replace(/(\d{6})\d{6}(\d{3})/, '$1******$2');
  } else if (idCard.length === 18) {
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }
  return idCard;
};

/**
 * 邮箱脱敏
 */
export const maskEmail = (email: string): string => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedUsername = username.length > 2 
    ? username.slice(0, 2) + '*'.repeat(username.length - 2)
    : username;
  
  return `${maskedUsername}@${domain}`;
};

/**
 * 生成随机字符串
 */
export const generateRandomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 深拷贝对象
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  
  if (typeof obj === 'object') {
    const clonedObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  
  return obj;
};

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
};

/**
 * 获取时间范围
 */
export const getTimeRange = (range: string): [string, string] => {
  const now = dayjs();
  
  switch (range) {
    case 'today':
      return [
        now.startOf('day').toISOString(),
        now.endOf('day').toISOString(),
      ];
    case 'yesterday':
      const yesterday = now.subtract(1, 'day');
      return [
        yesterday.startOf('day').toISOString(),
        yesterday.endOf('day').toISOString(),
      ];
    case 'last7days':
      return [
        now.subtract(6, 'day').startOf('day').toISOString(),
        now.endOf('day').toISOString(),
      ];
    case 'last30days':
      return [
        now.subtract(29, 'day').startOf('day').toISOString(),
        now.endOf('day').toISOString(),
      ];
    case 'thisMonth':
      return [
        now.startOf('month').toISOString(),
        now.endOf('month').toISOString(),
      ];
    case 'lastMonth':
      const lastMonth = now.subtract(1, 'month');
      return [
        lastMonth.startOf('month').toISOString(),
        lastMonth.endOf('month').toISOString(),
      ];
    default:
      return [
        now.startOf('day').toISOString(),
        now.endOf('day').toISOString(),
      ];
  }
};

/**
 * 验证函数
 */
export const validators = {
  isPhone: (phone: string): boolean => REGEX.PHONE.test(phone),
  isEmail: (email: string): boolean => REGEX.EMAIL.test(email),
  isPassword: (password: string): boolean => REGEX.PASSWORD.test(password),
  isIdCard: (idCard: string): boolean => REGEX.ID_CARD.test(idCard),
  isWechatId: (wechatId: string): boolean => REGEX.WECHAT_ID.test(wechatId),
};

/**
 * 数组去重
 */
export const uniqueArray = <T>(array: T[], key?: keyof T): T[] => {
  if (!key) {
    return Array.from(new Set(array));
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

/**
 * 获取URL参数
 */
export const getUrlParams = (url?: string): Record<string, string> => {
  const urlString = url || window.location.href;
  const urlObj = new URL(urlString);
  const params: Record<string, string> = {};
  
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
};

/**
 * 下载文件
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * 计算百分比
 */
export const calculatePercentage = (
  value: number,
  total: number,
  decimals: number = 1
): number => {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
};

/**
 * 高亮文本
 */
export const highlightText = (text: string, keyword: string): string => {
  if (!keyword || !text) return text;
  
  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

/**
 * 本地存储操作
 */
export const storage = {
  get: (key: string, defaultValue: any = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  },
  
  set: (key: string, value: any): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  },
  
  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  },
};
