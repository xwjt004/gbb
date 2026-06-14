// 支付页面
import { request } from '../../utils/request';

interface PaymentData {
  orderId: string;
  orderNo: string;
  itemCount: number;
  orderAmount: number;
  discountAmount: number;
  totalAmount: number;
  selectedMethod: 'WECHAT' | 'ALIPAY';
  agreed: boolean;
  loading: boolean;
}

Page({
  data: {
    orderId: '',
    orderNo: '',
    itemCount: 0,
    orderAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    selectedMethod: 'WECHAT',
    agreed: true,
    loading: false
  } as PaymentData,

  /**
   * 页面加载
   */
  onLoad(options: any) {
    console.log('[PaymentPage] 页面加载，参数:', options);
    
    const { orderId, amount } = options;
    
    if (!orderId) {
      wx.showToast({
        title: '订单信息错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 如果传入了金额，直接使用（用于预约订单支付）
    if (amount) {
      this.setData({
        orderId,
        totalAmount: parseFloat(amount),
        orderAmount: parseFloat(amount)
      });
    }

    this.setData({ orderId });
    this.loadOrderInfo();
  },

  /**
   * 加载订单信息
   */
  async loadOrderInfo() {
    const { orderId } = this.data;

    try {
      wx.showLoading({ title: '加载中...' });

      // 获取订单详情
      const orderData = await request<any>({
        url: `/wx-order/${orderId}`,
        method: 'GET',
        needAuth: true
      });

      console.log('[PaymentPage] 订单信息:', orderData);

      // 计算商品数量
      const itemCount = orderData.items?.length || 0;
      
      // 计算折扣金额
      const discountAmount = orderData.discountAmount || 0;

      this.setData({
        orderNo: orderData.orderNo,
        itemCount,
        orderAmount: orderData.totalAmount,
        discountAmount,
        totalAmount: orderData.totalAmount - discountAmount
      });

      wx.hideLoading();

    } catch (error: any) {
      console.error('[PaymentPage] 加载订单失败:', error);
      wx.hideLoading();
      
      wx.showModal({
        title: '提示',
        content: error.message || '加载订单信息失败',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  /**
   * 选择支付方式
   */
  onSelectMethod(e: any) {
    const { method } = e.currentTarget.dataset;
    console.log('[PaymentPage] 选择支付方式:', method);
    
    this.setData({
      selectedMethod: method
    });
  },

  /**
   * 协议勾选变化
   */
  onAgreementChange(e: any) {
    const agreed = e.detail.value.includes('agree');
    console.log('[PaymentPage] 协议勾选状态:', agreed);
    
    this.setData({ agreed });
  },

  /**
   * 查看支付协议
   */
  onViewAgreement() {
    wx.navigateTo({
      url: '/pages/payment/agreement/agreement'
    });
  },

  /**
   * 确认支付
   */
  async onPay() {
    const { orderId, selectedMethod, agreed, totalAmount, loading } = this.data;

    // 检查是否同意协议
    if (!agreed) {
      wx.showToast({
        title: '请先同意支付协议',
        icon: 'none'
      });
      return;
    }

    // 防止重复提交
    if (loading) {
      return;
    }

    console.log('[PaymentPage] 开始支付流程');
    console.log('[PaymentPage] 订单ID:', orderId);
    console.log('[PaymentPage] 支付方式:', selectedMethod);
    console.log('[PaymentPage] 支付金额:', totalAmount);

    this.setData({ loading: true });

    try {
      // Step 1: 创建支付订单（预约订单使用特定API）
      wx.showLoading({ title: '正在创建支付...' });

      const paymentData = await request({
        url: `/wx-orders/${orderId}/pay`,
        method: 'POST',
        data: {
          amount: totalAmount,
          paymentMethod: selectedMethod
        }
      });

      console.log('[PaymentPage] 支付订单创建成功:', paymentData);

      // Step 2: 获取微信支付参数
      if (selectedMethod === 'WECHAT') {
        await this.wxPay(paymentData);
      } else {
        // 其他支付方式（预留）
        wx.hideLoading();
        wx.showToast({
          title: '暂不支持该支付方式',
          icon: 'none'
        });
        this.setData({ loading: false });
      }

    } catch (error: any) {
      console.error('[PaymentPage] 支付失败:', error);
      wx.hideLoading();
      
      this.setData({ loading: false });

      wx.showModal({
        title: '支付失败',
        content: error.message || '创建支付订单失败，请重试',
        showCancel: true,
        confirmText: '重试',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.onPay();
          }
        }
      });
    }
  },

  /**
   * 微信支付
   */
  async wxPay(paymentData: any) {
    try {
      console.log('[PaymentPage] 调起微信支付');
      console.log('[PaymentPage] 支付参数:', paymentData);

      // 提取实际的支付参数（后端返回格式：{ code, message, data }）
      const payParams = paymentData.data || paymentData;
      
      console.log('[PaymentPage] 微信支付参数:', {
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign
      });

      // 微信支付
      await wx.requestPayment({
        timeStamp: payParams.timeStamp || '',
        nonceStr: payParams.nonceStr || '',
        package: payParams.package || '',
        signType: payParams.signType || 'RSA',
        paySign: payParams.paySign || ''
      });

      console.log('[PaymentPage] 微信支付成功');
      wx.hideLoading();

      // 同步支付状态到后端（主动查询微信确认支付结果）
      try {
        await request({
          url: `/wx-orders/${this.data.orderId}/pay/sync`,
          method: 'POST',
          needAuth: true,
        });
        console.log('[PaymentPage] 支付状态同步成功');
      } catch (syncErr) {
        console.warn('[PaymentPage] 支付状态同步失败，系统将通过回调自动处理:', syncErr);
      }

      // 支付成功，跳转到结果页
      wx.redirectTo({
        url: `/pages/payment/result/result?status=success&orderId=${this.data.orderId}`
      });

    } catch (error: any) {
      console.error('[PaymentPage] 微信支付失败:', error);
      wx.hideLoading();
      
      this.setData({ loading: false });

      // 用户取消支付
      if (error.errMsg && error.errMsg.includes('cancel')) {
        wx.showModal({
          title: '提示',
          content: '您已取消支付，可以稍后在订单列表中继续支付',
          showCancel: true,
          confirmText: '返回订单',
          cancelText: '继续支付',
          success: (res) => {
            if (res.confirm) {
              wx.navigateBack();
            }
          }
        });
      } else {
        // 支付失败
        wx.redirectTo({
          url: `/pages/payment/result/result?status=fail&orderId=${this.data.orderId}&reason=${encodeURIComponent(error.errMsg || '支付失败')}`
        });
      }
    }
  }
});
