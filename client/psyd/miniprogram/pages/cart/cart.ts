// 购物车页面
import { request } from '../../utils/request';
import { formatPrice } from '../../utils/format';
import { getImageUrl } from '../../utils/image';

interface CartItem {
  id: string;
  productId?: number;
  packageId?: number;
  type: 'PRODUCT' | 'PACKAGE';
  name: string;
  image: string;
  specification: string;
  price: number;
  quantity: number;
  stock: number;
  isValid: boolean;
  selected: boolean;
  product?: {
    id: number;
    name: string;
    images: string[];
    salePrice: number;
    stockQuantity: number;
    status: string;
  };
  package?: {
    id: number;
    name: string;
    images: string[];
    price: number;
    status: string;
  };
}

interface CartResponse {
  items: CartItem[];
  total: number;
}

Page({
  data: {
    cartItems: [] as CartItem[],
    loading: false,
    allSelected: false,
    totalPrice: 0,
    selectedCount: 0,
    hasInvalidItems: false,
    editing: false
  },

  /**
   * 页面加载
   */
  onLoad() {
    console.log('购物车页面加载');
    this.loadCart();
  },

  /**
   * 页面显示
   */
  onShow() {
    console.log('[CartPage] 页面显示');
    
    // 检查是否刚刚完成登录
    const app = getApp<IAppOption>();
    const justLoggedIn = app.globalData.justLoggedIn;
    const loginTimestamp = app.globalData.loginTimestamp;
    const timeSinceLogin = Date.now() - loginTimestamp;
    
    // 如果刚登录完成（3秒内），跳过重复的登录检查
    if (justLoggedIn && timeSinceLogin < 3000) {
      console.log('[CartPage] 刚完成登录，直接加载购物车');
      app.globalData.justLoggedIn = false; // 重置标记
    }
    
    // 每次显示时刷新购物车
    this.loadCart();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadCart();
  },

  /**
   * 加载购物车数据
   */
  async loadCart() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      // 检查是否登录
      const token = wx.getStorageSync('accessToken');
      if (!token) {
        this.setData({ loading: false });
        // 直接跳转到登录页，不显示提示
        wx.navigateTo({ 
          url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/cart/cart')
        });
        return;
      }

      const data = await request<CartResponse>({
        url: '/wx-cart',
        method: 'GET',
        needAuth: true
      });

      console.log('购物车原始数据:', data);

      // 处理购物车数据 - 直接使用后端返回的格式
      const cartItems = data.items.map((item: any) => {
        // 后端已经处理好了基础字段
        const baseItem = {
          id: item.id,
          itemType: item.itemType,
          productId: item.product?.id,
          packageId: item.package?.id,
          name: item.itemName, // 后端返回的是 itemName
          image: getImageUrl(item.itemImage) || '/images/placeholder.png', // 转换图片 URL
          price: item.price, // 后端已经转换为number
          quantity: item.quantity,
          subtotal: item.subtotal,
          isAvailable: item.isAvailable, // 后端返回的是 isAvailable
          isSelected: item.isSelected || false,
          selected: item.isSelected || false, // 用于界面绑定
          product: item.product,
          package: item.package,
        };

        // 添加规格和库存信息
        if (item.itemType === 'PRODUCT' && item.product) {
          return {
            ...baseItem,
            type: 'PRODUCT' as const,
            specification: item.product.specification || '默认规格',
            stock: item.product.stockQuantity,
            isValid: item.isAvailable,
          };
        } else if (item.itemType === 'PACKAGE' && item.package) {
          return {
            ...baseItem,
            type: 'PACKAGE' as const,
            specification: '套系',
            stock: 999,
            isValid: item.isAvailable,
          };
        }

        return {
          ...baseItem,
          type: item.itemType as 'PRODUCT' | 'PACKAGE',
          specification: '未知',
          stock: 0,
          isValid: false,
        };
      });

      console.log('处理后的购物车数据:', cartItems);

      const hasInvalidItems = cartItems.some((item: CartItem) => !item.isValid);
      
      // 默认全选有效商品
      const cartItemsWithSelection = cartItems.map((item: CartItem) => ({
        ...item,
        selected: item.isValid // 有效商品默认选中
      }));
      
      // 检查是否全选（只看有效商品）
      const validItems = cartItemsWithSelection.filter((item: CartItem) => item.isValid);
      const allSelected = validItems.length > 0 && validItems.every((item: CartItem) => item.selected);

      this.setData({
        cartItems: cartItemsWithSelection,
        hasInvalidItems,
        allSelected,
        loading: false
      });

      this.calculateTotal();

      wx.stopPullDownRefresh();

      console.log('购物车加载成功:', data);
    } catch (error: any) {
      console.error('加载购物车失败:', error);

      this.setData({ loading: false });

      // 如果是登录过期错误，直接跳转到登录页
      if (error.message?.includes('登录已过期') || error.message?.includes('401')) {
        wx.navigateTo({ 
          url: '/pages/login/login?redirectUrl=' + encodeURIComponent('/pages/cart/cart')
        });
      } else {
        wx.showToast({
          title: error.message || '加载失败',
          icon: 'none',
          duration: 2000
        });
      }

      wx.stopPullDownRefresh();
    }
  },

  /**
   * 切换商品选中状态
   */
  onItemSelect(e: any) {
    const { index } = e.currentTarget.dataset;
    const cartItems = this.data.cartItems;

    cartItems[index].selected = !cartItems[index].selected;

    // 检查是否全选
    const allSelected = cartItems
      .filter((item: CartItem) => item.isValid)
      .every((item: CartItem) => item.selected);

    this.setData({
      cartItems,
      allSelected
    });

    this.calculateTotal();
  },

  /**
   * 全选/取消全选
   */
  onSelectAll() {
    const allSelected = !this.data.allSelected;
    const cartItems = this.data.cartItems.map((item: CartItem) => ({
      ...item,
      selected: item.isValid ? allSelected : false
    }));

    this.setData({
      cartItems,
      allSelected
    });

    this.calculateTotal();
  },

  /**
   * 增加数量
   */
  async onIncreaseQuantity(e: any) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.cartItems[index];

    if (item.quantity >= item.stock) {
      wx.showToast({
        title: '已达库存上限',
        icon: 'none'
      });
      return;
    }

    await this.updateQuantity(item.id, item.quantity + 1);
  },

  /**
   * 减少数量
   */
  async onDecreaseQuantity(e: any) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.cartItems[index];

    if (item.quantity <= 1) {
      wx.showModal({
        title: '提示',
        content: '是否删除该商品？',
        success: (res) => {
          if (res.confirm) {
            this.deleteItem(item.id);
          }
        }
      });
      return;
    }

    await this.updateQuantity(item.id, item.quantity - 1);
  },

  /**
   * 更新商品数量
   */
  async updateQuantity(id: string, quantity: number) {
    try {
      await request({
        url: `/wx-cart/${id}`,
        method: 'PATCH' as any, // 修复：使用 PATCH 而不是 PUT
        data: { quantity },
        needAuth: true
      });

      // 更新本地数据
      const cartItems = this.data.cartItems.map((item: CartItem) => {
        if (item.id === id) {
          return { ...item, quantity };
        }
        return item;
      });

      this.setData({ cartItems });
      this.calculateTotal();

    } catch (error: any) {
      console.error('更新数量失败:', error);
      wx.showToast({
        title: error.message || '更新失败',
        icon: 'none'
      });
    }
  },

  /**
   * 删除商品
   */
  onDeleteItem(e: any) {
    const { index } = e.currentTarget.dataset;
    const item = this.data.cartItems[index];

    wx.showModal({
      title: '提示',
      content: '确定删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteItem(item.id);
        }
      }
    });
  },

  /**
   * 删除购物车项
   */
  async deleteItem(id: string) {
    try {
      await request({
        url: `/wx-cart/${id}`,
        method: 'DELETE',
        needAuth: true
      });

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });

      // 重新加载购物车
      this.loadCart();

    } catch (error: any) {
      console.error('删除失败:', error);
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 清空购物车
   */
  onClearCart() {
    if (this.data.cartItems.length === 0) {
      return;
    }

    wx.showModal({
      title: '提示',
      content: '确定清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          this.clearCart();
        }
      }
    });
  },

  /**
   * 清空购物车
   */
  async clearCart() {
    try {
      await request({
        url: '/wx-cart/clear',
        method: 'POST',
        needAuth: true
      });

      wx.showToast({
        title: '已清空',
        icon: 'success'
      });

      this.setData({
        cartItems: [],
        allSelected: false,
        totalPrice: 0,
        selectedCount: 0
      });

    } catch (error: any) {
      console.error('清空失败:', error);
      wx.showToast({
        title: error.message || '清空失败',
        icon: 'none'
      });
    }
  },

  /**
   * 删除失效商品
   */
  async onDeleteInvalid() {
    const invalidItems = this.data.cartItems.filter((item: CartItem) => !item.isValid);
    
    if (invalidItems.length === 0) {
      return;
    }

    wx.showModal({
      title: '提示',
      content: `确定删除 ${invalidItems.length} 个失效商品吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            // 批量删除
            await Promise.all(
              invalidItems.map((item: CartItem) =>
                request({
                  url: `/wx-cart/${item.id}`,
                  method: 'DELETE',
                  needAuth: true
                })
              )
            );

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });

            this.loadCart();

          } catch (error: any) {
            console.error('删除失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 计算总价
   */
  calculateTotal() {
    const cartItems = this.data.cartItems;
    let totalPrice = 0;
    let selectedCount = 0;

    cartItems.forEach((item: CartItem) => {
      if (item.selected && item.isValid) {
        totalPrice += item.price * item.quantity;
        selectedCount += item.quantity;
      }
    });

    this.setData({
      totalPrice,
      selectedCount
    });
  },

  /**
   * 去结算
   */
  onCheckout() {
    const selectedItems = this.data.cartItems.filter((item: CartItem) => item.selected && item.isValid);

    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      });
      return;
    }

    // 获取选中商品的IDs
    const cartItemIds = selectedItems.map(item => item.id).join(',');

    console.log('准备跳转到订单确认页，选中的商品IDs:', cartItemIds);

    // 跳转到订单确认页（注意完整路径）
    wx.navigateTo({
      url: `/pages/order/confirm/confirm?from=cart&cartItemIds=${cartItemIds}`,
      success: () => {
        console.log('跳转成功');
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
   * 继续购物 - 跳转到商品列表页
   */
  onContinueShopping() {
    wx.switchTab({
      url: '/pages/product/list',
      success: () => {
        console.log('跳转到商品列表页成功');
      },
      fail: (error) => {
        console.error('跳转到商品列表页失败:', error);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 首页 - 跳转到商品页
   */
  goHome() {
    wx.switchTab({
      url: '/pages/product/list',
    });
  },

  /**
   * 格式化价格
   */
  formatPrice(price: number): string {
    return formatPrice(price);
  }
});
