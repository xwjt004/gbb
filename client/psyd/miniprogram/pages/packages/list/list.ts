// 套系列表页
import { request } from '../../../utils/request';
import config from '../../../config/index';

// 获取完整图片URL
function getFullImageUrl(path: string): string {
  if (!path) return '/images/placeholder.png';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // 后端返回的路径格式: "/api/v1/files/xxx.jpg"
  // BASE_URL: "https://2691df54.r37.cpolar.top/api/v1"
  // 需要拼接成: "https://2691df54.r37.cpolar.top/api/v1/files/xxx.jpg"
  
  // 提取域名部分(不含/api/v1)
  const baseUrl = config.BASE_URL.replace('/api/v1', '');
  // 确保path以/开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

interface PackageCategory {
  id: number;
  name: string;
  icon?: string;
  color?: string;
}

interface Package {
  id: number;
  name: string;
  description: string;
  price: string;
  depositAmount: string;
  images: string[];
  coverImage?: string;
  status: string;
  isPopular?: boolean;
  isOnSale: boolean;
  categoryId?: number;
  packageCategory?: PackageCategory;
}

interface PackageListResponse {
  packages: Package[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

Page({
  data: {
    packages: [] as Package[],
    loading: false,
    refreshing: false,
    page: 1,
    limit: 10,
    total: 0,
    hasMore: true,

    // 团购活动列表
    groupBuyList: [] as any[],
    groupBuyPage: 1,
    groupBuyHasMore: true,
    groupBuyTotal: 0,

    // 分类筛选
    activeCategory: 0, // 0表示全部
    categories: [] as PackageCategory[],
    categoriesLoading: false,

    // 筛选条件
    showPopular: false, // 是否只显示热门
    showGroupBuy: false, // 是否只显示团购
    selectMode: '', // 选择模式: '' 或 'groupBuy'
  },

  onLoad(options: any) {
    if (options.selectMode === 'groupBuy') {
      this.setData({ selectMode: 'groupBuy' });
    }
    this.loadCategories();
    this.loadPackages();
  },

  /**
   * 加载分类列表
   */
  async loadCategories() {
    try {
      this.setData({ categoriesLoading: true });
      
      const res = await request<any>({
        url: '/wx-mall/categories',
        method: 'GET'
      });

      if (res && res.data) {
        const categories = res.data || [];
        this.setData({
          categories: categories.filter((cat: any) => cat.status === 'ACTIVE')
        });
      } else if (Array.isArray(res)) {
        this.setData({
          categories: res.filter((cat: any) => cat.status === 'ACTIVE')
        });
      }
    } catch (error) {
      console.error('加载分类失败:', error);
      wx.showToast({
        title: '加载分类失败',
        icon: 'none'
      });
    } finally {
      this.setData({ categoriesLoading: false });
    }
  },

  /**
   * 加载套系列表
   */
  async loadPackages(reset: boolean = false) {
    if (this.data.loading) return;
    if (this.data.showGroupBuy) return;
    if (!reset && !this.data.hasMore) return;

    try {
      const page = reset ? 1 : this.data.page;
      this.setData({ loading: true });

      const params: any = {
        page,
        limit: this.data.limit,
        status: 'ACTIVE'
      };

      // 分类筛选
      if (this.data.activeCategory > 0) {
        params.categoryId = this.data.activeCategory;
      }

      // 热门筛选
      if (this.data.showPopular) {
        params.isPopular = true;
      }

      const res = await request<PackageListResponse>({
        url: '/wx-mall/packages',
        method: 'GET',
        data: params
      });

      console.log('📦 套系列表API响应:', res);
      
      // request.ts 已经返回了 response.data，所以 res 就是 {packages, pagination}
      const rawPackages = res.packages || [];
      
      // 处理图片URL，转换为完整路径
      const newPackages = rawPackages.map(pkg => ({
        ...pkg,
        coverImage: pkg.images && pkg.images.length > 0 
          ? getFullImageUrl(pkg.images[0]) 
          : '/images/placeholder.png'
      }));
      
      const pagination = res.pagination;
      
      console.log('📦 packages数量:', newPackages.length);
      console.log('📦 第一个套系图片URL:', newPackages[0]?.coverImage);
      console.log('📦 pagination:', pagination);

      this.setData({
        packages: reset ? newPackages : [...this.data.packages, ...newPackages],
        page: pagination.page,
        total: pagination.total,
        hasMore: pagination.page < pagination.totalPages
      });
      
      console.log('✅ setData完成, 当前packages总数:', this.data.packages.length);
    } catch (error) {
      console.error('加载套系列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ 
        loading: false,
        refreshing: false
      });
    }
  },

  /**
   * 加载团购活动列表
   */
  async loadGroupBuyActivities(reset: boolean = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.groupBuyHasMore) return;

    try {
      const page = reset ? 1 : this.data.groupBuyPage;
      this.setData({ loading: true });

      const res = await request<any>({
        url: '/group-buy/active/list',
        method: 'GET',
        data: { page, limit: this.data.limit }
      });

      // getActiveList 返回 { data: { items, pagination } }
      const body = res.data || res;
      const items = (body.items || []).map((item: any) => {
        const now = Date.now();
        const expiredAt = new Date(item.expiredAt).getTime();
        const remaining = Math.max(0, expiredAt - now);
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);

        return {
          ...item,
          remainingTime: hours > 0 ? `${hours}小时${minutes}分` : `${minutes}分`,
          progress: item._count?.participants || 0,
          progressPercent: Math.min(100, ((item._count?.participants || 0) / (item.minCount || 2)) * 100),
          targetName: item.package?.name || item.product?.name || '未知套餐',
          coverImage: item.package?.images?.[0]
            ? getFullImageUrl(item.package.images[0])
            : item.product?.images?.[0]
              ? getFullImageUrl(item.product.images[0])
              : '/images/placeholder.png',
          price: item.package?.price || item.product?.salePrice || '0',
        };
      });
      const pagination = body.pagination || { page, limit: this.data.limit, total: 0 };

      this.setData({
        groupBuyList: reset ? items : [...this.data.groupBuyList, ...items],
        groupBuyPage: pagination.page,
        groupBuyHasMore: pagination.page * pagination.limit < pagination.total,
        groupBuyTotal: pagination.total || items.length,
      });
    } catch (error) {
      console.error('加载团购列表失败:', error);
      wx.showToast({ title: '加载团购失败', icon: 'none' });
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  /**
   * 分类切换
   */
  onCategoryChange(e: any) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      activeCategory: categoryId,
      packages: [],
      page: 1,
      hasMore: true
    });
    this.loadPackages(true);
  },

  /**
   * 热门筛选切换
   */
  onPopularToggle() {
    this.setData({
      showPopular: !this.data.showPopular,
      showGroupBuy: false,
      activeCategory: 0,
      packages: [],
      page: 1,
      hasMore: true
    });
    this.loadPackages(true);
  },

  /**
   * 团购筛选切换
   */
  onGroupBuyToggle() {
    const newVal = !this.data.showGroupBuy;
    this.setData({
      showGroupBuy: newVal,
      showPopular: false,
      activeCategory: 0,
      packages: [],
      groupBuyList: [],
      groupBuyPage: 1,
      groupBuyHasMore: true,
      page: 1,
      hasMore: true
    });
    if (newVal) {
      this.loadGroupBuyActivities(true);
    } else {
      this.loadPackages(true);
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    if (this.data.showGroupBuy) {
      this.setData({
        refreshing: true,
        groupBuyList: [],
        groupBuyPage: 1,
        groupBuyHasMore: true
      });
      this.loadGroupBuyActivities(true).then(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      this.setData({
        refreshing: true,
        packages: [],
        page: 1,
        hasMore: true
      });
      this.loadPackages(true).then(() => {
        wx.stopPullDownRefresh();
      });
    }
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.loading) return;
    if (this.data.showGroupBuy) {
      if (this.data.groupBuyHasMore) {
        this.setData({ groupBuyPage: this.data.groupBuyPage + 1 });
        this.loadGroupBuyActivities();
      }
    } else {
      if (this.data.hasMore) {
        this.setData({ page: this.data.page + 1 });
        this.loadPackages();
      }
    }
  },

  /**
   * 跳转到套系详情
   */
  goToDetail(e: any) {
    const id = Number(e.currentTarget.dataset.id);

    // 选择模式: 选中后返回上级页面
    if (this.data.selectMode === 'groupBuy') {
      const pkg = this.data.packages.find((p: any) => p.id === id);
      if (pkg) {
        wx.setStorageSync('pendingGroupBuyPackage', {
          id: pkg.id,
          name: pkg.name,
          price: pkg.price,
          groupPrice: pkg.groupPrice,
          coverImage: pkg.coverImage,
          images: pkg.images,
          groupMinCount: pkg.groupMinCount || 3,
        });
      }
      wx.navigateBack();
      return;
    }

    wx.navigateTo({
      url: `/pages/packages/detail/detail?id=${id}`
    });
  },

  /**
   * 取消选择模式
   */
  cancelSelect() {
    this.setData({ selectMode: '' });
    wx.navigateBack();
  },

  /**
   * 跳转到发起组团
   */
  goToGroupBuyStart() {
    wx.navigateTo({
      url: '/pages/group-buy/start/start'
    });
  },

  /**
   * 跳转到团购详情
   */
  goToGroupBuyDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/group-buy/detail/detail?id=${id}`
    });
  },

  /**
   * 格式化价格
   */
  formatPrice(price: number): string {
    return `¥${price.toFixed(2)}`;
  },

  /**
   * 获取缩略图
   */
  getThumbnail(images: string[]): string {
    return images && images.length > 0 ? images[0] : '/images/placeholder.png';
  }
});
