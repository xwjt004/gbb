// pages/coupon/select/select.ts - 优惠券选择页
interface SelectableCoupon {
  id: number;
  couponName?: string;
  name: string;
  description: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  minAmount: number | null;
  maxDiscount: number | null;
  endTime: string;
  expiredAt: string;
}

Page({
  data: {
    coupons: [] as SelectableCoupon[],
    loading: true,
    selectedId: -1 as number,   // -1 = 不使用优惠券
    selectedName: '',
    selectedAmount: 0,
    orderAmount: 0,
  },

  onLoad(options: any) {
    const orderAmount = parseFloat(options.amount) || 0;
    this.setData({ orderAmount });
    this.loadAvailableCoupons(orderAmount);
  },

  async loadAvailableCoupons(amount: number) {
    this.setData({ loading: true });

    try {
      const token = wx.getStorageSync('accessToken');
      if (!token) {
        this.setData({ loading: false });
        return;
      }

      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl || 'http://192.168.1.3:3000/api/v1'}/wx-coupon/my?page=1&limit=50&status=AVAILABLE`,
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
        const items = (res.data.items || [])
          .filter((item: any) => {
            // 过滤满足金额门槛的优惠券
            const minAmount = item.minAmount || 0;
            return amount >= minAmount;
          })
          .map((item: any) => ({
            ...item,
            name: item.name || item.coupon?.couponName || '',
            description: item.description || item.coupon?.description || '',
          }));

        this.setData({
          coupons: items,
          loading: false,
          selectedId: items.length > 0 ? -1 : -1,
        });
      } else {
        throw new Error('加载失败');
      }
    } catch (error) {
      console.error('加载可用优惠券失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  onSelect(e: any) {
    const { id, amount, name, type, min } = e.currentTarget.dataset;
    const parsedId = parseInt(id);

    this.setData({
      selectedId: parsedId,
      selectedName: parsedId === -1 ? '' : name || '',
      selectedAmount: parsedId === -1 ? 0 : (parseFloat(amount) || 0),
      selectedType: parsedId === -1 ? '' : type || '',
    });
  },

  onConfirm() {
    const { selectedId, selectedName, selectedAmount, selectedType } = this.data;

    // 获取上一页的页面对象
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];

    if (prevPage) {
      if (selectedId === -1) {
        // 不使用优惠券
        prevPage.setData({
          coupon: null,
          discountAmount: 0
        });
      } else {
        prevPage.setData({
          coupon: {
            id: selectedId,
            name: selectedName,
            amount: selectedAmount,
            discountType: selectedType,
          },
          discountAmount: selectedAmount
        });
      }
      // 重新计算总价
      if (prevPage.calculateTotal) {
        prevPage.calculateTotal();
      }
    }

    wx.navigateBack();
  },
});
