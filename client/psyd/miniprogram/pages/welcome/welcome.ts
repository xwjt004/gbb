// pages/welcome/welcome.ts
// 自动静默登录版本

import { wxLogin, isLoggedIn } from '../../utils/auth';

Page({
  data: {
    message: '正在加载...'
  },

  async onLoad() {
    console.log('[WelcomePage] 页面加载 - 检查登录状态');
    
    // 检查是否已登录
    if (isLoggedIn()) {
      console.log('[WelcomePage] 已登录，直接进入首页');
      this.enterHome();
      return;
    }

    // 未登录，尝试自动登录
    console.log('[WelcomePage] 未登录，开始自动登录');
    this.setData({ message: '正在登录...' });

    try {
      await wxLogin();
      console.log('[WelcomePage] 自动登录成功');
      this.setData({ message: '登录成功' });
      
      // 短暂延迟后跳转
      setTimeout(() => {
        this.enterHome();
      }, 300);
      
    } catch (error) {
      console.error('[WelcomePage] 自动登录失败:', error);
      this.setData({ message: '登录失败，请稍后重试' });
      
      // 登录失败也进入首页，用户可以在需要时再登录
      setTimeout(() => {
        this.enterHome();
      }, 1500);
    }
  },

  /**
   * 进入首页
   */
  enterHome() {
    console.log('[WelcomePage] 跳转首页');
    
    // 跳转到商品列表页（tabBar 页面）
    wx.switchTab({
      url: '/pages/product/list',
      success: () => {
        console.log('[WelcomePage] 跳转成功');
      },
      fail: (err) => {
        console.error('[WelcomePage] 跳转失败', err);
        // 如果失败，尝试 reLaunch
        wx.reLaunch({
          url: '/pages/product/list'
        });
      }
    });
  }
});
