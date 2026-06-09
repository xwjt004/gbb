// pages/profile/profile.ts

import { getImageUrl } from '../../utils/image';

interface UserInfo {
  avatar?: string;
  nickname?: string;
  phone?: string;
  isVip?: boolean;
}

interface OrderCount {
  unpaid: number;
  shooting: number;
  pickup: number;
  refund: number;
}

interface AssetCount {
  coupon: number;
  points: number;
}

Page({
  data: {
    userInfo: {} as UserInfo,
    orderCount: {
      unpaid: 0,
      shooting: 0,
      pickup: 0,
      refund: 0
    } as OrderCount,
    assetCount: {
      coupon: 0,
      points: 0
    } as AssetCount
  },

  onLoad() {
    console.log('[ProfilePage] 页面加载');
    this.loadUserInfo();
    this.loadOrderCount();
    // 第二阶段开放：加载积分/优惠券数据
    // this.loadAssetCount();
  },

  onShow() {
    // 每次显示页面时刷新数据（从登录页返回时会触发）
    this.loadUserInfo();
    this.loadOrderCount();
    // 第二阶段开放：加载积分/优惠券数据
    // this.loadAssetCount();
  },

  /**
   * 加载用户信息
   */
  async loadUserInfo() {
    try {
      const token = wx.getStorageSync('accessToken');
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

      // 从本地存储获取用户信息
      const userInfo = wx.getStorageSync('userInfo');
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
        console.log('[ProfilePage] 设置后的用户信息:', this.data.userInfo);
      } else {
        console.warn('[ProfilePage] 本地存储中没有用户信息');
      }
    } catch (error) {
      console.error('[ProfilePage] 加载用户信息失败', error);
    }
  },

  /**
   * 加载订单数量统计
   */
  async loadOrderCount() {
    try {
      const token = wx.getStorageSync('wx_token');
      if (!token) return;

      // TODO: 调用后端API获取订单统计
      // 临时使用模拟数据
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

  /**
   * 加载资产统计
   */
  async loadAssetCount() {
    try {
      const token = wx.getStorageSync('wx_token');
      if (!token) return;

      // TODO: 调用后端API获取资产统计
      // 临时使用模拟数据
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

  /**
   * 点击头像/用户名区域 - 跳转登录或个人信息
   */
  onUserCardTap() {
    const token = wx.getStorageSync('accessToken');
    if (!token) {
      // 未登录，跳转到登录页
      wx.navigateTo({
        url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/profile/profile')
      });
    } else {
      // 已登录，跳转到个人信息编辑页
      wx.navigateTo({
        url: '/pages/profile/edit/edit'
      });
    }
  },

  /**
   * 跳转到订单列表
   */
  goToOrderList(e: any) {
    const status = e.currentTarget.dataset.status;
    const url = status 
      ? `/pages/order/list/list?status=${status}`
      : '/pages/order/list/list';
    
    wx.navigateTo({ url });
  },

  /**
   * 跳转到优惠券页面
   */
  goToCoupon() {
    wx.navigateTo({
      url: '/pages/coupon/my'
    });
  },

  /**
   * 跳转到会员中心
   */
  goToVip() {
    wx.navigateTo({
      url: '/pages/member/member'
    });
  },

  /**
   * 跳转到积分中心
   */
  goToPoints() {
    wx.navigateTo({
      url: '/pages/member/points/points'
    });
  },

  /**
   * 跳转到收藏列表
   */
  goToFavorite() {
    wx.navigateTo({
      url: '/pages/favorite/list/list'
    });
  },

  /**
   * 跳转到地址管理
   */
  goToAddress() {
    wx.navigateTo({
      url: '/pages/address/list/list'
    });
  },

  /**
   * 跳转到预约记录
   */
  goToAppointment() {
    // 预约记录就是订单列表
    wx.navigateTo({
      url: '/pages/order/list/list'
    });
  },

  /**
   * 联系客服
   */
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '请拨打客服电话：0416-5577456',
      showCancel: true,
      confirmText: '拨打',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '0416-5577456'
          });
        }
      }
    });
  },

  /**
   * 跳转到设置
   */
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  /**
   * 跳转到关于我们
   */
  goToAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  }
});
