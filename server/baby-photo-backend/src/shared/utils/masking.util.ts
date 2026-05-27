/**
 * 敏感数据脱敏工具
 */

/** 手机号脱敏：保留前3后4，中间4位隐藏 */
export function maskPhone(phone?: string): string {
  if (!phone || phone.length < 7) return phone || '-';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/** 身份证号脱敏：保留前4后4，中间隐藏 */
export function maskIdCard(id?: string): string {
  if (!id || id.length < 10) return id || '-';
  return id.slice(0, 4) + '**********' + id.slice(-4);
}

/** 邮箱脱敏：a***@domain.com */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return email || '-';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

/** 姓名脱敏：保留姓，名用*代替 */
export function maskName(name?: string): string {
  if (!name) return '-';
  if (name.length <= 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
}
