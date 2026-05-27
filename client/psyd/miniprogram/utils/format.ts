/**
 * 格式化工具函数
 */

/**
 * 格式化价格
 * @param price 价格
 * @param prefix 前缀，默认 ¥
 */
export function formatPrice(price: number | string, prefix: string = '¥'): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return `${prefix}0.00`;
  return `${prefix}${num.toFixed(2)}`;
}

/**
 * 格式化日期
 * @param date 日期
 * @param format 格式，默认 YYYY-MM-DD HH:mm:ss
 */
export function formatDate(date: Date | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 格式化相对时间
 * @param date 日期
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return formatDate(d, 'YYYY-MM-DD');
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}

/**
 * 格式化手机号（脱敏）
 * @param phone 手机号
 */
export function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 格式化数量
 * @param num 数量
 */
export function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  }
  return String(num);
}

/**
 * 格式化订单状态
 */
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': '待支付',
    'PAID': '已支付',
    'CONFIRMED': '已确认',
    'IN_PROGRESS': '进行中',
    'COMPLETED': '已完成',
    'CANCELLED': '已取消',
    'REFUNDED': '已退款'
  };
  return statusMap[status] || status;
}

/**
 * 格式化支付状态
 */
export function formatPaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'UNPAID': '未支付',
    'PARTIAL': '部分支付',
    'PAID': '已支付',
    'REFUNDING': '退款中',
    'REFUNDED': '已退款'
  };
  return statusMap[status] || status;
}

/**
 * 格式化优惠券类型
 */
export function formatCouponType(discountType: string, discountValue: number): string {
  if (discountType === 'FIXED') {
    return `减${discountValue}元`;
  } else if (discountType === 'PERCENT') {
    return `${discountValue * 10}折`;
  }
  return '';
}

/**
 * 格式化使用条件
 */
export function formatCouponCondition(minAmount: number | null): string {
  if (minAmount && minAmount > 0) {
    return `满${minAmount}可用`;
  }
  return '无门槛';
}
