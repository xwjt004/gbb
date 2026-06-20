// 商品列表页面
import { request } from '../../utils/request';
import { formatPrice } from '../../utils/format';
import { getImageUrls, getThumbnailUrl } from '../../utils/image';

interface Product {
  id: number;
  productNo: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  images: string[];
  thumbnail: string;
  status: string;
  salesCount: number;
}

interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

Page({
  data: {
    products: [] as Product[],
    loading: false,
    page: 1,
    limit: 10,
    total: 0,
    hasMore: true,
    
    // 筛选条件
    activeCategory: '',
    categories: [] as Array<{ label: string; value: string; icon?: string | null; description?: string | null }>,
    categoriesLoading: false,
    
    // 排序（使用数据库字段名，保持前后端一致）
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    sortOptions: [
      { label: '最新上架', value: 'createdAt', order: 'desc' },
      { label: '价格升序', value: 'salePrice', order: 'asc' },      // 使用 salePrice
      { label: '价格降序', value: 'salePrice', order: 'desc' },     // 使用 salePrice
      { label: '销量最高', value: 'salesVolume', order: 'desc' }    // 使用 salesVolume
    ],
    showSortMenu: false,
    
    // 搜索
    searchKeyword: '',

    // 选择模式
    selectMode: '',
  },

  /**
   * 页面加载
   */
  onLoad(options: any) {
    console.log('商品列表页加载', options);

    // 选择模式
    if (options.selectMode === 'groupBuy') {
      this.setData({ selectMode: 'groupBuy' });
    }

    // 从路由参数获取分类
    if (options.category) {
      this.setData({ activeCategory: options.category });
    }

    // 加载商品分类
    this.loadCategories();

    // 加载商品列表
    this.loadProducts(true);
  },

  /**
   * 页面显示 - 每次显示时刷新数据
   */
  onShow() {
    console.log('商品列表页显示 - 刷新数据');
    // 重新加载分类列表，确保分类是最新的
    this.loadCategories();
    // 重新加载商品列表，确保库存等信息是最新的
    this.loadProducts(true);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    // 刷新分类和商品列表
    this.loadCategories();
    this.loadProducts(true);
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadProducts(false);
    }
  },

  /**
   * 加载商品分类（从后端API动态获取）
   */
  async loadCategories() {
    if (this.data.categoriesLoading) return;

    this.setData({ categoriesLoading: true });

    try {
      const res = await request<any>({
        url: '/wx-mall/product-categories',
        method: 'GET',
        needAuth: false
      });

      // 处理 { code, message, data } 格式的响应
      const categoryList = res.data || res || [];
      const formattedCategories = categoryList.map((cat: any) => ({
        label: cat.name,
        value: cat.code || cat.name,
        icon: cat.icon,
        description: cat.description,
      }));

      this.setData({
        categories: formattedCategories,
        categoriesLoading: false
      });
    } catch (error: any) {
      console.error('加载商品分类失败:', error);
      
      this.setData({ categoriesLoading: false });

      // 加载失败时使用默认分类
      this.setData({
        categories: [
          { label: '全部', value: '' }
        ]
      });

      wx.showToast({
        title: '分类加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 加载商品列表
   */
  async loadProducts(refresh: boolean = false) {
    if (this.data.loading) return;

    const page = refresh ? 1 : this.data.page;
    
    this.setData({ loading: true });

    try {
      const params: any = {
        page,
        limit: this.data.limit,
        sortBy: this.data.sortBy,
        sortOrder: this.data.sortOrder
      };

      // 添加分类筛选
      if (this.data.activeCategory) {
        params.category = this.data.activeCategory;
      }

      // 添加搜索关键词
      if (this.data.searchKeyword) {
        params.search = this.data.searchKeyword;
      }

      console.log('📤 请求参数:', params);

      const data = await request<ProductListResponse>({
        url: '/wx-mall/products',
        method: 'GET',
        data: params,
        needAuth: false
      });

      // 转换图片 URL
      const itemsWithFullUrls = data.items.map(item => ({
        ...item,
        thumbnail: getThumbnailUrl(item.thumbnail, item.images),
        images: getImageUrls(item.images)
      }));

      // 调试: 打印第一个商品的图片URL
      if (itemsWithFullUrls.length > 0) {
        console.log('📸 第一个商品的图片信息:', {
          name: itemsWithFullUrls[0].name,
          originalThumbnail: data.items[0].thumbnail,
          convertedThumbnail: itemsWithFullUrls[0].thumbnail,
          originalImages: data.items[0].images,
          convertedImages: itemsWithFullUrls[0].images
        });
      }

      const newProducts = refresh ? itemsWithFullUrls : [...this.data.products, ...itemsWithFullUrls];
      
      this.setData({
        products: newProducts,
        total: data.total,
        page: data.page,
        hasMore: data.page < data.totalPages,
        loading: false
      });

      console.log('商品列表加载成功:', data);

      if (refresh) {
        wx.stopPullDownRefresh();
      }
    } catch (error: any) {
      console.error('加载商品列表失败:', error);
      
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
   * 切换分类
   */
  onCategoryChange(e: any) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.activeCategory) return;

    this.setData({
      activeCategory: category,
      page: 1,
      hasMore: true
    });
    this.loadProducts(true);
  },

  /**
   * 显示排序菜单
   */
  showSortMenu() {
    this.setData({ showSortMenu: true });
  },

  /**
   * 隐藏排序菜单
   */
  hideSortMenu() {
    this.setData({ showSortMenu: false });
  },

  /**
   * 选择排序方式
   */
  onSortChange(e: any) {
    const { sortby, order } = e.currentTarget.dataset;
    
    this.setData({
      sortBy: sortby,
      sortOrder: order,
      showSortMenu: false,
      page: 1,
      hasMore: true
    });
    
    this.loadProducts(true);
  },

  /**
   * 搜索输入
   */
  onSearchInput(e: any) {
    this.setData({ searchKeyword: e.detail.value });
  },

  /**
   * 执行搜索
   */
  onSearch() {
    this.setData({ page: 1, hasMore: true });
    this.loadProducts(true);
  },

  /**
   * 清空搜索
   */
  onSearchClear() {
    this.setData({ 
      searchKeyword: '',
      page: 1,
      hasMore: true
    });
    this.loadProducts(true);
  },

  /**
   * 查看商品详情
   */
  viewDetail(e: any) {
    const { id } = e.currentTarget.dataset;

    // 选择模式: 选中后返回上级页面
    if (this.data.selectMode === 'groupBuy') {
      const prod = this.data.products.find((p: any) => p.id === id);
      if (prod) {
        wx.setStorageSync('pendingGroupBuyProduct', {
          id: prod.id,
          name: prod.name,
          price: prod.price,
          groupPrice: prod.groupPrice,
          coverImage: prod.thumbnail || (prod.images?.[0]) || '',
          images: prod.images,
        });
      }
      wx.navigateBack();
      return;
    }

    wx.navigateTo({
      url: `/pages/product/detail?id=${id}`
    });
  },

  /**
   * 加入购物车
   */
  async addToCart(e: any) {
    const { id, name } = e.currentTarget.dataset;
    
    // 阻止事件冒泡，避免触发查看详情
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    try {
      await request({
        url: '/wx-cart/add',
        method: 'POST',
        data: {
          itemType: 'PRODUCT',
          productId: id,
          quantity: 1
        },
        needAuth: true
      });

      wx.showToast({
        title: '已加入购物车',
        icon: 'success',
        duration: 1500
      });

      console.log(`商品 ${name} 已加入购物车`);
    } catch (error: any) {
      console.error('加入购物车失败:', error);
      
      if (error.message.includes('登录')) {
        wx.showModal({
          title: '提示',
          content: '请先登录',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/product/list')
              });
            }
          }
        });
      } else {
        wx.showToast({
          title: error.message || '加入失败',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  /**
   * 取消选择模式
   */
  cancelSelect() {
    this.setData({ selectMode: '' });
    wx.navigateBack();
  },

  /**
   * 格式化价格
   */
  formatPrice(price: number): string {
    return formatPrice(price);
  },

  /**
   * 图片加载成功
   */
  onImageLoad(e: any) {
    console.log('✅ 图片加载成功');
  },

  /**
   * 图片加载失败
   */
  onImageError(e: any) {
    console.error('❌ 图片加载失败:', e.detail);
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: '选购商品 - 靓宝宝儿童摄影',
      path: '/pages/product/list'
    };
  }
});
