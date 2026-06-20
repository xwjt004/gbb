import { getImageUrl } from '../../utils/image';

Page({
  data: {
    userInfo: {},
    orderCount: {
      unpaid: 0,
      shooting: 0,
      pickup: 0,
      refund: 0
    },
    assetCount: {
      coupon: 0,
      points: 0
    }
  },

  onLoad() {
    console.log('[ProfilePage] 页面加载');
    this.loadUserInfo();
    this.loadOrderCount();
  },

  onShow() {
    this.loadUserInfo();
    this.loadOrderCount();
  },

  async loadUserInfo() {
    try {
      var token = wx.getStorageSync('accessToken');
      if (!token) {
        console.log('[ProfilePage] 未登录');
        this.setData({
          userInfo: {
            nickname: '点击登录',
            phone: '未绑定手机号'
          }
        });
        return;
      }

      var userInfo = wx.getStorageSync('userInfo');
      console.log('[ProfilePage] 读取用户信息:', userInfo);

      if (userInfo) {
        this.setData({
          userInfo: {
            avatar: getImageUrl(userInfo.avatar) || getImageUrl(userInfo.avatarUrl) || '',
            nickname: userInfo.nickname || userInfo.nickName || '微信用户',
            phone: userInfo.phone || userInfo.mobile || '未绑定手机号',
            isVip: userInfo.memberLevel && userInfo.memberLevel !== 'ORDINARY'
          }
        });
      } else {
        console.warn('[ProfilePage] 本地存储中没有用户信息');
      }
    } catch (error) {
      console.error('[ProfilePage] 加载用户信息失败', error);
    }
  },

  async loadOrderCount() {
    try {
      var token = wx.getStorageSync('wx_token');
      if (!token) return;

      this.setData({
        orderCount: {
          unpaid: 2,
          shooting: 1,
          pickup: 0,
          refund: 0
        }
      });
    } catch (error) {
      console.error('[ProfilePage] 加载订单统计失败', error);
    }
  },

  async loadAssetCount() {
    try {
      var token = wx.getStorageSync('wx_token');
      if (!token) return;

      this.setData({
        assetCount: {
          coupon: 5,
          points: 1200
        }
      });
    } catch (error) {
      console.error('[ProfilePage] 加载资产统计失败', error);
    }
  },

  onUserCardTap() {
    var token = wx.getStorageSync('accessToken');
    if (!token) {
      wx.navigateTo({
        url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/profile/profile')
      });
    } else {
      wx.navigateTo({
        url: '/pages/profile/edit/edit'
      });
    }
  },

  goToOrderList(e) {
    var status = e.currentTarget.dataset.status;
    var url = status
      ? '/pages/order/list/list?status=' + status
      : '/pages/order/list/list';

    wx.navigateTo({ url: url });
  },

  goToCoupon() {
    wx.navigateTo({
      url: '/pages/coupon/my'
    });
  },

  goToVip() {
    wx.navigateTo({
      url: '/pages/member/member'
    });
  },

  goToPoints() {
    var token = wx.getStorageSync('accessToken');
    if (!token) {
      wx.navigateTo({ url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/profile/profile') });
      return;
    }
    wx.navigateTo({ url: '/pages/member/points/points' });
  },

  goToStoreNav() {
    wx.openLocation({
      latitude: 41.692690,
      longitude: 122.122332,
      name: '乖宝宝儿童摄影',
      address: '辽宁省锦州市黑山县启发路与东内环路交叉路口往西约150米(大红嘉园东侧)',
      scale: 18,
    });
  },

  goToGroupBuy() {
    wx.navigateTo({
      url: '/pages/group-buy/list/list'
    });
  },

  goToFavorite() {
    wx.navigateTo({
      url: '/pages/favorite/list/list'
    });
  },

  goToAddress() {
    wx.navigateTo({
      url: '/pages/address/list/list'
    });
  },

  goToAppointment() {
    wx.navigateTo({
      url: '/pages/order/list/list'
    });
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '请拨打客服电话：0416-5577456',
      showCancel: true,
      confirmText: '拨打',
      cancelText: '取消',
      success: function(res) {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '0416-5577456'
          });
        }
      }
    });
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  goToAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  goToMilestones() {
    var token = wx.getStorageSync('accessToken');
    if (!token) {
      wx.navigateTo({ url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/profile/profile') });
      return;
    }
    wx.navigateTo({
      url: '/pages/profile/edit/edit'
    });
  },

  goToSamples() {
    wx.navigateTo({
      url: '/pages/album/album?type=SAMPLE'
    });
  },

  goToAlbum() {
    var token = wx.getStorageSync('accessToken');
    if (!token) {
      wx.navigateTo({ url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/profile/profile') });
      return;
    }
    wx.navigateTo({
      url: '/pages/album/album?type=ALBUM'
    });
  }
});
