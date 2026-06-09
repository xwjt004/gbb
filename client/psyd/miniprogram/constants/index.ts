/**
 * 小程序常量配置
 */

export const SHOP = {
  /** 客服电话 */
  PHONE: '0416-5577456',
  /** 营业时间 */
  HOURS: '8:30-16:00',
} as const;

export const CONTACT_CONTENT = `客服电话：${SHOP.PHONE}\n营业时间：${SHOP.HOURS}`;
