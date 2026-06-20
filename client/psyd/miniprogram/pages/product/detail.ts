// 商品详情页面
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
  specifications?: any;
  details?: string;
  detailContent?: any; // 富文本详情
  stockQuantity?: number; // 实际库存（后端返回但不显示）
}

Page({
  data: {
    product: null as Product | null,
    productId: '', // 保存商品ID用于刷新
    loading: true,
    quantity: 1,
    currentImageIndex: 0,
    maxQuantity: 99, // 最大可购买数量（从后端获取实际库存）
    
    // 规格选择（如果有规格）
    selectedSpecs: {} as any
  },

  /**
   * 页面加载
   */
  onLoad(options: any) {
    console.log('商品详情页加载', options);
    
    if (!options.id) {
      wx.showToast({
        title: '商品ID缺失',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
      return;
    }

    // 保存商品ID，供onShow使用
    this.setData({ productId: options.id });
    this.loadProductDetail(options.id);
  },

  /**
   * 页面显示 - 刷新数据
   */
  onShow() {
    if (this.data.productId && !this.data.loading) {
      this.loadProductDetail(this.data.productId);
    }
  },

  /**
   * 加载商品详情
   */
  async loadProductDetail(id: string) {
    this.setData({ loading: true });

    try {
      const data = await request<Product>({
        url: `/wx-mall/products/${id}`,
        method: 'GET',
        needAuth: false
      });

      // 转换图片 URL
      const productWithFullUrls = {
        ...data,
        thumbnail: getThumbnailUrl(data.thumbnail, data.images),
        images: getImageUrls(data.images)
      };

      // 获取实际库存数量（不显示给用户，但用于限制购买数量）
      const maxQuantity = data.stockQuantity || data.stock || 99;

      this.setData({
        product: productWithFullUrls,
        maxQuantity: maxQuantity,
        loading: false
      });

      // 设置页面标题
      wx.setNavigationBarTitle({
        title: data.name
      });

      console.log('商品详情加载成功:', productWithFullUrls);
    } catch (error: any) {
      console.error('加载商品详情失败:', error);
      
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
   * 图片切换
   */
  onImageChange(e: any) {
    this.setData({
      currentImageIndex: e.detail.current
    });
  },

  /**
   * 预览图片
   */
  previewImage(e: any) {
    const { current } = e.currentTarget.dataset;
    const images = this.data.product?.images || [];
    
    wx.previewImage({
      current,
      urls: images
    });
  },

  /**
   * 减少数量
   */
  decreaseQuantity() {
    if (this.data.quantity > 1) {
      this.setData({
        quantity: this.data.quantity - 1
      });
    }
  },

  /**
   * 增加数量
   */
  increaseQuantity() {
    const maxQuantity = this.data.maxQuantity;
    if (this.data.quantity < maxQuantity) {
      this.setData({
        quantity: this.data.quantity + 1
      });
    } else {
      wx.showToast({
        title: '已达到最大购买数量',
        icon: 'none',
        duration: 1500
      });
    }
  },

  /**
   * 输入数量
   */
  onQuantityInput(e: any) {
    const value = parseInt(e.detail.value) || 1;
    const maxQuantity = this.data.maxQuantity;
    
    if (value < 1) {
      this.setData({ quantity: 1 });
    } else if (value > maxQuantity) {
      this.setData({ quantity: maxQuantity });
      wx.showToast({
        title: '已达到最大购买数量',
        icon: 'none',
        duration: 1500
      });
    } else {
      this.setData({ quantity: value });
    }
  },

  /**
   * 加入购物车
   */
  async addToCart() {
    const product = this.data.product;
    if (!product) return;

    if (product.stock <= 0) {
      wx.showToast({
        title: '商品已售罄',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      await request({
        url: '/wx-cart/add',
        method: 'POST',
        data: {
          itemType: 'PRODUCT',
          productId: product.id,
          quantity: this.data.quantity
        },
        needAuth: true
      });

      wx.showToast({
        title: '已加入购物车',
        icon: 'success',
        duration: 1500
      });

      console.log(`商品 ${product.name} 已加入购物车，数量: ${this.data.quantity}`);
    } catch (error: any) {
      console.error('加入购物车失败:', error);
      
      if (error.message.includes('登录')) {
        const productId = this.data.product?.id || '';
        wx.showModal({
          title: '提示',
          content: '请先登录',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              const redirectUrl = productId ? `/pages/product/detail?id=${productId}` : '/pages/product/list';
              wx.navigateTo({
                url: '/pages/login/login?redirectUrl=' + encodeURIComponent(redirectUrl)
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
   * 立即购买
   */
  async buyNow() {
    const product = this.data.product;
    if (!product) return;

    if (product.stock <= 0) {
      wx.showToast({
        title: '商品已售罄',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 检查登录状态
    const token = wx.getStorageSync('accessToken');
    if (!token) {
      const productId = this.data.product?.id || '';
      wx.showModal({
        title: '提示',
        content: '请先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            const redirectUrl = productId ? `/pages/product/detail?id=${productId}` : '/pages/product/list';
            wx.navigateTo({
              url: '/pages/login/login?redirectUrl=' + encodeURIComponent(redirectUrl)
            });
          }
        }
      });
      return;
    }

    console.log(`立即购买商品 ${product.name}，数量: ${this.data.quantity}`);

    // 跳转到订单确认页面（立即购买模式）
    wx.navigateTo({
      url: `/pages/order/confirm/confirm?from=buy-now&productId=${product.id}&quantity=${this.data.quantity}`,
      success: () => {
        console.log('跳转到订单确认页成功');
      },
      fail: (error) => {
        console.error('跳转失败:', error);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 联系客服
   */
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：0416-5577456\n营业时间：8:30-16:00',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 返回首页
   */
  goHome() {
    wx.switchTab({
      url: '/pages/packages/list/list'
    });
  },

  /**
   * 格式化价格
   */
  formatPrice(price: number): string {
    return formatPrice(price);
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const product = this.data.product;
    return {
      title: product ? product.name : '商品详情',
      path: `/pages/product/detail?id=${product?.id}`,
      imageUrl: product?.thumbnail || product?.images?.[0]
    };
  }
});
