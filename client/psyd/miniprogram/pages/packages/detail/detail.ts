// 套系详情页
import { request } from '../../../utils/request';
import config from '../../../config/index';

// 获取完整图片URL
function getFullImageUrl(path: string): string {
  if (!path) return '/images/placeholder.png';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = config.BASE_URL.replace('/api/v1', '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

interface PackageCategory {
  id: number;
  name: string;
  icon?: string;
  color?: string;
}

interface PackageProductItem {
  id: number;
  quantity: number;
  isOptional: boolean;
  product: {
    id: number;
    name: string;
    description?: string;
    salePrice: number;
    images?: any;
    specification?: string;
    unit: string;
  };
}

interface PackageServiceItem {
  id: number;
  quantity: number;
  service: {
    id: number;
    name: string;
    description?: string;
    basePrice: number;
    images?: any;
    duration?: number;
  };
}

interface PackageDetail {
  id: number;
  name: string;
  description: string;
  price: string;
  deposit: string;
  duration_minutes: number;
  images: string[];
  status: string;
  isPopular?: boolean;
  salesVolume: number;
  category: string;
  categoryId?: number;
  packageCategory?: PackageCategory;
  tags: string[];
  includes: string[];
  packageProducts?: PackageProductItem[];
  packageServices?: PackageServiceItem[];
}

Page({
  data: {
    packageId: 0,
    package: null as PackageDetail | null,
    loading: true,

    // 轮播图
    currentImageIndex: 0,

    // 收藏状态
    isFavorited: false,
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({ packageId: parseInt(options.id) });
      this.loadPackageDetail();
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载套系详情
   */
  async loadPackageDetail() {
    try {
      this.setData({ loading: true });

      const res = await request<PackageDetail>({
        url: `/wx-mall/packages/${this.data.packageId}`,
        method: 'GET'
      });

      console.log('📦 套系详情API响应:', res);
      
      // 处理图片URL和数组字段
      const packageData = {
        ...res,
        images: (res.images || []).map(img => getFullImageUrl(img)),
        includes: res.includes || [],
        tags: res.tags || [],

        // 商品项目：预处理缩略图、合计金额
        packageProducts: (res.packageProducts || []).map((item: PackageProductItem) => {
          const img = item.product?.images;
          return {
            ...item,
            _thumb: getFullImageUrl(Array.isArray(img) ? img[0] : (typeof img === 'string' ? img : '')),
            _total: (item.product?.salePrice || 0) * (item.quantity || 1),
          };
        }),

        // 服务项目：预处理缩略图、合计金额
        packageServices: (res.packageServices || []).map((item: PackageServiceItem) => {
          const img = item.service?.images;
          return {
            ...item,
            _thumb: getFullImageUrl(Array.isArray(img) ? img[0] : (typeof img === 'string' ? img : '')),
            _total: (item.service?.basePrice || 0) * (item.quantity || 1),
          };
        }),

        // 当没有结构化服务数据时，将 includes 文本转为卡片格式显示
        _fallbackServices: (res.includes || []).map((text: string, idx: number) => ({
          id: `fallback-${idx}`,
          _name: text,
          _quantity: 1,
          _price: null as number | null,
          _total: null as number | null,
          _thumb: '',
        })),
      };

      console.log('📦 处理后的套系数据:', packageData);

      this.setData({
        package: packageData
      });

      // 检查收藏状态
      try {
        const favRes = await request<{ favorited: boolean }>({
          url: `/wx-favorite/check?packageId=${this.data.packageId}`,
          method: 'GET'
        });
        this.setData({ isFavorited: favRes.favorited });
      } catch (err) {
        console.warn('获取收藏状态失败:', err);
      }

      // 设置页面标题
      if (packageData.name) {
        wx.setNavigationBarTitle({
          title: packageData.name
        });
      }
    } catch (error) {
      console.error('加载套系详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 轮播图切换
   */
  onSwiperChange(e: any) {
    this.setData({
      currentImageIndex: e.detail.current
    });
  },

  /**
   * 图片预览
   */
  previewImages() {
    const images = this.data.package?.images || [];
    if (images.length === 0) return;

    wx.previewImage({
      urls: images,
      current: images[this.data.currentImageIndex]
    });
  },

  /**
   * 立即预约
   */
  onBookNow() {
    const pkg = this.data.package;
    if (!pkg) {
      wx.showToast({
        title: '套系信息加载中',
        icon: 'none'
      });
      return;
    }

    console.log('🎯 点击立即预约，套系数据:', pkg);

    // 检查套系状态
    if (pkg.status !== 'ACTIVE') {
      wx.showToast({
        title: '该套系已下架',
        icon: 'none'
      });
      return;
    }

    // 构建套系信息对象
    const packageInfo = {
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      depositAmount: pkg.deposit,
      duration_minutes: pkg.duration_minutes,
      coverImage: pkg.images?.[0] || '',
      description: pkg.description
    };

    console.log('🎯 准备跳转，套系信息:', packageInfo);

    // 跳转到日期选择页,传递完整的套系信息
    wx.navigateTo({
      url: `/pages/booking/date/date?packageId=${pkg.id}&packageInfo=${encodeURIComponent(JSON.stringify(packageInfo))}`,
      success: () => {
        console.log('✅ 跳转成功');
      },
      fail: (err) => {
        console.error('❌ 跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const pkg = this.data.package;
    return {
      title: pkg?.name || '精美套系',
      path: `/pages/packages/detail/detail?id=${this.data.packageId}`,
      imageUrl: pkg?.images?.[0] || ''
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const pkg = this.data.package;
    return {
      title: pkg?.name || '精美套系',
      query: `id=${this.data.packageId}`,
      imageUrl: pkg?.images?.[0] || ''
    };
  },

  /**
   * 联系客服
   */
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：0416-5577456\n营业时间：8:30-16:00',
      showCancel: true,
      cancelText: '取消',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4001234567'
          });
        }
      }
    });
  },

  /**
   * 收藏/取消收藏
   */
  async toggleFavorite() {
    try {
      const res = await request<{ favorited: boolean; message: string }>({
        url: '/wx-favorite/toggle',
        method: 'POST',
        data: {
          itemType: 'PACKAGE',
          packageId: this.data.packageId
        }
      });

      this.setData({ isFavorited: res.favorited });

      wx.showToast({
        title: res.favorited ? '已收藏' : '已取消收藏',
        icon: 'success',
        duration: 1500
      });
    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  }
});
