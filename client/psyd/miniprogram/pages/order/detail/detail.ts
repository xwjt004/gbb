import { request } from '../../../utils/request';
import { getImageUrl } from '../../../utils/image';

/**
 * 订单详情页
 * 功能：展示订单详细信息，包括状态时间线、地址、商品、预约信息、金额明细
 */

// 订单状态文本映射
const ORDER_STATUS_TEXT: Record<string, string> = {
  'PENDING': '待确认',
  'CONFIRMED': '已确认',
  'IN_PROGRESS': '进行中',
  'COMPLETED': '已完成',
  'CANCELLED': '已取消',
  'REFUNDED': '已退款',
};

// 支付状态文本映射（统一使用新格式）
const PAYMENT_STATUS_TEXT: Record<string, string> = {
  'PENDING_PAYMENT': '待支付',
  'PROCESSING': '处理中',
  'PARTIAL_PAID': '部分支付',
  'PAID': '已支付',
  'OVERPAID': '多收款',
  'FREE': '免费订单',
  'FAILED': '支付失败',
  'CANCELLED': '已取消',
  'REFUNDING': '退款中',
  'REFUNDED': '已退款',
};

// 订单状态颜色
const STATUS_COLORS: Record<string, string> = {
  'PENDING': '#ff9800',
  'CONFIRMED': '#2196f3',
  'IN_PROGRESS': '#4caf50',
  'COMPLETED': '#9e9e9e',
  'CANCELLED': '#f44336',
  'REFUNDED': '#f44336',
};

// 订单状态流程（用于时间线展示）
const STATUS_TIMELINE = [
  { status: 'PENDING', label: '订单待确认', icon: '📝' },
  { status: 'CONFIRMED', label: '订单已确认', icon: '✅' },
  { status: 'IN_PROGRESS', label: '服务进行中', icon: '📸' },
  { status: 'COMPLETED', label: '订单已完成', icon: '🎉' },
];

interface OrderDetail {
  id: string;
  orderNo: string;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  discountAmount: number;
  paymentStatus: string;
  orderStatus: string;
  customerName: string;
  notes: string | null;
  childrenCount: number;
  appointmentDate: string;
  shippingInfo: {
    name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
  } | null;
  coupon: {
    id: string;
    name: string;
    discountType: string;
    discountValue: number;
  } | null;
  items: Array<{
    id: string;
    itemType: string;
    itemName: string;
    itemImage: string | null;
    specification: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  timeSlot?: {
    id: number;
    startTime: string;
    endTime: string;
  };
  createdAt: string;
}

Page({
  data: {
    orderId: '',
    order: null as OrderDetail | null,
    loading: true,
    
    // 状态信息
    orderStatusText: '',
    paymentStatusText: '',
    statusColor: '',
    
    // 时间线
    timeline: STATUS_TIMELINE,
    currentStatusIndex: 0,
    
    // 操作按钮显示控制
    canPay: false,
    canCancel: false,
    canContact: false,
  },

  /**
   * 页面加载
   */
  onLoad(options: { id?: string }) {
    if (options.id) {
      this.setData({ orderId: options.id });
      this.loadOrderDetail();
    } else {
      wx.showToast({
        title: '订单ID缺失',
        icon: 'none',
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 页面显示
   */
  onShow() {
    // 如果从支付页返回，刷新订单状态
    if (this.data.orderId) {
      this.loadOrderDetail();
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadOrderDetail();
  },

  /**
   * 加载订单详情
   */
  async loadOrderDetail() {
    if (!this.data.orderId) return;
    
    this.setData({ loading: true });
    
    try {
      const data = await request({
        url: `/wx-order/${this.data.orderId}`,
        method: 'GET',
        needAuth: true,
      });
      
      // 处理订单状态
      const orderStatusText = ORDER_STATUS_TEXT[data.orderStatus] || data.orderStatus;
      const paymentStatusText = PAYMENT_STATUS_TEXT[data.paymentStatus] || data.paymentStatus;
      const statusColor = STATUS_COLORS[data.orderStatus] || '#9e9e9e';
      
      // 计算当前状态在时间线中的位置
      const currentStatusIndex = STATUS_TIMELINE.findIndex(
        item => item.status === data.orderStatus
      );
      
      // 判断按钮显示
      const canPay = data.orderStatus === 'PENDING' && data.paymentStatus === 'PENDING_PAYMENT';
      const canCancel = data.orderStatus === 'PENDING' || data.orderStatus === 'CONFIRMED';
      const canContact = data.orderStatus === 'IN_PROGRESS' || data.orderStatus === 'COMPLETED';
      
      // 转换订单项中的图片 URL
      const orderWithImages = {
        ...data,
        items: data.items?.map((item: any) => ({
          ...item,
          itemImage: getImageUrl(item.itemImage) || '/images/placeholder.png',
        })) || [],
      };
      
      this.setData({
        order: orderWithImages,
        orderStatusText,
        paymentStatusText,
        statusColor,
        currentStatusIndex,
        canPay,
        canCancel,
        canContact,
        loading: false,
      });
      
      wx.stopPullDownRefresh();
      
    } catch (error: any) {
      console.error('加载订单详情失败:', error);
      
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
      
      wx.showModal({
        title: '加载失败',
        content: error.message || '订单信息加载失败',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        },
      });
    }
  },

  /**
   * 复制订单号
   */
  onCopyOrderNo() {
    if (!this.data.order) return;
    
    wx.setClipboardData({
      data: this.data.order.orderNo,
      success: () => {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success',
        });
      },
    });
  },

  /**
   * 拨打电话
   */
  onCallPhone() {
    if (!this.data.order?.shippingInfo) return;
    
    wx.makePhoneCall({
      phoneNumber: this.data.order.shippingInfo.phone,
    });
  },

  /**
   * 取消订单
   */
  async onCancelOrder() {
    if (!this.data.order) return;
    
    const res = await wx.showModal({
      title: '确认取消',
      content: `确定要取消订单 ${this.data.order.orderNo} 吗？`,
    });
    
    if (!res.confirm) return;
    
    wx.showLoading({ title: '取消中...' });
    
    try {
      await request({
        url: `/wx-order/${this.data.orderId}/cancel`,
        method: 'PUT',
        needAuth: true,
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '订单已取消',
        icon: 'success',
      });
      
      // 刷新订单详情
      setTimeout(() => {
        this.loadOrderDetail();
      }, 1500);
      
    } catch (error: any) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '取消失败',
        icon: 'none',
      });
    }
  },

  /**
   * 去支付
   */
  onPayOrder() {
    const { orderId } = this.data;
    console.log('[OrderDetailPage] 去支付，订单ID:', orderId);
    
    // 跳转到支付页面
    wx.navigateTo({
      url: `/pages/payment/payment?orderId=${orderId}`,
      success: () => {
        console.log('[OrderDetailPage] 跳转支付页面成功');
      },
      fail: (error) => {
        console.error('[OrderDetailPage] 跳转支付页面失败:', error);
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
  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567\n工作时间：9:00-18:00',
      showCancel: false,
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4001234567',
          });
        }
      },
    });
  },

  /**
   * 查看商品详情
   */
  onViewProduct(e: { currentTarget: { dataset: { id: string, type: string } } }) {
    const { id, type } = e.currentTarget.dataset;
    
    if (type === 'PRODUCT') {
      wx.navigateTo({
        url: `/pages/product/detail?id=${id}`,
      });
    } else {
      wx.showToast({
        title: '商品详情页开发中',
        icon: 'none',
      });
    }
  },
});
