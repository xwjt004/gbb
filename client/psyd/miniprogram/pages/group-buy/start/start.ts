import { request } from '../../../utils/request';

Page({
  data: {
    loading: false,
    packageId: null as number | null,
    packageInfo: null as any,
    productId: null as number | null,
    productInfo: null as any,
    selectedType: null as 'package' | 'product' | null,
    minCount: 3,
  },

  onLoad(options: any) {
    // 检查从缓存恢复的选中项
    this.restoreSelection();

    if (options.packageId) {
      this.setData({ packageId: parseInt(options.packageId) });
    }
    if (options.packageInfo) {
      try {
        const info = JSON.parse(decodeURIComponent(options.packageInfo));
        this.setData({
          packageInfo: info,
          packageId: info.id,
          selectedType: 'package',
          minCount: info.groupMinCount || 3,
        });
      } catch (e) {
        console.warn('解析套系信息失败', e);
      }
    }
  },

  onShow() {
    // 每次显示时检查是否有从列表页选中的内容
    this.restoreSelection();
  },

  restoreSelection() {
    const pendingPkg = wx.getStorageSync('pendingGroupBuyPackage');
    if (pendingPkg) {
      wx.removeStorageSync('pendingGroupBuyPackage');
      this.setData({
        packageId: pendingPkg.id,
        packageInfo: pendingPkg,
        productId: null,
        productInfo: null,
        selectedType: 'package',
        minCount: pendingPkg.groupMinCount || 3,
      });
      return;
    }
    const pendingProd = wx.getStorageSync('pendingGroupBuyProduct');
    if (pendingProd) {
      wx.removeStorageSync('pendingGroupBuyProduct');
      this.setData({
        productId: pendingProd.id,
        productInfo: pendingProd,
        packageId: null,
        packageInfo: null,
        selectedType: 'product',
        minCount: 2,
      });
    }
  },

  selectPackage() {
    wx.setStorageSync('groupBuySelectMode', 'groupBuy');
    wx.switchTab({ url: '/pages/packages/list/list' });
  },

  selectProduct() {
    wx.setStorageSync('groupBuySelectMode', 'groupBuy');
    wx.switchTab({ url: '/pages/product/list' });
  },

  clearSelection() {
    this.setData({
      packageId: null,
      packageInfo: null,
      productId: null,
      productInfo: null,
      selectedType: null,
      minCount: 3,
    });
  },

  onDecrease() {
    const val = Math.max(2, this.data.minCount - 1);
    this.setData({ minCount: val });
  },

  onIncrease() {
    const val = Math.min(10, this.data.minCount + 1);
    this.setData({ minCount: val });
  },

  async onStart() {
    if (this.data.loading) return;
    if (!this.data.selectedType) {
      wx.showToast({ title: '请选择要团购的套餐或商品', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const data: any = { minCount: this.data.minCount };
      if (this.data.selectedType === 'package') {
        data.packageId = this.data.packageId;
      } else {
        data.productId = this.data.productId;
      }

      const res: any = await request({
        url: '/group-buy/start',
        method: 'POST',
        data,
      });

      const activityId = res?.data?.id;
      if (activityId) {
        wx.redirectTo({
          url: `/pages/group-buy/detail/detail?id=${activityId}`,
        });
      } else {
        wx.showToast({ title: '开团失败', icon: 'none' });
      }
    } catch (err: any) {
      console.error('开团失败', err);
      wx.showToast({ title: err.message || '开团失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
