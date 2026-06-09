/**
 * 微信小程序配置文件
 */

// 获取当前环境
const env = 'production';

// 获取设备信息，判断运行环境
const deviceInfo = (wx as any).getDeviceInfo?.() ?? wx.getSystemInfoSync();
const isDevTools = deviceInfo.platform === 'devtools'; // 是否为开发者工具

// 不同环境的配置
const configs = {
  development: {
    // 开发环境：
    // 为了支持微信小程序的HTTPS要求，统一使用Cpolar HTTPS地址
    // 这样在开发者工具和真机上都能正常显示图片
    // cpolar地址（真机调试用，注意cpolar需要指向后端端口3000）
    baseUrl: 'https://155f69f1.r18.vip.cpolar.cn/api/v1',
    // 本地地址（仅开发者工具可用）
    fallbackUrl: 'http://127.0.0.1:3000/api/v1',
  },
  production: {
    // 生产环境：使用服务器域名
    baseUrl: 'https://guaibaobao.cn/api/v1',
    fallbackUrl: 'https://guaibaobao.cn/api/v1',
  }
};

console.log('[Config] 运行环境:', isDevTools ? '开发者工具' : '真机', '| BASE_URL:', configs[env].baseUrl);

// 开发者工具用本地地址（更快更稳定），真机用cpolar
export const BASE_URL = isDevTools ? configs[env].fallbackUrl : configs[env].baseUrl;
export const FALLBACK_URL = configs[env].fallbackUrl;
export const TOKEN_KEY = 'accessToken';

export default {
  BASE_URL,
  FALLBACK_URL,
  TOKEN_KEY,
  env,
  isDevTools,
};
