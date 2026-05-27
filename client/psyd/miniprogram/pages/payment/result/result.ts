// 支付结果页面
import { request } from '../../../utils/request';

interface ResultData {
  status: 'success' | 'fail' | 'pending';
  orderId: string;
  orderNo: string;
  amount: number;
  payTime: string;
  failReason: string;
}

Page({
  data: {
    status: 'success',
    orderId: '',
    orderNo: '',
    amount: 0,
    payTime: '',
    failReason: ''
  } as ResultData,

  /**
   * 页面加载
   */
  onLoad(options: any) {
    console.log('[ResultPage] 页面加载，参数:', options);

    const { status, orderId, reason } = options;

    this.setData({
      status: status || 'success',
      orderId: orderId || '',
      failReason: reason ? decodeURIComponent(reason) : ''
    });

    // 如果是成功状态，加载订单详情
    if (status === 'success' && orderId) {
      this.loadOrderInfo();
    }
  },

  /**
   * 加载订单信息
   */
  async loadOrderInfo() {
    const { orderId } = this.data;

    try {
      const orderData = await request({
        url: `/wx-orders/${orderId}`,
        method: 'GET'
      });

      console.log('[ResultPage] 订单信息:', orderData);

      // 格式化支付时间
      const payTime = this.formatTime(new Date());

      this.setData({
        orderNo: orderData.orderNo || '',
        amount: orderData.totalAmount || 0,
        payTime
      });

    } catch (error: any) {
      console.error('[ResultPage] 加载订单失败:', error);
      // 即使加载失败也不影响结果页展示
    }
  },

  /**
   * 格式化时间
   */
  formatTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },

  /**
   * 返回首页
   */
  onBackHome() {
    wx.switchTab({
      url: '/pages/product/list'
    });
  },

  /**
   * 查看订单
   */
  onViewOrder() {
    const { orderId } = this.data;
    
    wx.redirectTo({
      url: `/pages/order/detail/detail?id=${orderId}`,
      fail: () => {
        // 如果跳转失败，跳转到订单列表
        wx.switchTab({
          url: '/pages/profile/profile',
          success: () => {
            // 可以通过事件通知个人中心切换到订单tab
            setTimeout(() => {
              wx.navigateTo({
                url: '/pages/order/list/list'
              });
            }, 300);
          }
        });
      }
    });
  },

  /**
   * 返回订单
   */
  onBackOrder() {
    wx.navigateTo({
      url: '/pages/order/list/list',
      fail: () => {
        wx.switchTab({
          url: '/pages/profile/profile'
        });
      }
    });
  },

  /**
   * 重新支付
   */
  onRetryPay() {
    const { orderId } = this.data;
    
    wx.redirectTo({
      url: `/pages/payment/payment?orderId=${orderId}`
    });
  },

  /**
   * 刷新支付状态
   */
  async onRefresh() {
    wx.showLoading({ title: '刷新中...' });

    try {
      // 重新加载订单信息检查支付状态
      await this.loadOrderInfo();
      
      wx.hideLoading();
      wx.showToast({
        title: '已刷新',
        icon: 'success'
      });

    } catch (error: any) {
      wx.hideLoading();
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    }
  },

  /**
   * 联系客服
   */
  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567\n工作时间：9:00-18:00',
      showCancel: true,
      confirmText: '拨打电话',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4001234567',
            fail: () => {
              wx.showToast({
                title: '拨打失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  }
});
