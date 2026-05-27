// 优惠券详情页
interface CouponDetail {
  id: number;
  code: string;
  name: string;
  description: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  minAmount: number | null;
  maxDiscount: number | null;
  startTime: string;
  endTime: string;
  totalCount: number;
  usedCount: number;
  status: string;
  isClaimed: boolean;
  isUsed: boolean;
  isExpired: boolean;
  isAvailable: boolean;
  createdAt: string;
  receivedAt?: string;
  usedAt?: string;
}

Page({
  data: {
    coupon: null as CouponDetail | null,
    loading: true,
    couponId: 0
  },

  /**
   * 页面加载
   */
  onLoad(options: any) {
    const couponId = parseInt(options.id);
    if (couponId) {
      this.setData({ couponId });
      this.loadCouponDetail();
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  /**
   * 加载优惠券详情
   */
  async loadCouponDetail() {
    this.setData({ loading: true });

    try {
      const token = wx.getStorageSync('accessToken');
      const headers: any = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl || 'http://192.168.1.3:3000/api/v1'}/wx-coupon/${this.data.couponId}`,
          method: 'GET',
          header: headers,
          success: resolve,
          fail: reject
        });
      });

      if (res.statusCode === 200) {
        this.setData({
          coupon: res.data,
          loading: false
        });
        console.log('优惠券详情加载成功:', res.data);
      } else {
        throw new Error('加载失败');
      }
    } catch (error: any) {
      console.error('加载优惠券详情失败:', error);
      
      this.setData({ loading: false });

      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none',
        duration: 2000
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  /**
   * 领取优惠券
   */
  async claimCoupon() {
    const token = wx.getStorageSync('accessToken');
    if (!token) {
      const couponId = this.data.coupon?.id || '';
      wx.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/coupon/detail?id=' + couponId)
            });
          }
        }
      });
      return;
    }

    const coupon = this.data.coupon;
    if (!coupon) return;

    wx.showLoading({ title: '领取中...' });

    try {
      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl || 'http://192.168.1.3:3000/api/v1'}/wx-coupon/claim`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data: { code: coupon.code },
          success: resolve,
          fail: reject
        });
      });

      wx.hideLoading();

      if (res.statusCode === 200 || res.statusCode === 201) {
        wx.showToast({
          title: '领取成功',
          icon: 'success',
          duration: 2000
        });

        // 刷新详情
        this.loadCouponDetail();

        console.log('优惠券领取成功:', res.data);
      } else {
        const message = res.data?.message || '领取失败';
        wx.showToast({
          title: message,
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error: any) {
      wx.hideLoading();
      console.error('领取优惠券失败:', error);

      wx.showToast({
        title: error.message || '领取失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 使用优惠券
   */
  useCoupon() {
    wx.showModal({
      title: '使用优惠券',
      content: '是否在下单时使用此优惠券？',
      confirmText: '去下单',
      success: (res) => {
        if (res.confirm) {
          // TODO: 跳转到下单页面并携带优惠券ID
          wx.navigateTo({
            url: `/pages/order/create?couponId=${this.data.couponId}`
          });
        }
      }
    });
  },

  /**
   * 复制优惠码
   */
  copyCouponCode() {
    const coupon = this.data.coupon;
    if (!coupon) return;

    wx.setClipboardData({
      data: coupon.code,
      success: () => {
        wx.showToast({
          title: '优惠码已复制',
          icon: 'success',
          duration: 2000
        });
      }
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const coupon = this.data.coupon;
    return {
      title: coupon ? `领取${coupon.name}，拍照更优惠！` : '领取优惠券',
      path: `/pages/coupon/detail?id=${this.data.couponId}`
    };
  }
});
