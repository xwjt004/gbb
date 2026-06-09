import { clearAuthData } from '../../utils/auth';

Page({
  data: {
    cacheSize: '0KB',
    appVersion: '2.1.0',
    env: '正式版',
  },

  onLoad() {
    this.calcCache();
  },

  /** 计算缓存大小 */
  calcCache() {
    try {
      const info = wx.getStorageInfoSync();
      const size = info.currentSize || 0;
      let cacheSize: string;
      if (size < 1024) {
        cacheSize = size + 'KB';
      } else {
        cacheSize = (size / 1024).toFixed(1) + 'MB';
      }
      this.setData({ cacheSize });
    } catch (e) {
      this.setData({ cacheSize: '未知' });
    }
  },

  /** 清除缓存 */
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？清除后需要重新登录。',
      confirmText: '确定清除',
      confirmColor: '#FF6B9D',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();
            this.setData({ cacheSize: '0KB' });
            wx.showToast({ title: '缓存已清除', icon: 'success' });
          } catch (e) {
            wx.showToast({ title: '清除失败', icon: 'none' });
          }
        }
      },
    });
  },

  /** 退出登录 */
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      confirmColor: '#FF6B9D',
      success: (res) => {
        if (res.confirm) {
          clearAuthData();
          wx.showToast({ title: '已退出登录', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      },
    });
  },

  /** 用户协议 */
  showAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/user/user'
    });
  },

  /** 隐私政策 */
  showPrivacy() {
    wx.navigateTo({
      url: '/pages/agreement/privacy/privacy'
    });
  },
});
