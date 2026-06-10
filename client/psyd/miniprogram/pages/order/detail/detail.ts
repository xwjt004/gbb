import { request } from '../../../utils/request';
import { getImageUrl } from '../../../utils/image';
import { toBeijingDate } from '../../../utils/format';

/**
 * 订单详情页
 * 功能：展示订单详细信息，包括状态时间线、地址、商品、预约信息、金额明细
 */

// 订单状态文本映射（客户友好版）
function getOrderStatusText(orderStatus: string, paymentStatus: string): string {
  if ((paymentStatus === 'FULLY_PAID' || paymentStatus === 'PAID') && orderStatus === 'PENDING') {
    return '已付款，等待商家确认';
  }
  const map: Record<string, string> = {
    'PENDING': '',
    'CONFIRMED': '商家已接单，等您和宝贝儿，大驾光临',
    'IN_PROGRESS': '拍摄中，请您稍候。。。',
    'COMPLETED': '订单已完成，感谢您的信任和支持！',
    'CANCELLED': '已取消',
    'REFUNDED': '已退款',
  };
  return map[orderStatus] || orderStatus;
}

// 支付状态文本映射
const PAYMENT_STATUS_TEXT: Record<string, string> = {
  'PENDING': '待支付',
  'PENDING_PAYMENT': '待支付',
  'PROCESSING': '处理中',
  'PARTIAL': '部分支付',
  'PARTIAL_PAID': '已付定金',
  'FULLY_PAID': '已付款',
  'PAID': '已付款',
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

/**
 * 根据支付状态获取客户友好的时间线配置
 */
function getTimeline(paymentStatus: string) {
  const isPaid = paymentStatus === 'FULLY_PAID' || paymentStatus === 'PAID';
  const isPartialPaid = paymentStatus === 'PARTIAL_PAID';

  // 未支付：第一步显示"等您付款哟"
  if (!isPaid && !isPartialPaid) {
    return [
      { status: 'PENDING', label: '等您付款哟~', icon: '⏳' },
      { status: 'CONFIRMED', label: '商家已接单', icon: '✅' },
      { status: 'IN_PROGRESS', label: '拍摄中', icon: '📸' },
      { status: 'COMPLETED', label: '订单已完成', icon: '🎉' },
    ];
  }

  // 已付定金
  if (isPartialPaid) {
    return [
      { status: 'PENDING', label: '谢谢您的订金', icon: '💰' },
      { status: 'CONFIRMED', label: '商家已接单', icon: '✅' },
      { status: 'IN_PROGRESS', label: '拍摄中', icon: '📸' },
      { status: 'COMPLETED', label: '订单已完成', icon: '🎉' },
    ];
  }

  // 已付全款
  return [
    { status: 'PENDING', label: '亲，谢谢您的全款', icon: '✅' },
    { status: 'CONFIRMED', label: '商家已接单', icon: '📋' },
    { status: 'IN_PROGRESS', label: '拍摄中', icon: '📸' },
    { status: 'COMPLETED', label: '订单已完成', icon: '🎉' },
  ];
}

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

    // 时间线（根据支付状态动态生成）
    timeline: getTimeline('PENDING_PAYMENT'),
    currentStatusIndex: 0,

    // 操作按钮显示控制
    canPay: false,
    canCancel: false,
    canContact: false,
    canDelete: false,
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
      const orderStatusText = getOrderStatusText(data.orderStatus, data.paymentStatus);
      const paymentStatusText = PAYMENT_STATUS_TEXT[data.paymentStatus] || data.paymentStatus;
      const statusColor = STATUS_COLORS[data.orderStatus] || '#9e9e9e';
      
      // 计算当前状态在时间线中的位置
      const timeline = getTimeline(data.paymentStatus);
      const currentStatusIndex = timeline.findIndex(
        item => item.status === data.orderStatus
      );
      
      // 判断按钮显示
      const canPay = data.orderStatus === 'PENDING' && data.paymentStatus === 'PENDING_PAYMENT';
      const canCancel = data.orderStatus === 'PENDING' || data.orderStatus === 'CONFIRMED';
      const canContact = data.orderStatus === 'IN_PROGRESS' || data.orderStatus === 'COMPLETED';
      const canDelete = data.orderStatus === 'CANCELLED';
      
      // 转换订单项中的图片 URL，添加格式化显示字段
      const orderWithImages = {
        ...data,
        items: data.items?.map((item: any) => ({
          ...item,
          itemImage: getImageUrl(item.itemImage) || '/images/placeholder.png',
        })) || [],
        // 北京时间格式化显示
        appointmentDateDisplay: data.appointmentDate
          ? toBeijingDate(data.appointmentDate, 'YYYY年MM月DD日')
          : '',
        createdAtDisplay: data.createdAt
          ? toBeijingDate(data.createdAt, 'YYYY-MM-DD HH:mm')
          : '',
      };
      
      this.setData({
        order: orderWithImages,
        orderStatusText,
        paymentStatusText,
        statusColor,
        timeline,
        currentStatusIndex,
        canPay,
        canCancel,
        canContact,
        canDelete,
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
   * 删除订单（仅已取消状态）
   */
  async onDeleteOrder() {
    if (!this.data.order) return;

    const res = await wx.showModal({
      title: '确认删除',
      content: `确定要删除订单 ${this.data.order.orderNo} 吗？删除后不可恢复。`,
    });

    if (!res.confirm) return;

    wx.showLoading({ title: '删除中...' });

    try {
      await request({
        url: `/wx-order/${this.data.orderId}`,
        method: 'DELETE',
        needAuth: true,
      });

      wx.hideLoading();
      wx.showToast({
        title: '订单已删除',
        icon: 'success',
      });

      // 返回列表页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error: any) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none',
      });
    }
  },

  /**
   * 联系客服
   */
  onContactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：0416-5577456\n营业时间：8:30-16:00',
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
