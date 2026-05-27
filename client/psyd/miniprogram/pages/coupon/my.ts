// 我的优惠券页面
interface MyCouponItem {
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
  status: 'AVAILABLE' | 'USED' | 'EXPIRED';
  receivedAt: string;
  usedAt: string | null;
  expiredAt: string;
  coupon: {
    couponName: string;
    description: string;
  };
}

interface MyCouponResponse {
  items: MyCouponItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

Page({
  data: {
    coupons: [] as MyCouponItem[],
    loading: false,
    page: 1,
    limit: 10,
    total: 0,
    hasMore: true,
    activeTab: 'AVAILABLE' as 'AVAILABLE' | 'USED' | 'EXPIRED',
    tabs: [
      { label: '未使用', value: 'AVAILABLE', count: 0 },
      { label: '已使用', value: 'USED', count: 0 },
      { label: '已过期', value: 'EXPIRED', count: 0 }
    ],
    statusCounts: {
      AVAILABLE: 0,
      USED: 0,
      EXPIRED: 0
    }
  },

  /**
   * 页面加载
   */
  onLoad() {
    console.log('我的优惠券页面加载');
    this.checkLogin();
  },

  /**
   * 页面显示
   */
  onShow() {
    // 从列表页返回时刷新数据
    const token = wx.getStorageSync('accessToken');
    if (token) {
      this.loadCoupons(true);
    }
  },

  /**
   * 检查登录状态
   */
  checkLogin() {
    const token = wx.getStorageSync('accessToken');
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({
              url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/coupon/my')
            });
          } else {
            wx.navigateBack();
          }
        }
      });
      return;
    }

    this.loadCoupons(true);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    this.loadCoupons(true);
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadCoupons(false);
    }
  },

  /**
   * 加载我的优惠券
   */
  async loadCoupons(refresh: boolean = false) {
    if (this.data.loading) return;

    const token = wx.getStorageSync('accessToken');
    if (!token) {
      return;
    }

    const page = refresh ? 1 : this.data.page;
    
    this.setData({ loading: true });

    try {
      const params: any = {
        page,
        limit: this.data.limit,
        status: this.data.activeTab
      };

      const query = Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');

      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl || 'http://192.168.1.3:3000/api/v1'}/wx-coupon/my?${query}`,
          method: 'GET',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.statusCode === 200) {
        const data: MyCouponResponse = res.data;
        const newCoupons = refresh ? data.items : [...this.data.coupons, ...data.items];
        
        this.setData({
          coupons: newCoupons,
          total: data.total,
          page: data.page,
          hasMore: data.page < data.totalPages,
          loading: false
        });

        // 更新统计数据
        this.updateStatusCounts();

        if (refresh) {
          wx.stopPullDownRefresh();
        }

        console.log('我的优惠券加载成功:', data);
      } else {
        throw new Error('加载失败');
      }
    } catch (error: any) {
      console.error('加载我的优惠券失败:', error);
      
      this.setData({ loading: false });

      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none',
        duration: 2000
      });

      if (refresh) {
        wx.stopPullDownRefresh();
      }
    }
  },

  /**
   * 更新状态统计
   */
  async updateStatusCounts() {
    const token = wx.getStorageSync('accessToken');
    if (!token) return;

    try {
      const statuses = ['AVAILABLE', 'USED', 'EXPIRED'];
      const counts: any = {};

      for (const status of statuses) {
        const res: any = await new Promise((resolve, reject) => {
          wx.request({
            url: `${getApp().globalData.apiBaseUrl || 'http://192.168.1.3:3000/api/v1'}/wx-coupon/my?page=1&limit=1&status=${status}`,
            method: 'GET',
            header: {
              'Authorization': `Bearer ${token}`
            },
            success: resolve,
            fail: reject
          });
        });

        if (res.statusCode === 200) {
          counts[status] = res.data.total;
        }
      }

      this.setData({
        statusCounts: counts,
        tabs: this.data.tabs.map(tab => ({
          ...tab,
          count: counts[tab.value] || 0
        }))
      });
    } catch (error) {
      console.error('更新统计失败:', error);
    }
  },

  /**
   * 切换Tab
   */
  onTabChange(e: any) {
    const activeTab = e.currentTarget.dataset.tab;
    if (activeTab === this.data.activeTab) return;

    this.setData({
      activeTab,
      page: 1,
      hasMore: true
    });
    this.loadCoupons(true);
  },

  /**
   * 查看详情
   */
  viewDetail(e: any) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/coupon/detail?id=${id}`
    });
  },

  /**
   * 使用优惠券
   */
  useCoupon(e: any) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '使用优惠券',
      content: '是否在下单时使用此优惠券？',
      confirmText: '去下单',
      success: (res) => {
        if (res.confirm) {
          // TODO: 跳转到下单页面并携带优惠券ID
          wx.navigateTo({
            url: `/pages/order/create?couponId=${id}`
          });
        }
      }
    });
  },

  /**
   * 跳转到领券中心
   */
  goToList() {
    wx.navigateTo({
      url: '/pages/coupon/list'
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: '我的优惠券',
      path: '/pages/coupon/list'
    };
  }
});
