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

interface PackageDetail {
  id: number;
  name: string;
  description: string;
  price: string;
  deposit: string;
  durationMinutes: number;
  images: string[];
  status: string;
  isPopular?: boolean;
  salesVolume: number;
  category: string;
  categoryId?: number;
  packageCategory?: PackageCategory;
  tags: string[];
  includes: string[];
}

Page({
  data: {
    packageId: 0,
    package: null as PackageDetail | null,
    loading: true,
    
    // 轮播图
    currentImageIndex: 0,
    
    // 服务内容展开状态
    servicesExpanded: false,
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
      };
      
      console.log('📦 处理后的套系数据:', packageData);
      
      this.setData({ 
        package: packageData
      });

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
   * 切换服务内容展开状态
   */
  toggleServices() {
    this.setData({
      servicesExpanded: !this.data.servicesExpanded
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
      content: '客服电话：400-123-4567\n营业时间：9:00-18:00',
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
  toggleFavorite() {
    // TODO: 实现收藏功能
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  }
});
