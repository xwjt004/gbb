import { request, simple } from './api';
import { PaginatedResponse } from '@/types/common';
import { Order, OrderStats, OrderFormData } from '@/types/order';

export interface OrderSearchParams {
  status?: string;
  userId?: string;
  packageId?: string;
  dateRange?: [string, string];
  keyword?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  orderNo?: string;
  phone?: string;
}

export interface GetOrdersParams extends OrderSearchParams {
  page?: number;
  pageSize?: number;
}

export const orderService = {
  // 获取订单列表
  async getOrders(params: GetOrdersParams): Promise<{ data: PaginatedResponse<Order> }> {
    // 清理空值参数
    const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    const res = await simple.get<any>('/orders', { params: cleanParams });
    return res; // 保持原结构 { code,message,data:{ list/pagination... } }
  },

  // 创建订单
  async createOrder(data: OrderFormData): Promise<{ data: Order }> {
    const res = await simple.post<any>('/orders', data);
    return res;
  },

  // 更新订单
  async updateOrder(id: string, data: Partial<OrderFormData>): Promise<{ data: Order }> {
    const res = await request.patch(`/orders/${id}`, data);
    return res.data;
  },

  // 获取订单统计
  async getOrderStats(): Promise<{ data: OrderStats }> {
  const res = await simple.get<any>('/orders/stats');
  return res;
  },

  // 确认订单
  async confirmOrder(id: string): Promise<void> {
  await request.post(`/orders/${id}/confirm`); // 使用原 request 保持无 body 简单一致
  },

  // 取消订单
  async cancelOrder(id: string, reason: string): Promise<void> {
  await request.post(`/orders/${id}/cancel`, { reason });
  },

  // 完成订单
  async completeOrder(id: string): Promise<void> {
  await request.post(`/orders/${id}/complete`);
  },

  // 删除订单
  async deleteOrder(id: string): Promise<void> {
    await request.delete(`/orders/${id}`);
  },

  // 获取单个订单详情
  async getOrder(id: string): Promise<{ data: Order }> {
  const res = await simple.get<any>(`/orders/${id}`);
  return res;
  },

  // 通过订单号获取订单详情
  async getOrderByOrderNo(orderNo: string): Promise<{ data: Order }> {
    const res = await simple.get<Order>(`/orders/order-no/${orderNo}`);
    // 后端直接返回订单对象，需要包装成标准格式
    return { data: res as Order };
  },

  // 获取订单历史趋势数据
  async getOrderTrends(period: string = '7d'): Promise<{ data: Array<{ date: string; orders: number; revenue: number }> }> {
    try {
      const res = await simple.get<any>('/orders/trends', { params: { period } });
      return res;
    } catch (error) {
      console.error('获取订单历史趋势数据失败:', error);
      return {
        data: [] as Array<{ date: string; orders: number; revenue: number }>,
      };
    }
  },

  // 根据日期范围获取订单历史趋势数据
  async getOrderTrendsByDateRange(startDate: string, endDate: string): Promise<{ data: Array<{ date: string; orders: number; revenue: number }> }> {
    try {
      const res = await simple.get<any>('/orders/trends', { params: { startDate, endDate } });
      return res;
    } catch (error) {
      console.error('获取订单历史趋势数据失败:', error);
      return {
        data: [] as Array<{ date: string; orders: number; revenue: number }>,
      };
    }
  },

  // 获取未来订单趋势数据(基于预约)
  async getFutureOrderTrends(period: string = '7d'): Promise<{ data: Array<{ date: string; orders: number; revenue: number }> }> {
    try {
      const res = await simple.get<any>('/orders/future-trends', { params: { period } });
      return res;
    } catch (error) {
      console.error('获取未来订单趋势数据失败:', error);
      return {
        data: [] as Array<{ date: string; orders: number; revenue: number }>,
      };
    }
  },

  // 根据日期范围获取未来订单趋势数据(基于预约)
  async getFutureOrderTrendsByDateRange(startDate: string, endDate: string): Promise<{ data: Array<{ date: string; orders: number; revenue: number }> }> {
    try {
      const res = await simple.get<any>('/orders/future-trends', { params: { startDate, endDate } });
      return res;
    } catch (error) {
      console.error('获取未来订单趋势数据失败:', error);
      return {
        data: [] as Array<{ date: string; orders: number; revenue: number }>,
      };
    }
  },

  // 获取资金流趋势数据
  async getCashFlowTrendsByDateRange(startDate: string, endDate: string): Promise<{ 
    data: Array<{ 
      date: string; 
      totalAmount: number; 
      paidAmount: number; 
      unpaidAmount: number; 
      refundRequested: number; 
      refundCompleted: number 
    }> 
  }> {
    try {
      const res = await simple.get<any>('/orders/cashflow-trends', { params: { startDate, endDate } });
      return res;
    } catch (error) {
      console.error('获取资金流趋势数据失败:', error);
      return {
        data: [] as Array<{ 
          date: string; 
          totalAmount: number; 
          paidAmount: number; 
          unpaidAmount: number; 
          refundRequested: number; 
          refundCompleted: number 
        }>,
      };
    }
  },

  // 导出订单数据
  async exportOrders(_params: OrderSearchParams): Promise<Blob> {
    // TODO: 实现导出功能
    return new Blob([''], { type: 'application/json' });
  },

  // 批量操作订单
  async batchOperateOrders(orderIds: string[], action: string): Promise<void> {
  await request.post('/orders/batch', { orderIds, action });
  },

  // 获取订单余额信息
  async getOrderBalance(orderId: string) {
    return request.get(`/payments/orders/${orderId}/balance`);
  },

  // 收取尾款
  async collectBalance(data: {
    orderId: string;
    amount: number;
    paymentType: string;
    notes?: string;
  }) {
    return request.post('/payments/collect-balance', data);
  },

  // 获取订单支付记录
  async getOrderPaymentHistory(orderId: string) {
    return request.get(`/payments/orders/${orderId}/history`);
  },

  // 签到/缺席标记
  async checkinOrder(orderId: string, status: 'CHECKED_IN' | 'NO_SHOW') {
    return simple.patch(`/orders/${orderId}/checkin`, { status });
  },

  // 更换套餐
  async changePackage(orderId: string, newPackageId: number, reason?: string) {
    return simple.post(`/orders/${orderId}/change-package`, { newPackageId, reason });
  },
};

export default orderService;
