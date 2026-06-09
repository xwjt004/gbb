// app.ts
import config from './config/index';

App<IAppOption>({
  globalData: {
    justLoggedIn: false, // 标记是否刚刚完成登录
    loginTimestamp: 0,   // 登录时间戳
    apiBaseUrl: config.BASE_URL  // API基础URL
  },
  onLaunch() {
    // 输出环境信息
    console.log('==========================================');
    console.log('🚀 小程序启动');
    console.log('📱 运行环境:', config.isDevTools ? '开发者工具' : '真机');
    console.log('🌐 API地址:', config.BASE_URL);
    console.log('🔄 备用地址:', config.FALLBACK_URL);
    console.log('==========================================');

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录在 login 页面处理，此处不提前调用
  },
  
  onError(error: string) {
    console.error('==========================================');
    console.error('❌ 小程序全局错误:', error);
    console.error('==========================================');
    
    // 特殊处理文件系统错误
    if (error.includes('saaa_config.json') || error.includes('file system')) {
      console.error('⚠️ 检测到文件系统错误，可能是第三方库兼容性问题');
      console.error('建议: 清除缓存、重新构建npm、检查依赖版本');
    }
  }
})