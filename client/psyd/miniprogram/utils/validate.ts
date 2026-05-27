/**
 * 验证工具函数
 */

/**
 * 验证手机号
 */
export function validatePhone(phone: string): boolean {
  const reg = /^1[3-9]\d{9}$/;
  return reg.test(phone);
}

/**
 * 验证邮箱
 */
export function validateEmail(email: string): boolean {
  const reg = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
  return reg.test(email);
}

/**
 * 验证身份证号
 */
export function validateIdCard(idCard: string): boolean {
  const reg = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
  return reg.test(idCard);
}

/**
 * 验证是否为空
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 验证数字范围
 */
export function validateRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 验证字符串长度
 */
export function validateLength(str: string, min: number, max: number): boolean {
  const len = str.length;
  return len >= min && len <= max;
}
