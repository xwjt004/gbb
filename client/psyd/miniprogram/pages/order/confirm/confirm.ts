// 订单确认页面
import { get, post } from '../../../utils/request';
import { getImageUrl } from '../../../utils/image';

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
}

interface Address {
  id: string; // UUID
  receiverName: string; // 后端字段名
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  postalCode?: string;
  isDefault: boolean;
}

interface Coupon {
  id: number;
  name: string;
  amount: number;
}

interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  availableCount: number;
  available: boolean;
  isHoliday: boolean;
  priceMultiplier: number;
}

Page({
  data: {
    // 来源信息
    from: '' as 'cart' | 'buy-now',
    cartItemIds: [] as string[],

    // 商品信息
    items: [] as CartItem[],

    // 收货地址
    address: null as Address | null,

    // 预约信息
    today: '' as string,  // 今天的日期（用于限制日期选择器）
    appointmentDate: '' as string,  // 预约日期 YYYY-MM-DD
    selectedTimeSlot: null as TimeSlot | null,  // 选中的时间槽
    availableTimeSlots: [] as TimeSlot[],  // 可用时间槽列表

    // 配送方式
    deliveryMethod: 'express' as 'express' | 'pickup',
    deliveryMethods: [
      { value: 'express', label: '快递配送', fee: 10 },
      { value: 'pickup', label: '上门自提', fee: 0 }
    ],

    // 优惠券
    coupon: null as Coupon | null,
    availableCoupons: 0,

    // 订单备注
    remark: '',

    // 价格信息
    goodsAmount: 0,
    shippingFee: 10,
    discountAmount: 0,
    totalAmount: 0,

    // 状态
    loading: false,
    submitting: false,
  },

  /**
   * 页面加载
   */
  onLoad(options: any) {
    console.log('订单确认页面加载，参数:', options);

    // 计算今天的日期（YYYY-MM-DD格式）
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { from, cartItemIds, productId, quantity } = options;

    this.setData({
      from: from as 'cart' | 'buy-now',
      today: todayStr
    });

    if (from === 'cart' && cartItemIds) {
      // 从购物车结算
      const ids = cartItemIds.split(',');
      this.setData({ cartItemIds: ids });
      this.loadCartItems(ids);
    } else if (from === 'buy-now' && productId) {
      // 立即购买
      this.loadProductDetail(parseInt(productId), parseInt(quantity) || 1);
    }

    // 加载默认地址
    this.loadDefaultAddress();

    // 加载可用优惠券数量
    this.loadAvailableCoupons();
  },

  /**
   * 加载购物车商品
   */
  async loadCartItems(ids: string[]) {
    this.setData({ loading: true });

    try {
      const data = await get<any>('/wx-cart', {}, { needAuth: true });

      console.log('购物车数据:', data);

      // 筛选出要结算的商品
      const selectedItems = data.items
        .filter((item: any) => ids.includes(item.id))
        .map((item: any) => {
          console.log('处理商品项:', item);
          return {
            id: item.id,
            productId: item.product?.id,
            packageId: item.package?.id,
            type: item.itemType as 'PRODUCT' | 'PACKAGE',
            name: item.itemName,
            image: getImageUrl(item.itemImage) || '/images/placeholder.png',
            specification: item.itemType === 'PRODUCT'
              ? (item.product?.specification || '默认规格')
              : '套系',
            price: Number(item.price) || 0,
            quantity: item.quantity,
            stock: item.itemType === 'PRODUCT' ? item.product?.stockQuantity : 999,
          };
        });

      console.log('处理后的商品列表:', selectedItems);

      if (selectedItems.length === 0) {
        wx.showToast({
          title: '商品不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      this.setData({
        items: selectedItems,
        loading: false
      });

      console.log('准备计算总价...');
      this.calculateTotal();

    } catch (error: any) {
      console.error('加载购物车商品失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载商品详情（立即购买）
   */
  async loadProductDetail(productId: number, quantity: number) {
    this.setData({ loading: true });

    try {
      const product = await get<any>(`/wx-mall/products/${productId}`, {}, { needAuth: false });

      console.log('商品详情加载成功:', product);

      const item: CartItem = {
        id: `temp_${Date.now()}`,
        productId: product.id,
        type: 'PRODUCT',
        name: product.name,
        image: getImageUrl(product.images?.[0]) || '/images/placeholder.png',
        specification: product.specification || '默认规格',
        price: Number(product.price) || 0,  // ✅ 使用 product.price（后端已映射 salePrice -> price）
        quantity: quantity,
        stock: product.stock,  // ✅ 使用 product.stock（后端已映射 stockQuantity -> stock）
      };

      console.log('处理后的商品:', item);

      this.setData({
        items: [item],
        loading: false
      });

      this.calculateTotal();

    } catch (error: any) {
      console.error('加载商品详情失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载默认地址
   */
  async loadDefaultAddress() {
    try {
      // 调用后端 API 获取默认地址
      const address = await get<Address>('/wx-address/default', {}, {
        needAuth: true,
        showLoading: false
      });

      if (address) {
        this.setData({ address });
        console.log('默认地址加载成功:', address);
      } else {
        console.log('未设置默认地址');
      }
    } catch (error: any) {
      console.error('加载默认地址失败:', error);
      // 如果没有默认地址，不显示错误提示
      if (error.message && !error.message.includes('未找到')) {
        wx.showToast({
          title: '加载地址失败',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  /**
   * 加载可用优惠券数量
   */
  async loadAvailableCoupons() {
    try {
      // TODO: 实现优惠券模块后，获取可用优惠券数量
      // const coupons = await request({
      //   url: '/wx-coupon/available',
      //   method: 'GET',
      //   needAuth: true
      // });
      // this.setData({ availableCoupons: coupons.length });

      // 临时：使用模拟数据
      this.setData({ availableCoupons: 0 });
    } catch (error: any) {
      console.error('加载优惠券失败:', error);
    }
  },

  /**
   * 选择地址
   */
  onSelectAddress() {
    // 跳转到地址列表页（选择模式）
    wx.navigateTo({
      url: '/pages/address/list/list?mode=select'
    });
  },

  /**
   * 选择预约日期
   */
  onSelectDate(e: any) {
    const date = e.detail.value;
    console.log('选择预约日期:', date);

    this.setData({
      appointmentDate: date,
      selectedTimeSlot: null  // 清空之前选择的时间槽
    });

    // 加载该日期的可用时间槽
    this.loadAvailableTimeSlots(date);
  },

  /**
   * 加载可用时间槽
   */
  async loadAvailableTimeSlots(date: string) {
    if (!date) return;

    try {
      console.log('加载时间槽:', date);

      const response = await get<any>(`/wx-mall/timeslots?date=${date}`, {}, {
        needAuth: false,
        showLoading: false
      });

      console.log('时间槽数据:', response);

      // 只显示可用的时间槽
      const availableSlots = response.slots.filter((slot: TimeSlot) => slot.available);

      this.setData({
        availableTimeSlots: availableSlots
      });

      if (availableSlots.length === 0) {
        wx.showToast({
          title: '该日期暂无可用时间',
          icon: 'none'
        });
      }
    } catch (error: any) {
      console.error('加载时间槽失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 选择时间槽
   */
  onSelectTimeSlot(e: any) {
    const { index } = e.currentTarget.dataset;
    const timeSlot = this.data.availableTimeSlots[index];

    console.log('选择时间槽:', timeSlot);

    this.setData({
      selectedTimeSlot: timeSlot
    });
  },

  /**
   * 选择配送方式
   */
  onSelectDelivery(e: any) {
    const { value } = e.currentTarget.dataset;
    const method = this.data.deliveryMethods.find(m => m.value === value);

    this.setData({
      deliveryMethod: value,
      shippingFee: method?.fee || 0
    });

    this.calculateTotal();
  },

  /**
   * 选择优惠券
   */
  onSelectCoupon() {
    if (this.data.availableCoupons === 0) {
      wx.showToast({
        title: '暂无可用优惠券',
        icon: 'none'
      });
      return;
    }

    wx.showToast({
      title: '优惠券功能开发中',
      icon: 'none'
    });
    // TODO: 跳转优惠券选择页
    // wx.navigateTo({
    //   url: '/pages/coupon/list?select=true'
    // });
  },

  /**
   * 输入备注
   */
  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value });
  },

  /**
   * 计算总价
   */
  calculateTotal() {
    console.log('开始计算总价，商品列表:', this.data.items);

    const goodsAmount = this.data.items.reduce(
      (sum, item) => {
        const itemTotal = item.price * item.quantity;
        console.log(`商品: ${item.name}, 单价: ${item.price}, 数量: ${item.quantity}, 小计: ${itemTotal}`);
        return sum + itemTotal;
      },
      0
    );

    const shippingFee = this.data.shippingFee;
    const discountAmount = this.data.coupon?.amount || 0;
    const totalAmount = Math.max(0, goodsAmount + shippingFee - discountAmount);

    console.log('计算结果:', {
      goodsAmount,
      shippingFee,
      discountAmount,
      totalAmount
    });

    this.setData({
      goodsAmount,
      shippingFee,
      discountAmount,
      totalAmount
    });
  },

  /**
   * 提交订单
   */
  async onSubmit() {
    // 1. 验证收货地址
    if (!this.data.address) {
      wx.showModal({
        title: '提示',
        content: '请选择收货地址',
        showCancel: false,
        confirmText: '去选择',
        success: (res) => {
          if (res.confirm) {
            this.onSelectAddress();
          }
        }
      });
      return;
    }

    // 2. 验证预约日期和时间
    if (!this.data.appointmentDate) {
      wx.showToast({
        title: '请选择预约日期',
        icon: 'none'
      });
      return;
    }

    if (!this.data.selectedTimeSlot) {
      wx.showToast({
        title: '请选择预约时间',
        icon: 'none'
      });
      return;
    }

    // 3. 防重复提交
    if (this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });

    try {
      // 4. 准备订单数据
      const orderData: any = {
        shippingAddressId: this.data.address.id,
        appointmentDate: new Date(this.data.appointmentDate).toISOString(), // 转换为ISO格式
        timeSlotId: parseInt(String(this.data.selectedTimeSlot!.id)), // 确保是整数
        customerName: this.data.address.receiverName,
        customerPhone: this.data.address.phone,
        deliveryMethod: this.data.deliveryMethod,
        notes: this.data.remark || undefined,
        childrenCount: 1,
      };

      // 5. 添加商品项
      if (this.data.from === 'cart' && this.data.cartItemIds.length > 0) {
        // 从购物车结算 - 确保是字符串数组
        orderData.cartItemIds = this.data.cartItemIds.map(id => String(id));
      } else if (this.data.items.length > 0) {
        // 立即购买
        orderData.items = this.data.items.map((item: CartItem) => {
          const orderItem: any = {
            itemType: item.type,
            quantity: item.quantity
          };
          
          if (item.type === 'PRODUCT' && item.productId) {
            orderItem.productId = item.productId;
          } else if (item.type === 'PACKAGE' && item.packageId) {
            orderItem.packageId = item.packageId;
          }
          
          return orderItem;
        });
      }

      console.log('提交订单数据:', orderData);

      // 6. 调用创建订单API
      const response = await post<any>('/wx-order/create', orderData, { needAuth: true });

      console.log('订单创建成功:', response);

      this.setData({ submitting: false });

      // 7. 成功后跳转到订单详情或支付页
      wx.showModal({
        title: '订单提交成功',
        content: `订单号：${response.orderNo}\n请尽快完成支付`,
        showCancel: true,
        confirmText: '去支付',
        cancelText: '查看订单',
        success: (res) => {
          if (res.confirm) {
            // 跳转到支付页面
            wx.redirectTo({
              url: `/pages/payment/payment?orderId=${response.id}`,
              success: () => {
                console.log('[OrderConfirmPage] 跳转支付页面成功');
              },
              fail: (error) => {
                console.error('[OrderConfirmPage] 跳转支付页面失败:', error);
                // 失败则跳转到订单详情
                wx.redirectTo({
                  url: `/pages/order/detail/detail?id=${response.id}`
                });
              }
            });
          } else {
            // 跳转到订单详情
            wx.redirectTo({
              url: `/pages/order/detail/detail?id=${response.id}`
            });
          }
        }
      });

    } catch (error: any) {
      console.error('提交订单失败:', error);
      this.setData({ submitting: false });

      wx.showModal({
        title: '提交失败',
        content: error.message || '订单提交失败，请重试',
        showCancel: false
      });
    }
  }
});
