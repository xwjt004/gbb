// 优惠券列表页 - 可领取的优惠券
interface CouponItem {
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
}

interface CouponListResponse {
  items: CouponItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

Page({
  data: {
    coupons: [] as CouponItem[],
    loading: false,
    page: 1,
    limit: 10,
    total: 0,
    hasMore: true,
    discountType: '' as '' | 'FIXED' | 'PERCENTAGE',
    filterOptions: [
      { label: '全部', value: '' },
      { label: '满减券', value: 'FIXED' },
      { label: '折扣券', value: 'PERCENTAGE' }
    ]
  },

  /**
   * 页面加载
   */
  onLoad() {
    console.log('优惠券列表页加载');
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
   * 加载优惠券列表
   */
  async loadCoupons(refresh: boolean = false) {
    if (this.data.loading) return;

    const page = refresh ? 1 : this.data.page;
    
    this.setData({ loading: true });

    try {
      const params: any = {
        page,
        limit: this.data.limit
      };

      if (this.data.discountType) {
        params.discountType = this.data.discountType;
      }

      const query = Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');

      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl || 'http://192.168.1.3:3000/api/v1'}/wx-coupon?${query}`,
          method: 'GET',
          header: {
            'Content-Type': 'application/json'
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.statusCode === 200) {
        const data: CouponListResponse = res.data;
        const newCoupons = refresh ? data.items : [...this.data.coupons, ...data.items];
        
        this.setData({
          coupons: newCoupons,
          total: data.total,
          page: data.page,
          hasMore: data.page < data.totalPages,
          loading: false
        });

        if (refresh) {
          wx.stopPullDownRefresh();
        }

        console.log('优惠券列表加载成功:', data);
      } else {
        throw new Error('加载失败');
      }
    } catch (error: any) {
      console.error('加载优惠券失败:', error);
      
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
   * 筛选类型改变
   */
  onFilterChange(e: any) {
    const discountType = e.detail.value;
    this.setData({ 
      discountType,
      page: 1,
      hasMore: true
    });
    this.loadCoupons(true);
  },

  /**
   * 领取优惠券
   */
  async claimCoupon(e: any) {
    const { code } = e.currentTarget.dataset;

    // 检查登录状态
    const token = wx.getStorageSync('accessToken');
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/coupon/list')
            });
          }
        }
      });
      return;
    }

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
          data: { code },
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

        // 刷新列表
        this.loadCoupons(true);

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
   * 查看详情
   */
  viewDetail(e: any) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/coupon/detail?id=${id}`
    });
  },

  /**
   * 跳转到我的优惠券
   */
  goToMyCoupons() {
    wx.navigateTo({
      url: '/pages/coupon/my'
    });
  },

  /**
   * 格式化折扣显示
   */
  formatDiscount(coupon: CouponItem): string {
    if (coupon.discountType === 'FIXED') {
      return `¥${coupon.discountValue}`;
    } else {
      return `${coupon.discountValue * 10}折`;
    }
  },

  /**
   * 格式化使用条件
   */
  formatCondition(coupon: CouponItem): string {
    if (coupon.minAmount) {
      return `满¥${coupon.minAmount}可用`;
    }
    return '无门槛';
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: '领取优惠券，拍照更优惠！',
      path: '/pages/coupon/list'
    };
  }
});
