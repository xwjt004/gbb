/**
 * 获取本地日期字符串 YYYY-MM-DD（使用服务器时区，UTC+8）
 * 替代 .toISOString().split('T')[0]，避免 UTC 转换导致日期偏移
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 获取本地时间字符串 HH:mm（使用服务器时区）
 */
export function formatLocalTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
