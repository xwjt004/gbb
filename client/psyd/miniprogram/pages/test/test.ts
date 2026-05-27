Page({
  data: {
    loading: false,
    loginResult: false,
    userInfo: null as any,
    accessToken: '',
    refreshToken: '',
    error: '',
    phoneNumber: '',
    memberLevelText: ''
  },

  /**
   * 页面加载
   */
  onLoad() {
    console.log('测试页面加载');
    // 检查是否已经登录
    const token = wx.getStorageSync('accessToken');
    if (token) {
      console.log('检测到已保存的 token');
    }
  },

  /**
   * 测试微信登录
   */
  async testLogin() {
    if (this.data.loading) return;

    this.setData({ 
      loading: true,
      error: '',
      loginResult: false 
    });

    wx.showLoading({ title: '登录中...' });

    try {
      // 1. 获取微信登录 code
      console.log('开始调用 wx.login()');
      const loginRes = await wx.login();
      console.log('wx.login() 成功，code:', loginRes.code);

      // 2. 调用后端登录接口
      console.log('开始调用后端登录接口');
      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl || 'http://192.168.1.3:3000/api/v1'}/wx-auth/login`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            code: loginRes.code
          },
          success: resolve,
          fail: reject
        });
      });

      wx.hideLoading();
      this.setData({ loading: false });

      console.log('后端响应:', res);

      if (res.statusCode === 200 || res.statusCode === 201) {
        // 登录成功
        const { accessToken, refreshToken, user } = res.data;

        // 获取会员等级文本
        const memberLevelMap: Record<string, string> = {
          'ORDINARY': '普通会员',
          'SILVER': '银卡会员',
          'GOLD': '金卡会员',
          'PLATINUM': '白金会员',
          'DIAMOND': '钻石会员'
        };

        this.setData({
          loginResult: true,
          userInfo: user,
          accessToken: accessToken.substring(0, 50) + '...',
          refreshToken: refreshToken,
          memberLevelText: memberLevelMap[user.memberLevel] || user.memberLevel,
          error: ''
        });

        // 保存 token 到本地存储
        wx.setStorageSync('accessToken', accessToken);
        wx.setStorageSync('refreshToken', refreshToken);
        wx.setStorageSync('userInfo', user);

        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 2000
        });

        console.log('登录成功，用户信息:', user);
      } else {
        throw new Error(`HTTP ${res.statusCode}: ${res.data?.message || '未知错误'}`);
      }
    } catch (error: any) {
      wx.hideLoading();
      this.setData({ loading: false });

      console.error('登录失败:', error);

      let errorMessage = '登录失败，请重试';
      
      if (error.errMsg) {
        errorMessage = error.errMsg;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // 特殊错误处理
      if (errorMessage.includes('request:fail')) {
        errorMessage = '无法连接到后端服务器\n请确认:\n1. 后端服务正在运行\n2. project.config.json 中 urlCheck: false';
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = '微信登录失败\n原因: code 无效或已过期\n提示: 每个 code 只能使用一次';
      }

      this.setData({
        loginResult: false,
        error: errorMessage
      });

      wx.showToast({
        title: '登录失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 获取用户信息
   */
  async getUserProfile() {
    try {
      const res = await wx.getUserProfile({
        desc: '用于完善用户资料'
      });

      console.log('获取用户信息成功:', res.userInfo);

      // 更新本地显示
      const userInfo = this.data.userInfo;
      if (userInfo) {
        userInfo.nickname = res.userInfo.nickName;
        userInfo.avatar = res.userInfo.avatarUrl;
        this.setData({ userInfo });

        // 保存到本地存储
        wx.setStorageSync('userInfo', userInfo);

        wx.showToast({
          title: '获取成功',
          icon: 'success'
        });
      }

      // TODO: 可以调用后端接口更新用户信息
      // await this.updateUserInfo(res.userInfo);

    } catch (error: any) {
      console.error('获取用户信息失败:', error);
      
      if (error.errMsg?.includes('getUserProfile:fail auth deny')) {
        wx.showToast({
          title: '用户拒绝授权',
          icon: 'none'
        });
      } else {
        wx.showToast({
          title: '获取失败',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 获取手机号
   */
  async getPhoneNumber(e: any) {
    console.log('getPhoneNumber event:', e);

    const { code, errMsg } = e.detail;

    if (errMsg !== 'getPhoneNumber:ok' || !code) {
      wx.showToast({
        title: '用户拒绝授权',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({ title: '获取中...' });

    try {
      const token = this.data.refreshToken || wx.getStorageSync('accessToken');

      if (!token) {
        throw new Error('未登录，请先登录');
      }

      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl || 'http://192.168.1.3:3000/api/v1'}/wx-auth/phone`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data: { code },
          success: resolve,
          fail: reject
        });
      });

      wx.hideLoading();

      if (res.statusCode === 200 || res.statusCode === 201) {
        this.setData({
          phoneNumber: res.data.phone
        });

        // 更新用户信息中的手机号
        const userInfo = this.data.userInfo;
        if (userInfo) {
          userInfo.phone = res.data.purePhone;
          this.setData({ userInfo });
        }

        wx.showToast({
          title: '获取成功',
          icon: 'success',
          duration: 2000
        });

        console.log('手机号获取成功:', res.data);
      } else {
        throw new Error(res.data?.message || '获取失败');
      }
    } catch (error: any) {
      wx.hideLoading();
      console.error('获取手机号失败:', error);

      wx.showToast({
        title: error.message || '获取失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 清除数据
   */
  clearData() {
    wx.showModal({
      title: '确认清除',
      content: '是否清除所有登录数据？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          
          this.setData({
            loginResult: false,
            userInfo: null,
            accessToken: '',
            refreshToken: '',
            error: '',
            phoneNumber: '',
            memberLevelText: ''
          });

          wx.showToast({
            title: '已清除',
            icon: 'success'
          });

          console.log('数据已清除');
        }
      }
    });
  },

  /**
   * 查看完整Token
   */
  viewToken() {
    const token = wx.getStorageSync('accessToken');
    
    wx.showModal({
      title: 'Access Token',
      content: token || '未找到 Token',
      showCancel: false,
      confirmText: '复制',
      success: (res) => {
        if (res.confirm && token) {
          wx.setClipboardData({
            data: token,
            success: () => {
              wx.showToast({
                title: '已复制',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 跳转到商品列表
   */
  goToProducts() {
    wx.navigateTo({
      url: '/pages/product/list'
    });
  },

  /**
   * 跳转到购物车
   */
  goToCart() {
    wx.navigateTo({
      url: '/pages/cart/cart'
    });
  },

  /**
   * 跳转到订单列表
   */
  goToOrders() {
    wx.showToast({
      title: '订单列表开发中',
      icon: 'none'
    });
  },

  /**
   * 跳转到套系列表
   */
  goToPackages() {
    wx.showToast({
      title: '套系列表开发中',
      icon: 'none'
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: '乖宝宝儿童影楼商城',
      path: '/pages/test/test'
    };
  }
});
