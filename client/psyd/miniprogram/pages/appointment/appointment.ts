// pages/appointment/appointment.ts
import { requireLogin, requestWithAuth } from '../../utils/auth';

interface StatusTab {
  label: string;
  value: string;
  count: number;
}

interface Appointment {
  id: string;
  orderNo: string;
  type: string;
  packageName: string;
  appointmentDate: string;
  timeSlot: string;
  customerName?: string;
  childrenCount: number;
  status: string;
  statusText: string;
  canCancel: boolean;
  canReschedule: boolean;
  canPay: boolean;
}

Page({
  data: {
    activeTab: 'ALL',
    statusTabs: [
      { label: '全部', value: 'ALL', count: 0 },
      { label: '待支付', value: 'PENDING_PAYMENT', count: 0 },
      { label: '待拍摄', value: 'PENDING_SHOOTING', count: 0 },
      { label: '已完成', value: 'COMPLETED', count: 0 }
    ] as StatusTab[],
    appointments: [] as Appointment[],
    loading: false
  },

  onLoad() {
    console.log('[AppointmentPage] 页面加载');
    
    // 检查登录状态
    if (!requireLogin()) {
      return;
    }

    this.loadAppointments();
    this.loadStatusCount();
  },

  onShow() {
    console.log('[AppointmentPage] 页面显示');
    
    // 检查是否刚刚完成登录
    const app = getApp<IAppOption>();
    const justLoggedIn = app.globalData.justLoggedIn;
    const loginTimestamp = app.globalData.loginTimestamp;
    const timeSinceLogin = Date.now() - loginTimestamp;
    
    // 如果刚登录完成（3秒内），跳过登录检查
    if (justLoggedIn && timeSinceLogin < 3000) {
      console.log('[AppointmentPage] 刚完成登录，跳过登录检查');
      app.globalData.justLoggedIn = false; // 重置标记
      
      // 直接加载数据
      this.loadAppointments();
      this.loadStatusCount();
      return;
    }
    
    // 延迟检查登录状态，避免登录页面 switchTab 返回时的时序问题
    setTimeout(() => {
      // 检查登录状态
      const token = wx.getStorageSync('accessToken');
      if (!token) {
        console.log('[AppointmentPage] 未登录，跳转到登录页');
        requireLogin();
        return;
      }

      // 每次显示时刷新数据
      this.loadAppointments();
      this.loadStatusCount();
    }, 100);
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadAppointments(),
      this.loadStatusCount()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadAppointments() {
    try {
      this.setData({ loading: true });

      // 映射前端业务状态到后端枚举状态
      let orderStatusFilter: string | undefined;
      
      if (this.data.activeTab === 'ALL') {
        orderStatusFilter = undefined; // 不过滤
      } else if (this.data.activeTab === 'PENDING_PAYMENT') {
        // 待支付：查询支付状态为 PENDING 的订单
        // 不设置 orderStatus，而是在后端通过 paymentStatus 过滤
        orderStatusFilter = undefined;
      } else if (this.data.activeTab === 'PENDING_SHOOTING') {
        // 待拍摄：已确认或进行中的订单
        orderStatusFilter = 'CONFIRMED'; // 或 'IN_PROGRESS'
      } else if (this.data.activeTab === 'COMPLETED') {
        orderStatusFilter = 'COMPLETED';
      }

      const requestData: any = {
        page: 1,
        limit: 20
      };

      // 根据 activeTab 决定过滤条件
      if (this.data.activeTab === 'PENDING_PAYMENT') {
        requestData.paymentStatus = 'PENDING';
      } else if (orderStatusFilter) {
        requestData.orderStatus = orderStatusFilter;
      }

      console.log('[AppointmentPage] 请求参数:', requestData);

      const res: any = await requestWithAuth({
        url: `${getApp<IAppOption>().globalData.apiBaseUrl}/wx-order/my`,
        method: 'GET',
        data: requestData
      });

      if (res.statusCode === 200) {
        const orders = res.data.items || [];
        
        const appointments: Appointment[] = orders.map((order: any) => {
          let statusText = '';
          let canCancel = false;
          let canReschedule = false;
          let canPay = false;

          const os = order.orderStatus;
          const ps = order.paymentStatus;

          if (ps === 'PENDING_PAYMENT' || ps === 'PENDING') {
            statusText = '待支付';
            canCancel = true;
            canPay = true;
          } else if ((ps === 'FULLY_PAID' || ps === 'PAID') && os === 'PENDING') {
            statusText = '待确认';
            canCancel = true;
          } else if (os === 'CONFIRMED') {
            statusText = '待拍摄';
            canReschedule = true;
          } else if (os === 'IN_PROGRESS') {
            statusText = '拍摄中';
          } else if (os === 'COMPLETED') {
            statusText = '已完成';
          } else if (os === 'CANCELLED') {
            statusText = '已取消';
          } else if (ps === 'REFUNDING') {
            statusText = '退款中';
          } else if (ps === 'REFUNDED') {
            statusText = '已退款';
          }

          // 格式化预约日期（显示为 YYYY-MM-DD）
          let appointmentDate = '';
          if (order.appointmentDate) {
            try {
              const d = new Date(order.appointmentDate);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              appointmentDate = `${y}-${m}-${day}`;
            } catch (e) {
              appointmentDate = String(order.appointmentDate);
            }
          }

          // 从订单项获取套系名称（取第一个项的 itemName）
          const packageName = order.items && order.items.length > 0
            ? order.items[0].itemName
            : this.getOrderTypeName(order.items);

          return {
            id: order.id,
            orderNo: order.orderNo,
            type: this.getOrderTypeName(order.items),
            packageName,
            appointmentDate,
            timeSlot: order.timeSlot ? `${order.timeSlot.startTime} - ${order.timeSlot.endTime}` : '',
            customerName: order.customerName,
            childrenCount: order.childrenCount || 1,
            status: order.paymentStatus === 'PENDING' ? 'PENDING_PAYMENT' : order.orderStatus,
            statusText,
            canCancel,
            canReschedule,
            canPay
          };
        });

        this.setData({
          appointments,
          loading: false
        });
      } else {
        throw new Error('获取预约列表失败');
      }
    } catch (error: any) {
      console.error('[AppointmentPage] 加载预约列表失败', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  getOrderTypeName(items: any[]): string {
    if (!items || items.length === 0) return '未知';
    
    const firstItem = items[0];
    if (firstItem.itemType === 'PACKAGE') {
      return '套系拍摄';
    } else if (firstItem.itemType === 'PRODUCT') {
      return '商品订单';
    } else if (firstItem.itemType === 'DIY_COMPONENT') {
      return 'DIY定制';
    }
    
    return '服务订单';
  },

  async loadStatusCount() {
    try {
      const res: any = await requestWithAuth({
        url: `${getApp<IAppOption>().globalData.apiBaseUrl}/wx-order/my`,
        method: 'GET',
        data: {
          page: 1,
          limit: 100
        }
      });

      if (res.statusCode === 200) {
        const orders = res.data.items || [];
        
        let pendingPaymentCount = 0;
        let pendingShootingCount = 0;
        let completedCount = 0;

        orders.forEach((order: any) => {
          if (order.paymentStatus === 'PENDING') {
            pendingPaymentCount++;
          } else if (order.orderStatus === 'CONFIRMED' || order.orderStatus === 'PENDING') {
            pendingShootingCount++;
          } else if (order.orderStatus === 'COMPLETED') {
            completedCount++;
          }
        });

        const statusTabs = [
          { label: '全部', value: 'ALL', count: orders.length },
          { label: '待支付', value: 'PENDING_PAYMENT', count: pendingPaymentCount },
          { label: '待拍摄', value: 'PENDING_SHOOTING', count: pendingShootingCount },
          { label: '已完成', value: 'COMPLETED', count: completedCount }
        ];
        
        this.setData({ statusTabs });
      }
    } catch (error) {
      console.error('[AppointmentPage] 加载统计失败', error);
    }
  },

  onTabChange(e: any) {
    const { value } = e.currentTarget.dataset;
    this.setData({ activeTab: value });
    this.loadAppointments();
  },

  goToPackageBook() {
    wx.navigateTo({ 
      url: '/pages/packages/list/list' 
    });
  },

  goToDiyBook() {
    wx.showToast({ title: 'DIY预约开发中', icon: 'none' });
  },

  goToServiceBook() {
    wx.showToast({ title: '服务预约开发中', icon: 'none' });
  },

  goToPickupBook() {
    wx.showToast({ title: '取件预约开发中', icon: 'none' });
  },

  goToMyAppointments() {
    wx.navigateTo({ url: '/pages/order/list/list' });
  },

  goToAppointmentDetail(e: any) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/order/detail/detail?id=${id}` });
  },

  async cancelAppointment(e: any) {
    const { id } = e.currentTarget.dataset;
    
    const result = await wx.showModal({
      title: '确认取消',
      content: '确定要取消这个预约吗？',
      confirmColor: '#ef4444'
    });

    if (!result.confirm) return;

    wx.showLoading({ title: '取消中...' });

    try {
      const res: any = await requestWithAuth({
        url: `${getApp<IAppOption>().globalData.apiBaseUrl}/wx-order/${id}/cancel`,
        method: 'PATCH'
      });

      wx.hideLoading();

      if (res.statusCode === 200) {
        wx.showToast({ title: '取消成功', icon: 'success' });
        this.loadAppointments();
        this.loadStatusCount();
      } else {
        throw new Error(res.data?.message || '取消失败');
      }
    } catch (error: any) {
      wx.hideLoading();
      console.error('[AppointmentPage] 取消预约失败', error);
      wx.showToast({ title: error.message || '取消失败', icon: 'none' });
    }
  },

  rescheduleAppointment(e: any) {
    const { id } = e.currentTarget.dataset;
    console.log('[AppointmentPage] 改约', id);
    wx.showToast({ title: '改约功能开发中', icon: 'none' });
  },

  payAppointment(e: any) {
    const { id } = e.currentTarget.dataset;
    console.log('[AppointmentPage] 去支付', id);
    wx.showToast({ title: '支付功能开发中', icon: 'none' });
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：0416-5577456\n营业时间：8:30-16:00',
      showCancel: true,
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '0416-5577456' });
        }
      }
    });
  }
});
