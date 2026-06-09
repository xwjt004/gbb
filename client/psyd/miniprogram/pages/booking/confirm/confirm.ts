// pages/booking/confirm/confirm.ts
import { request } from '../../../utils/request';

interface BookingData {
  packageId: number;
  packageInfo: {
    id: number;
    name: string;
    price: number;
    deposit: number;
    duration_minutes: number;
    image: string;
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
}

Page({
  data: {
    bookingData: null,
    paymentType: 'full', // 默认全款支付
    totalPrice: 0,
    payAmount: 0,
    submitting: false
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
          payAmount: totalPrice // 默认全款支付
        });
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
    const depositAmount = parseFloat(this.data.bookingData!.packageInfo.depositAmount as any) || 0;
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
   * 提交订单
   */
  async submitOrder() {
    if (this.data.submitting) return;

    const { bookingData, paymentType, payAmount } = this.data;
    if (!bookingData) return;

    this.setData({ submitting: true });

    try {
      // 获取或生成用户openid
      const userInfo = wx.getStorageSync('userInfo');
      let userOpenid = userInfo?.openid || ('test_user_' + bookingData.contactPhone);
      
      console.log('👤 当前openid:', userOpenid);
      
      // 无论如何都先创建/更新用户（确保用户存在）
      try {
        const createUserRes = await request({
          url: '/users',
          method: 'POST',
          data: {
            openid: userOpenid,
            nickname: bookingData.contactName,
            phone: bookingData.contactPhone,
            status: 'ACTIVE'
          }
        });
        console.log('✅ 用户创建/更新成功:', createUserRes);
      } catch (userError: any) {
        // 用户已存在会返回409冲突，这是正常的
        if (userError.message && userError.message.includes('already exists')) {
          console.log('ℹ️ 用户已存在，继续创建订单');
        } else {
          console.warn('⚠️ 用户创建异常:', userError.message);
        }
      }

      // 调用创建订单接口
      const orderData = {
        userOpenid: userOpenid,
        packageId: bookingData.packageId,
        timeSlotId: bookingData.slotId,
        appointmentDate: new Date(bookingData.date).toISOString(),
        totalAmount: parseFloat(this.data.totalPrice as any),
        depositAmount: parseFloat(bookingData.packageInfo.depositAmount as any) || 0,
        childrenCount: bookingData.childrenCount,
        customerName: bookingData.contactName,
        customerPhone: bookingData.contactPhone,
        notes: bookingData.notes || '',
        paymentType: paymentType === 'deposit' ? 'DEPOSIT' : 'FULL'
      };

      console.log('📝 创建订单数据:', orderData);

      const res = await request({
        url: '/orders',
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
