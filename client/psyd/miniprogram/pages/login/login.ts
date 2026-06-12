import { wxLogin, getAccessToken, getUserInfo, saveAuthData } from '../../utils/auth';
import { getImageUrl } from '../../utils/image';

Page({
  data: {
    loading: false,
    error: '',
    redirectUrl: '',
    // 完善资料弹窗
    showCompleteProfile: false,
    // 微信头像临时路径（chooseAvatar 返回）
    tempAvatarPath: '',
    // 昵称（input type="nickname" 自动填充）
    nickname: '',
    // 手机号是否已绑定
    phoneBound: false,
    // 是否同意隐私政策
    agreed: false,
  },

  onLoad(options: any) {
    const redirectUrl = options.redirectUrl ? decodeURIComponent(options.redirectUrl) : '';
    this.setData({ redirectUrl });

    const token = wx.getStorageSync('accessToken');
    if (token) {
      this.redirectToTarget();
    }
  },

  /** 微信登录 */
  async onLogin() {
    if (this.data.loading) return;
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意隐私政策', icon: 'none' });
      return;
    }
    this.setData({ loading: true, error: '' });
    wx.showLoading({ title: '登录中...' });

    try {
      const result = await wxLogin();
      const app = getApp<IAppOption>();
      app.globalData.justLoggedIn = true;
      app.globalData.loginTimestamp = Date.now();

      wx.hideLoading();
      this.setData({ loading: false });

      // 检查是否需要完善资料（昵称、头像、手机号）
      const needNickname = !result.userInfo.nickname;
      const needPhone = !result.userInfo.phone;

      if (needNickname || needPhone) {
        this.setData({
          showCompleteProfile: true,
          nickname: result.userInfo.nickname || '',
          phoneBound: !needPhone,
        });
      } else {
        this.redirectToTarget();
      }
    } catch (error: any) {
      wx.hideLoading();
      this.setData({
        loading: false,
        error: error.message || '登录失败，请重试',
      });
    }
  },

  /** 微信选择头像（chooseAvatar） */
  onChooseAvatar(e: any) {
    // e.detail.avatarUrl 是微信头像的临时文件路径
    this.setData({ tempAvatarPath: e.detail.avatarUrl });
  },

  /** 昵称输入 */
  onNicknameInput(e: any) {
    this.setData({ nickname: e.detail.value });
  },

  /** 获取手机号（微信手机号快速绑定） */
  onGetPhoneNumber(e: any) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '获取手机号失败', icon: 'none' });
      return;
    }
    this.bindPhone(e.detail.code);
  },

  /** 调用后端绑定手机号 */
  async bindPhone(code: string) {
    wx.showLoading({ title: '绑定中...' });
    try {
      const token = getAccessToken();
      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl}/wx-auth/phone`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          data: { code },
          timeout: 10000,
          success: resolve,
          fail: reject,
        });
      });

      wx.hideLoading();

      if (res.statusCode === 200 || res.statusCode === 201) {
        // 更新本地存储的用户信息中的手机号
        const userInfo = getUserInfo();
        if (userInfo) {
          saveAuthData(getAccessToken(), '', {
            ...userInfo,
            phone: res.data.purePhone || res.data.phone,
          });
        }
        wx.showToast({ title: '手机号绑定成功', icon: 'success' });
        this.setData({ phoneBound: true });
      } else {
        wx.showToast({
          title: res.data?.message || '绑定失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
    }
  },

  /** 提交完善资料 */
  async onSubmitProfile() {
    const token = getAccessToken();
    if (!token) return;

    wx.showLoading({ title: '保存中...' });

    try {
      // 1. 上传头像（如果有新选的微信头像）
      let avatarUrl = '';
      if (this.data.tempAvatarPath) {
        try {
          const uploadRes: any = await new Promise((resolve, reject) => {
            wx.uploadFile({
              url: `${getApp().globalData.apiBaseUrl}/files/upload`,
              filePath: this.data.tempAvatarPath,
              name: 'file',
              header: { Authorization: `Bearer ${token}` },
              success: resolve,
              fail: reject,
            });
          });
          if (uploadRes.statusCode === 201) {
            const body = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
            avatarUrl = body.url || body.data?.url || '';
          }
        } catch (e) {
          console.warn('[LoginPage] 头像上传失败', e);
        }
      }

      // 2. 同时更新昵称和头像
      const updateData: any = {};
      if (this.data.nickname) updateData.nickname = this.data.nickname;
      if (avatarUrl) {
        const fullAvatarUrl = getImageUrl(avatarUrl);
        updateData.avatar = fullAvatarUrl;
      }

      if (Object.keys(updateData).length > 0) {
        await new Promise((resolve, reject) => {
          wx.request({
            url: `${getApp().globalData.apiBaseUrl}/wx-users/${getUserInfo()?.id}`,
            method: 'PATCH',
            header: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            data: updateData,
            timeout: 10000,
            success: resolve,
            fail: reject,
          });
        });
      }

      // 3. 更新本地存储
      const userInfo = getUserInfo();
      if (userInfo) {
        saveAuthData(getAccessToken(), '', {
          ...userInfo,
          nickname: this.data.nickname || userInfo.nickname,
          avatar: updateData.avatar || userInfo.avatar,
        });
      }

      wx.hideLoading();
      wx.showToast({ title: '资料完善成功', icon: 'success' });
      this.setData({ showCompleteProfile: false });
      this.redirectToTarget();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  /** 跳过完善资料 */
  skipCompleteProfile() {
    this.setData({ showCompleteProfile: false });
    this.redirectToTarget();
  },

  redirectToTarget() {
    let redirectUrl = this.data.redirectUrl;
    if (redirectUrl && !redirectUrl.startsWith('/')) {
      redirectUrl = '/' + redirectUrl;
    }

    if (redirectUrl) {
      const tabBarPages = [
        'pages/packages/list/list', 'pages/product/list',
        'pages/cart/cart', 'pages/profile/profile',
      ];
      const normalizedUrl = redirectUrl.replace(/^\//, '');
      const baseUrl = normalizedUrl.split('?')[0];
      const isTabBar = tabBarPages.includes(baseUrl);

      if (isTabBar) {
        wx.switchTab({ url: '/' + baseUrl });
      } else {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack({ fail: () => wx.redirectTo({ url: redirectUrl }) });
        } else {
          wx.redirectTo({ url: redirectUrl });
        }
      }
    } else {
      wx.switchTab({ url: '/pages/packages/list/list' });
    }
  },

  /** 查看用户协议 */
  onViewUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/user/user'
    });
  },

  /** 查看隐私政策 */
  onViewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/agreement/privacy/privacy'
    });
  },

  skipLogin() {
    wx.switchTab({ url: '/pages/packages/list/list' });
  },

  preventMove() {},

  /** 勾选/取消勾选隐私政策 */
  onAgreementChange() {
    this.setData({ agreed: !this.data.agreed });
  },
});
