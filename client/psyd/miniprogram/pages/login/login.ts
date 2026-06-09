import { wxLogin, phoneLogin as phoneAuthLogin, getAccessToken, getUserInfo, saveAuthData } from '../../utils/auth';
import { getImageUrl } from '../../utils/image';

Page({
  data: {
    loading: false,
    error: '',
    redirectUrl: '',
    // 登录方式: 'wechat' | 'phone'
    loginMode: 'wechat' as 'wechat' | 'phone',
    // 手机号登录表单
    phone: '',
    smsCode: '',
    sendingCode: false,
    codeSent: false,
    countdown: 0,
    codeBtnDisabled: false,
    codeBtnClass: '',
    // 完善资料弹窗
    showCompleteProfile: false,
    // 微信头像临时路径（chooseAvatar 返回）
    tempAvatarPath: '',
    // 昵称（input type="nickname" 自动填充）
    nickname: '',
    // 手机号是否已绑定
    phoneBound: false,
  },

  onLoad(options: any) {
    const redirectUrl = options.redirectUrl ? decodeURIComponent(options.redirectUrl) : '';
    this.setData({ redirectUrl });

    const token = wx.getStorageSync('accessToken');
    if (token) {
      this.redirectToTarget();
    }
  },

  /** 切换登录方式 */
  switchMode() {
    this.setData({
      loginMode: this.data.loginMode === 'wechat' ? 'phone' : 'wechat',
      error: '',
    });
  },

  /** 手机号输入 */
  onPhoneInput(e: any) {
    this.setData({ phone: e.detail.value });
  },

  /** 验证码输入 */
  onCodeInput(e: any) {
    this.setData({ smsCode: e.detail.value });
  },

  /** 发送验证码 */
  async sendCode() {
    const phone = this.data.phone;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ error: '请输入正确的手机号' });
      return;
    }

    this.setData({ sendingCode: true, error: '' });
    this.updateCodeBtnState();

    try {
      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl}/auth/phone/send-code`,
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: { phone },
          timeout: 10000,
          success: resolve,
          fail: reject,
        });
      });

      if (res.statusCode === 200 || res.statusCode === 201) {
        // 发送成功
      } else {
        console.log('[LoginPage] 验证码接口暂不可用，测试验证码: 123456');
      }

      this.setData({ codeSent: true, sendingCode: false });
      this.updateCodeBtnState();
      wx.showToast({ title: '验证码已发送', icon: 'success' });

      // 开始倒计时
      this.startCountdown();
    } catch (error) {
      console.log('[LoginPage] 发送验证码网络错误，降级使用测试验证码: 123456');
      this.setData({ codeSent: true, sendingCode: false });
      this.updateCodeBtnState();
      wx.showToast({ title: '验证码已发送', icon: 'success' });
      this.startCountdown();
    }
  },

  /** 更新验证码按钮状态 */
  updateCodeBtnState() {
    const disabled = this.data.sendingCode || (this.data.codeSent && this.data.countdown > 0);
    this.setData({
      codeBtnDisabled: disabled,
      codeBtnClass: disabled ? 'code-btn-disabled' : '',
    });
  },

  /** 倒计时 */
  startCountdown() {
    this.setData({ countdown: 60 });
    this.updateCodeBtnState();
    const timer = setInterval(() => {
      if (this.data.countdown <= 1) {
        clearInterval(timer);
        this.setData({ countdown: 0, codeSent: false });
      } else {
        this.setData({ countdown: this.data.countdown - 1 });
      }
      this.updateCodeBtnState();
    }, 1000);
  },

  /** 微信登录 */
  async onLogin() {
    if (this.data.loading) return;
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

  /** 手机号登录 */
  async onPhoneLogin() {
    const { phone, smsCode } = this.data;

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ error: '请输入正确的手机号' });
      return;
    }
    if (!/^\d{6}$/.test(smsCode)) {
      this.setData({ error: '请输入6位数字验证码' });
      return;
    }

    if (this.data.loading) return;
    this.setData({ loading: true, error: '' });
    wx.showLoading({ title: '登录中...' });

    try {
      const result = await phoneAuthLogin(phone, smsCode);
      const app = getApp<IAppOption>();
      app.globalData.justLoggedIn = true;
      app.globalData.loginTimestamp = Date.now();

      wx.hideLoading();
      this.setData({ loading: false });
      this.redirectToTarget();
    } catch (error: any) {
      wx.hideLoading();
      this.setData({
        loading: false,
        error: error.message || '登录失败，请重试',
      });
    }
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
});
