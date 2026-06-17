import { request } from '../../../utils/request';
import { getImageUrl } from '../../../utils/image';
import { toBeijingDate } from '../../../utils/format';

/**
 * 订单列表页
 * 功能：展示用户的所有订单，支持按状态筛选、下拉刷新、上拉加载
 */

// 个人中心跳转状态 → API过滤参数映射
const PROFILE_STATUS_MAP: Record<string, { label: string; filters: Record<string, string> }> = {
  'PENDING_PAYMENT': { label: '待支付', filters: { paymentStatus: 'PENDING' } },
  'PENDING_SHOOTING': { label: '待拍摄', filters: { orderStatus: 'CONFIRMED' } },
  'PENDING_PICKUP': { label: '待取件', filters: { orderStatus: 'COMPLETED' } },
  'REFUNDING': { label: '售后', filters: { paymentStatus: 'REFUNDING' } },
};

// 订单状态标签配置
const STATUS_TABS = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING', label: '待付款' },
  { key: 'CONFIRMED', label: '商家已接单' },
  { key: 'IN_PROGRESS', label: '拍摄中' },
  { key: 'COMPLETED', label: '已完成' },
];

// 订单状态文本映射（客户友好版）
const ORDER_STATUS_TEXT: Record<string, string> = {
  'PENDING': '待支付',
  'CONFIRMED': '商家已接单',
  'IN_PROGRESS': '拍摄中',
  'COMPLETED': '已完成',
  'CANCELLED': '已取消',
  'REFUNDED': '已退款',
};

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

// 客户友好状态文本（同时考虑订单状态和支付状态）
function getOrderDisplayStatus(order: { orderStatus: string; paymentStatus: string }): { text: string; color: string } {
  const os = order.orderStatus;
  const ps = order.paymentStatus;

  // 未支付
  if (ps === 'PENDING_PAYMENT' || ps === 'PENDING') {
    return { text: '待支付', color: '#ff9800' };
  }

  // 已支付但商家未确认
  if ((ps === 'FULLY_PAID' || ps === 'PAID') && (os === 'PENDING')) {
    return { text: '待确认', color: '#ff9800' };
  }

  // 已确认/待拍摄
  if (os === 'CONFIRMED') {
    return { text: '待拍摄', color: '#2196f3' };
  }

  // 拍摄中
  if (os === 'IN_PROGRESS') {
    return { text: '拍摄中', color: '#4caf50' };
  }

  // 已完成
  if (os === 'COMPLETED') {
    return { text: '已完成', color: '#9e9e9e' };
  }

  // 已取消
  if (os === 'CANCELLED') {
    return { text: '已取消', color: '#f44336' };
  }

  // 退款中
  if (ps === 'REFUNDING') {
    return { text: '退款中', color: '#f44336' };
  }

  if (ps === 'REFUNDED') {
    return { text: '已退款', color: '#f44336' };
  }

  // 兜底
  return { text: os || ps, color: '#9e9e9e' };
}

interface OrderItem {
  id: string;
  orderNo: string;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  discountAmount: number;
  paymentStatus: string;
  orderStatus: string;
  appointmentDate: string;
  itemCount: number;
  items: Array<{
    id: string;
    itemName: string;
    itemImage: string | null;
    quantity: number;
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
    // 状态标签
    statusTabs: STATUS_TABS,
    activeTab: 'ALL',
    
    // 订单列表
    orders: [] as OrderItem[],
    loading: false,
    refreshing: false,
    
    // 分页
    page: 1,
    limit: 10,
    hasMore: true,
    
    // 空状态
    isEmpty: false,
    
    // 标记是否已初始化
    initialized: false,

    // 来自个人中心的状态筛选
    profileFilter: null as { label: string; filters: Record<string, string> } | null,
  },

  /**
   * 页面加载
   */
  onLoad(options: any) {
    console.log('订单列表页加载，参数:', options);

    // 从个人中心跳转时带 status 参数
    const status = options.status as string;
    if (status && PROFILE_STATUS_MAP[status]) {
      const filter = PROFILE_STATUS_MAP[status];
      this.setData({ profileFilter: filter });
      wx.setNavigationBarTitle({ title: filter.label });
    }
  },

  /**
   * 页面显示
   */
  onShow() {
    // 检查登录状态
    if (!this.checkLogin()) {
      return;
    }
    
    // 首次加载或从其他页面返回时刷新
    if (!this.data.initialized) {
      this.setData({ initialized: true });
      this.refreshOrders();
    } else {
      // 非首次显示，可以选择性刷新
      // 例如：从订单详情返回时刷新
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.route?.includes('order/detail')) {
        this.refreshOrders();
      }
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.refreshOrders();
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadMore();
    }
  },

  /**
   * 检查登录状态
   */
  checkLogin() {
    const token = wx.getStorageSync('accessToken');
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/user/user',
          });
        },
      });
      return false;
    }
    return true;
  },

  /**
   * 切换状态Tab
   */
  async onTabChange(e: { currentTarget: { dataset: { key: string } } }) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.activeTab) return;
    
    this.setData({
      activeTab: key,
      orders: [],
      page: 1,
      hasMore: true,
    });
    
    await this.loadOrders();
  },

  /**
   * 刷新订单列表
   */
  async refreshOrders() {
    if (!this.checkLogin()) return;
    
    // 防止重复刷新
    if (this.data.refreshing || this.data.loading) {
      console.log('正在刷新中，忽略重复请求');
      return;
    }
    
    this.setData({
      refreshing: true,
      orders: [],
      page: 1,
      hasMore: true,
    });
    
    await this.loadOrders();
    
    this.setData({ refreshing: false });
    wx.stopPullDownRefresh();
  },

  /**
   * 加载更多订单
   */
  async loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    
    this.setData({
      page: this.data.page + 1,
    });
    
    await this.loadOrders();
  },

  /**
   * 加载订单列表
   */
  async loadOrders() {
    if (!this.checkLogin()) return;
    
    // 防止重复加载
    if (this.data.loading) {
      console.log('正在加载中，忽略重复请求');
      return;
    }
    
    this.setData({ loading: true });
    
    try {
      // 构建查询参数
      const params: any = {
        page: this.data.page,
        limit: this.data.limit,
      };

      // 来自个人中心的状态筛选（优先级高于Tab）
      if (this.data.profileFilter) {
        Object.assign(params, this.data.profileFilter.filters);
      } else if (this.data.activeTab !== 'ALL') {
        // 'PENDING' 标签按支付状态过滤（只显示真正未支付的订单）
        if (this.data.activeTab === 'PENDING') {
          params.paymentStatus = 'PENDING_PAYMENT';
        } else {
          params.orderStatus = this.data.activeTab;
        }
      }

      // 调用API
      const data = await request({
        url: '/wx-order/my',
        method: 'GET',
        data: params,
        needAuth: true,
      });
      
      // 处理订单数据
      const newOrders = data.items.map((order: any) => {
        const displayStatus = getOrderDisplayStatus(order);
        return {
          ...order,
          orderStatusText: displayStatus.text,
          paymentStatusText: PAYMENT_STATUS_TEXT[order.paymentStatus] || order.paymentStatus,
          statusColor: displayStatus.color,
          // 北京时间格式化显示
          appointmentDateDisplay: order.appointmentDate
            ? toBeijingDate(order.appointmentDate, 'MM月DD日')
            : '',
          // 转换订单项中的图片 URL
          items: order.items?.map((item: any) => ({
            ...item,
            itemImage: getImageUrl(item.itemImage) || '/images/placeholder.png',
          })) || [],
        };
      });

      // 合并订单列表
      const orders = this.data.page === 1 ? newOrders : [...this.data.orders, ...newOrders];
      
      this.setData({
        orders,
        hasMore: newOrders.length >= this.data.limit,
        isEmpty: orders.length === 0,
        loading: false,
      });
      
    } catch (error: any) {
      console.error('加载订单失败:', error);
      
      this.setData({
        loading: false,
        isEmpty: this.data.orders.length === 0,
      });
      
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 跳转到订单详情
   */
  onOrderTap(e: { currentTarget: { dataset: { id: string } } }) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order/detail/detail?id=${orderId}`,
    });
  },

  /**
   * 取消订单
   */
  async onCancelOrder(e: { currentTarget: { dataset: { id: string, orderno: string } } }) {
    const { id, orderno } = e.currentTarget.dataset;
    
    const res = await wx.showModal({
      title: '确认取消',
      content: `确定要取消订单 ${orderno} 吗？`,
    });
    
    if (!res.confirm) return;
    
    wx.showLoading({ title: '取消中...' });
    
    try {
      await request({
        url: `/wx-order/${id}/cancel`,
        method: 'PUT',
        needAuth: true,
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '订单已取消',
        icon: 'success',
      });
      
      // 刷新列表
      setTimeout(() => {
        this.refreshOrders();
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
   * 删除订单
   */
  async onDeleteOrder(e: { currentTarget: { dataset: { id: string, orderno: string } } }) {
    const { id, orderno } = e.currentTarget.dataset;

    const res = await wx.showModal({
      title: '确认删除',
      content: `确定要删除订单 ${orderno} 吗？删除后不可恢复。`,
    });

    if (!res.confirm) return;

    wx.showLoading({ title: '删除中...' });

    try {
      await request({
        url: `/wx-order/${id}`,
        method: 'DELETE',
        needAuth: true,
      });

      wx.hideLoading();
      wx.showToast({
        title: '订单已删除',
        icon: 'success',
      });

      // 刷新列表
      setTimeout(() => {
        this.refreshOrders();
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
   * 清空所有订单
   */
  async onClearAllOrders() {
    const count = this.data.orders.length;
    if (count === 0) return;

    const res = await wx.showModal({
      title: '清空全部订单',
      content: `确定要清空全部 ${count} 条订单吗？删除后不可恢复。`,
    });

    if (!res.confirm) return;

    wx.showLoading({ title: '清空中...' });

    try {
      await request({
        url: '/wx-order/clear/all',
        method: 'DELETE',
        needAuth: true,
      });

      wx.hideLoading();
      wx.showToast({
        title: '已清空全部订单',
        icon: 'success',
      });

      this.setData({ orders: [], isEmpty: true });
    } catch (error: any) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '清空失败',
        icon: 'none',
      });
    }
  },

  /**
   * 去支付
   */
  onPayOrder(e: { currentTarget: { dataset: { id: string } } }) {
    const orderId = e.currentTarget.dataset.id;
    console.log('[OrderListPage] 去支付，订单ID:', orderId);
    
    // 跳转到支付页面
    wx.navigateTo({
      url: `/pages/payment/payment?orderId=${orderId}`,
      success: () => {
        console.log('[OrderListPage] 跳转支付页面成功');
      },
      fail: (error) => {
        console.error('[OrderListPage] 跳转支付页面失败:', error);
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
      content: '客服电话：0416-5577456\n营业时间：8:30-16:00',
      showCancel: false,
    });
  },

  /**
   * 去逛逛（跳转到商城首页）
   */
  goShopping() {
    wx.switchTab({
      url: '/pages/product/list',
    });
  },
});
