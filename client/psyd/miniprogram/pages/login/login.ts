import { wxLogin, getAccessToken, getUserInfo, saveAuthData } from '../../utils/auth';
import { getImageUrl } from '../../utils/image';

Page({
  data: {
    loading: false,
    error: '',
    redirectUrl: '',
    showCompleteProfile: false,
    tempAvatarPath: '',
    nickname: '',
    phoneBound: false,
    agreed: false,
  },

  onLoad(options) {
    var redirectUrl = options.redirectUrl ? decodeURIComponent(options.redirectUrl) : '';
    this.setData({ redirectUrl: redirectUrl });

    var token = wx.getStorageSync('accessToken');
    if (token) {
      this.redirectToTarget();
    }
  },

  async onLogin() {
    if (this.data.loading) return;
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意隐私政策', icon: 'none' });
      return;
    }
    this.setData({ loading: true, error: '' });
    wx.showLoading({ title: '登录中...' });

    try {
      var result = await wxLogin();
      var app = getApp();
      app.globalData.justLoggedIn = true;
      app.globalData.loginTimestamp = Date.now();

      wx.hideLoading();
      this.setData({ loading: false });

      var needNickname = !result.userInfo.nickname;
      var needPhone = !result.userInfo.phone;

      if (needNickname || needPhone) {
        this.setData({
          showCompleteProfile: true,
          nickname: result.userInfo.nickname || '',
          phoneBound: !needPhone,
        });
      } else {
        this.redirectToTarget();
      }
    } catch (error) {
      wx.hideLoading();
      this.setData({
        loading: false,
        error: error.message || '登录失败，请重试',
      });
    }
  },

  onChooseAvatar(e) {
    this.setData({ tempAvatarPath: e.detail.avatarUrl });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '获取手机号失败', icon: 'none' });
      return;
    }
    this.bindPhone(e.detail.code);
  },

  async bindPhone(code) {
    wx.showLoading({ title: '绑定中...' });
    try {
      var token = getAccessToken();
      var res = await new Promise(function(resolve, reject) {
        wx.request({
          url: getApp().globalData.apiBaseUrl + '/wx-auth/phone',
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          data: { code: code },
          timeout: 10000,
          success: resolve,
          fail: reject,
        });
      });

      wx.hideLoading();

      if (res.statusCode === 200 || res.statusCode === 201) {
        var userInfo = getUserInfo();
        if (userInfo) {
          saveAuthData(getAccessToken(), '', Object.assign({}, userInfo, {
            phone: res.data.purePhone || res.data.phone,
          }));
        }
        wx.showToast({ title: '手机号绑定成功', icon: 'success' });
        this.setData({ phoneBound: true });
      } else {
        wx.showToast({
          title: res.data && res.data.message ? res.data.message : '绑定失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
    }
  },

  async onSubmitProfile() {
    var token = getAccessToken();
    if (!token) return;

    wx.showLoading({ title: '保存中...' });
    var self = this;

    try {
      var avatarUrl = '';
      if (this.data.tempAvatarPath) {
        try {
          var uploadRes = await new Promise(function(resolve, reject) {
            wx.uploadFile({
              url: getApp().globalData.apiBaseUrl + '/files/upload',
              filePath: self.data.tempAvatarPath,
              name: 'file',
              header: { Authorization: 'Bearer ' + token },
              success: resolve,
              fail: reject,
            });
          });
          if (uploadRes.statusCode === 201) {
            var body = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
            avatarUrl = body.url || (body.data && body.data.url) || '';
          }
        } catch (e) {
          console.warn('[LoginPage] 头像上传失败', e);
        }
      }

      var updateData = {};
      if (this.data.nickname) updateData.nickname = this.data.nickname;
      if (avatarUrl) {
        updateData.avatar = getImageUrl(avatarUrl);
      }

      if (Object.keys(updateData).length > 0) {
        var userInfoData = getUserInfo();
        var patchRes = await new Promise(function(resolve, reject) {
          wx.request({
            url: getApp().globalData.apiBaseUrl + '/wx-users/' + (userInfoData ? userInfoData.id : ''),
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'X-HTTP-Method-Override': 'PATCH',
              Authorization: 'Bearer ' + token,
            },
            data: updateData,
            timeout: 10000,
            success: function(res) {
              if (res.statusCode >= 400) {
                reject(new Error((res.data && res.data.message) || '保存失败'));
              } else {
                resolve(res);
              }
            },
            fail: reject,
          });
        });
      }

      var currentUserInfo = getUserInfo();
      if (currentUserInfo) {
        saveAuthData(getAccessToken(), '', Object.assign({}, currentUserInfo, {
          nickname: this.data.nickname || currentUserInfo.nickname,
          avatar: updateData.avatar || currentUserInfo.avatar,
        }));
      }

      wx.hideLoading();
      wx.showToast({ title: '资料完善成功', icon: 'success' });
      this.setData({ showCompleteProfile: false });
      this.redirectToTarget();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    }
  },

  skipCompleteProfile() {
    this.setData({ showCompleteProfile: false });
    this.redirectToTarget();
  },

  redirectToTarget() {
    var redirectUrl = this.data.redirectUrl;
    if (redirectUrl && redirectUrl.charAt(0) !== '/') {
      redirectUrl = '/' + redirectUrl;
    }

    if (redirectUrl) {
      var tabBarPages = [
        'pages/packages/list/list', 'pages/product/list',
        'pages/cart/cart', 'pages/profile/profile',
      ];
      var normalizedUrl = redirectUrl.replace(/^\//, '');
      var baseUrl = normalizedUrl.split('?')[0];
      var isTabBar = false;
      for (var i = 0; i < tabBarPages.length; i++) {
        if (tabBarPages[i] === baseUrl) {
          isTabBar = true;
          break;
        }
      }

      if (isTabBar) {
        wx.switchTab({ url: '/' + baseUrl });
      } else {
        var pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack({ fail: function() { wx.redirectTo({ url: redirectUrl }); } });
        } else {
          wx.redirectTo({ url: redirectUrl });
        }
      }
    } else {
      wx.switchTab({ url: '/pages/packages/list/list' });
    }
  },

  onViewUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/user/user'
    });
  },

  onViewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/agreement/privacy/privacy'
    });
  },

  skipLogin() {
    wx.switchTab({ url: '/pages/packages/list/list' });
  },

  preventMove() {},

  onAgreementChange() {
    this.setData({ agreed: !this.data.agreed });
  },
});
