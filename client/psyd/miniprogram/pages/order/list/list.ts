import { request } from '../../../utils/request';
import { getImageUrl } from '../../../utils/image';

/**
 * 订单列表页
 * 功能：展示用户的所有订单，支持按状态筛选、下拉刷新、上拉加载
 */

// 订单状态标签配置
const STATUS_TABS = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING', label: '待付款' },
  { key: 'CONFIRMED', label: '待服务' },
  { key: 'IN_PROGRESS', label: '服务中' },
  { key: 'COMPLETED', label: '已完成' },
];

// 订单状态文本映射
const ORDER_STATUS_TEXT: Record<string, string> = {
  'PENDING': '待确认',
  'CONFIRMED': '已确认',
  'IN_PROGRESS': '进行中',
  'COMPLETED': '已完成',
  'CANCELLED': '已取消',
  'REFUNDED': '已退款',
};

// 支付状态文本映射
const PAYMENT_STATUS_TEXT: Record<string, string> = {
  'PENDING': '待支付',
  'PROCESSING': '处理中',
  'PARTIAL': '部分支付',
  'PAID': '已支付',
  'OVERPAID': '多收款',
  'FREE': '免费订单',
  'FAILED': '支付失败',
  'CANCELLED': '已取消',
  'REFUNDING': '退款中',
  'REFUNDED': '已退款',
};

// 订单状态颜色映射
const STATUS_COLORS: Record<string, string> = {
  'PENDING': '#ff9800',
  'CONFIRMED': '#2196f3',
  'IN_PROGRESS': '#4caf50',
  'COMPLETED': '#9e9e9e',
  'CANCELLED': '#f44336',
  'REFUNDED': '#f44336',
};

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
  },

  /**
   * 页面加载
   */
  onLoad() {
    console.log('订单列表页加载');
    // 不在这里加载数据，等待 onShow
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
      
      // 根据Tab筛选状态
      if (this.data.activeTab !== 'ALL') {
        params.orderStatus = this.data.activeTab;
      }
      
      // 调用API
      const data = await request({
        url: '/wx-order/my',
        method: 'GET',
        data: params,
        needAuth: true,
      });
      
      // 处理订单数据
      const newOrders = data.items.map((order: any) => ({
        ...order,
        orderStatusText: ORDER_STATUS_TEXT[order.orderStatus] || order.orderStatus,
        paymentStatusText: PAYMENT_STATUS_TEXT[order.paymentStatus] || order.paymentStatus,
        statusColor: STATUS_COLORS[order.orderStatus] || '#9e9e9e',
        // 转换订单项中的图片 URL
        items: order.items?.map((item: any) => ({
          ...item,
          itemImage: getImageUrl(item.itemImage) || '/images/placeholder.png',
        })) || [],
      }));
      
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
      content: '客服电话：400-123-4567\n工作时间：9:00-18:00',
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
