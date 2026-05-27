import { wxLogin } from '../../utils/auth';

Page({
  data: {
    loading: false,
    error: '',
    redirectUrl: '' // 登录成功后要跳转的页面
  },

  /**
   * 页面加载
   */
  onLoad(options: any) {
    console.log('[LoginPage] 页面加载，参数:', options);
    
    // 获取跳转地址并解码
    const redirectUrl = options.redirectUrl ? decodeURIComponent(options.redirectUrl) : '';
    this.setData({ redirectUrl });
    console.log('[LoginPage] 解码后的跳转地址:', redirectUrl);

    // 如果已经登录，直接跳转
    const token = wx.getStorageSync('accessToken');
    if (token) {
      console.log('[LoginPage] 已登录，跳转到目标页面');
      this.redirectToTarget();
    }
  },

  /**
   * 微信登录 (按钮点击事件)
   */
  async onLogin() {
    if (this.data.loading) return;

    this.setData({ 
      loading: true,
      error: ''
    });

    wx.showLoading({ title: '登录中...' });

    try {
      // 调用统一登录方法
      const result = await wxLogin();
      
      // 设置全局登录标记，避免 tabBar 页面 onShow 时重复检查
      const app = getApp<IAppOption>();
      app.globalData.justLoggedIn = true;
      app.globalData.loginTimestamp = Date.now();
      
      wx.hideLoading();
      this.setData({ loading: false });

      console.log('[LoginPage] 登录成功，准备跳转');

      // 直接跳转，无延迟，提升体验
      this.redirectToTarget();

    } catch (error: any) {
      wx.hideLoading();
      this.setData({ 
        loading: false,
        error: error.message || '登录失败，请重试'
      });

      console.error('[LoginPage] 登录失败:', error);
    }
  },

  /**
   * 跳转到目标页面
   */
  redirectToTarget() {
    let redirectUrl = this.data.redirectUrl;
    
    // 规范化路径：确保以 / 开头
    if (redirectUrl && !redirectUrl.startsWith('/')) {
      redirectUrl = '/' + redirectUrl;
    }
    
    if (redirectUrl && redirectUrl !== '') {
      console.log('[LoginPage] 跳转到:', redirectUrl);
      
      // 判断是否是tabBar页面（同时支持带/不带前导斜杠的匹配）
      const tabBarPages = [
        'pages/product/list',
        'pages/cart/cart',
        'pages/appointment/appointment',
        'pages/profile/profile'
      ];

      // 移除前导斜杠进行匹配
      const normalizedUrl = redirectUrl.replace(/^\//, '');
      const baseUrl = normalizedUrl.split('?')[0]; // 移除查询参数
      const isTabBar = tabBarPages.includes(baseUrl);

      console.log('[LoginPage] 规范化URL:', normalizedUrl, '是否TabBar页面:', isTabBar);

      if (isTabBar) {
        // tabBar页面必须使用switchTab，且不能有查询参数
        const cleanUrl = '/' + baseUrl;
        console.log('[LoginPage] 使用switchTab跳转到tabBar页面:', cleanUrl);
        
        wx.switchTab({
          url: cleanUrl,
          success: () => {
            console.log('[LoginPage] switchTab成功');
          },
          fail: (err) => {
            console.error('[LoginPage] switchTab失败:', err);
            // switchTab失败时，尝试跳转到默认首页
            if (cleanUrl !== '/pages/product/list') {
              console.log('[LoginPage] 尝试跳转到默认首页');
              wx.switchTab({
                url: '/pages/product/list',
                fail: (err2) => {
                  console.error('[LoginPage] 跳转到首页也失败:', err2);
                }
              });
            }
          }
        });
      } else {
        // 非tabBar页面使用navigateBack或redirectTo
        const pages = getCurrentPages();
        if (pages.length > 1) {
          // 如果有上一页，返回上一页
          console.log('[LoginPage] 返回上一页');
          wx.navigateBack({
            fail: () => {
              console.log('[LoginPage] navigateBack失败，使用redirectTo');
              wx.redirectTo({ 
                url: redirectUrl,
                fail: (err) => {
                  console.error('[LoginPage] redirectTo失败:', err);
                }
              });
            }
          });
        } else {
          console.log('[LoginPage] 使用redirectTo跳转:', redirectUrl);
          wx.redirectTo({ 
            url: redirectUrl,
            fail: (err) => {
              console.error('[LoginPage] redirectTo失败:', err);
            }
          });
        }
      }
    } else {
      // 没有指定跳转地址，默认跳转到首页
      console.log('[LoginPage] 没有redirectUrl，跳转到首页');
      wx.switchTab({
        url: '/pages/product/list',
        success: () => {
          console.log('[LoginPage] 跳转首页成功');
        },
        fail: (err) => {
          console.error('[LoginPage] 跳转首页失败:', err);
        }
      });
    }
  },

  /**
   * 跳过登录
   */
  skipLogin() {
    // 跳转到首页
    wx.switchTab({
      url: '/pages/product/list'
    });
  }
});
