// 首页 - 商城首页
import { get } from '../../utils/request';
import { formatPrice } from '../../utils/format';

interface HomeData {
  banners: any[];
  hotPackages: any[];
  recommendProducts: any[];
  stats: {
    totalOrders: number;
    totalPackages: number;
    totalProducts: number;
  };
}

Page({
  data: {
    loading: true,
    homeData: null as HomeData | null,
    banners: [] as any[],
    hotPackages: [] as any[],
    recommendProducts: [] as any[],
    categories: [
      { id: 'package', name: '套系', icon: '📦' },
      { id: 'product', name: '商品', icon: '🎁' },
      { id: 'diy', name: 'DIY', icon: '🎨' },
      { id: 'order', name: '订单', icon: '📋' }
    ]
  },

  onLoad() {
    this.loadHomeData();
  },

  /**
   * 加载首页数据
   */
  async loadHomeData() {
    this.setData({ loading: true });

    try {
      const homeData = await get<HomeData>('/wx-mall/home', {}, { 
        needAuth: false,
        showLoading: true 
      });

      console.log('首页数据:', homeData);

      this.setData({
        homeData,
        banners: homeData.banners || [],
        hotPackages: homeData.hotPackages || [],
        recommendProducts: homeData.recommendProducts || [],
        loading: false
      });
    } catch (error) {
      console.error('加载首页数据失败:', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadHomeData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 跳转到套系列表
   */
  goToPackage() {
    wx.navigateTo({
      url: '/pages/packages/list/list'
    });
  },

  /**
   * 跳转到DIY套系列表
   */
  goToDiyPackage() {
    wx.showToast({
      title: 'DIY套系开发中',
      icon: 'none'
    });
    // TODO: 创建DIY套系页面后启用
    // wx.navigateTo({
    //   url: '/pages/diy-package/list'
    // });
  },

  /**
   * 跳转到商品列表
   */
  goToProduct() {
    wx.navigateTo({
      url: '/pages/product/list'
    });
  },

  /**
   * 跳转到服务列表
   */
  goToService() {
    wx.showToast({
      title: '服务列表开发中',
      icon: 'none'
    });
    // TODO: 创建服务列表页面后启用
    // wx.navigateTo({
    //   url: '/pages/service/list'
    // });
  },

  /**
   * 查看套系详情
   */
  viewPackageDetail(e: any) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/packages/detail/detail?id=${id}`
    });
  },

  /**
   * 查看商品详情
   */
  viewProductDetail(e: any) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/product/detail?id=${id}`
    });
  },

  /**
   * 查看更多套系
   */
  viewMorePackages() {
    wx.navigateTo({
      url: '/pages/packages/list/list'
    });
  },

  /**
   * 查看更多商品
   */
  viewMoreProducts() {
    wx.navigateTo({
      url: '/pages/product/list'
    });
  },

  /**
   * 格式化价格
   */
  formatPrice(price: number): string {
    return formatPrice(price);
  }
});
