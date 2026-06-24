// pages/booking/confirm/confirm.ts
import { request } from '../../../utils/request';
import { getImageUrl } from '../../../utils/image';

interface BookingData {
  packageId: number;
  packageInfo: {
    id: number;
    name: string;
    price: number;
    depositAmount: number;
    duration_minutes: number;
    coverImage: string;
    description?: string;
  };
  date: string;
  dateDisplay: string;
  weekDay: string;
  slotId: number;
  slotInfo: {
    id: number;
    startTime: string;
    endTime: string;
  };
  childrenCount: number;
  contactName: string;
  contactPhone: string;
  notes: string;
}

interface PageData {
  bookingData: BookingData | null;
  paymentType: 'deposit' | 'full';
  totalPrice: number;
  payAmount: number;
  submitting: boolean;
  packageCoverImage: string;
  packageItems: Array<{
    name: string;
    image: string;
    quantity: number;
    type: string;
  }>;
  loadingDetail: boolean;
}

Page({
  data: {
    bookingData: null,
    paymentType: 'full', // 默认全款支付
    totalPrice: 0,
    payAmount: 0,
    submitting: false,
    packageCoverImage: '',
    packageItems: [],
    loadingDetail: true,
  } as PageData,

  onLoad(options: { data?: string }) {
    console.log('预约确认页参数：', options);

    if (options.data) {
      try {
        const bookingData = JSON.parse(decodeURIComponent(options.data));
        console.log('💰 预约数据:', bookingData);
        console.log('💰 套系信息:', bookingData.packageInfo);
        
        const totalPrice = parseFloat(bookingData.packageInfo.price) || 0;
        const depositAmount = parseFloat(bookingData.packageInfo.depositAmount) || 0;

        console.log('💰 总价:', totalPrice, '定金:', depositAmount);

        this.setData({
          bookingData,
          totalPrice,
          payAmount: totalPrice, // 默认全款支付
          packageCoverImage: getImageUrl(bookingData.packageInfo.coverImage) || '',
        });

        // 获取套系详情（商品、服务等）
        this.loadPackageItems(bookingData.packageId);
      } catch (error) {
        console.error('解析预约数据失败：', error);
        wx.showToast({
          title: '数据错误',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
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
   * 选择支付方式
   */
  selectPaymentType(e: any) {
    const type = e.currentTarget.dataset.type as 'deposit' | 'full';
    const depositAmount = parseFloat(String(this.data.bookingData!.packageInfo.depositAmount)) || 0;
    const totalPrice = this.data.totalPrice;
    const payAmount = type === 'deposit' ? depositAmount : totalPrice;

    console.log(`💳 切换支付方式: ${type}, 定金=${depositAmount}, 总价=${totalPrice}, 实付=${payAmount}`);

    this.setData({
      paymentType: type,
      payAmount: payAmount
    });

    console.log('💳 更新后的payAmount:', this.data.payAmount);
  },

  /**
   * 加载套系商品/服务内容
   */
  async loadPackageItems(packageId: number) {
    try {
      const res: any = await request({
        url: `/wx-mall/packages/${packageId}`,
        method: 'GET',
      });

      const pkg = res.data || res;
      const items: Array<{ name: string; image: string; quantity: number; type: string }> = [];

      // 商品列表（含缩略图）
      if (pkg.packageProducts) {
        pkg.packageProducts.forEach((pp: any) => {
          const product = pp.product || {};
          const productImages = product.images;
          let imgUrl = '';
          if (typeof productImages === 'string') {
            try { const parsed = JSON.parse(productImages); imgUrl = Array.isArray(parsed) ? getImageUrl(parsed[0]) : getImageUrl(productImages); } catch { imgUrl = getImageUrl(productImages); }
          } else if (Array.isArray(productImages)) {
            imgUrl = getImageUrl(productImages[0]);
          }
          items.push({
            name: product.name || `商品#${pp.productId}`,
            image: imgUrl || '/images/placeholder.png',
            quantity: pp.quantity || 1,
            type: 'product',
          });
        });
      }

      // 服务项目（含缩略图）
      if (pkg.packageServices) {
        pkg.packageServices.forEach((ps: any) => {
          const service = ps.service || {};
          const serviceImages = service.images;
          let imgUrl = '';
          if (typeof serviceImages === 'string') {
            try { const parsed = JSON.parse(serviceImages); imgUrl = Array.isArray(parsed) ? getImageUrl(parsed[0]) : getImageUrl(serviceImages); } catch { imgUrl = getImageUrl(serviceImages); }
          } else if (Array.isArray(serviceImages)) {
            imgUrl = getImageUrl(serviceImages[0]);
          }
          items.push({
            name: service.name || `服务#${ps.serviceId}`,
            image: imgUrl || '/images/placeholder.png',
            quantity: ps.quantity || 1,
            type: 'service',
          });
        });
      }

      // 套系包含内容（自由文本）
      if (pkg.includes && pkg.includes.length > 0) {
        pkg.includes.forEach((desc: string) => {
          items.push({
            name: desc,
            image: '/images/placeholder.png',
            quantity: 1,
            type: 'include',
          });
        });
      }

      this.setData({
        packageItems: items,
        loadingDetail: false,
      });
    } catch (error: any) {
      console.error('加载套系详情失败:', error);
      this.setData({ loadingDetail: false });
    }
  },

  /**
   * 提交订单
   */
  async submitOrder() {
    if (this.data.submitting) return;

    const { bookingData, paymentType, payAmount } = this.data;
    if (!bookingData) return;

    this.setData({ submitting: true });

    try {
      // 获取团购活动ID（如果有）
      const activityId = (bookingData.packageInfo as any).activityId;

      // 调用微信预约下单接口
      const orderData = {
        packageId: bookingData.packageId,
        timeSlotId: bookingData.slotId,
        appointmentDate: new Date(bookingData.date).toISOString(),
        childrenCount: bookingData.childrenCount,
        customerName: bookingData.contactName,
        customerPhone: bookingData.contactPhone,
        notes: bookingData.notes || '',
        paymentType: paymentType === 'deposit' ? 'DEPOSIT' : 'FULL',
        groupBuyActivityId: activityId || undefined,
      };

      console.log('📝 创建订单数据:', orderData);

      const res = await request({
        url: '/wx-order/booking',
        method: 'POST',
        data: orderData
      });

      console.log('✅ 订单创建成功:', res);

      if (res && res.id) {
        // 订单创建成功，跳转到支付页面
        wx.redirectTo({
          url: `/pages/payment/payment?orderId=${res.id}&amount=${payAmount}`
        });
      } else {
        throw new Error('订单创建失败');
      }
    } catch (error: any) {
      console.error('创建订单失败：', error);
      
      let errorMessage = '订单创建失败，请重试';
      if (error.message) {
        errorMessage = error.message;
      }

      wx.showModal({
        title: '提交失败',
        content: errorMessage,
        showCancel: false
      });

      this.setData({ submitting: false });
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  },

  /**
   * 联系客服
   */
  contactService() {
    wx.makePhoneCall({
      phoneNumber: '0416-5577456', // 客服电话
      fail: () => {
        wx.showToast({
          title: '拨打失败',
          icon: 'none'
        });
      }
    });
  }
});
