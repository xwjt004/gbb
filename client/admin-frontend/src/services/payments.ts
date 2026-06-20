import { request, simple } from './api';
import { PaymentSearchParams, RefundRequest } from '@/types/payment';
import { PaginationParams } from '@/types/common';

export const paymentService = {
  // 获取支付列表
  getPayments: async (params: PaginationParams & PaymentSearchParams) => {
    try {
      const queryParams: any = {
        page: params.page || 1,
        limit: params.pageSize || 20,
      };
      
      // 添加搜索参数
      if (params.paymentNo) queryParams.paymentNo = params.paymentNo;
      if (params.orderId) queryParams.orderNo = params.orderId;
      if (params.phone) queryParams.phone = params.phone;
      if (params.method) queryParams.paymentType = params.method;
      if (params.thirdPartyId) queryParams.transactionId = params.thirdPartyId;
      if (params.status) {
        // 将前端状态映射到后端状态
        let backendStatus: string = params.status;
        if (params.status === 'PAID') {
          backendStatus = 'FULLY_PAID';
        } else if (params.status === 'PENDING') {
          backendStatus = 'PENDING_PAYMENT';
        }
        queryParams.status = backendStatus;
      }
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.minAmount) queryParams.minAmount = params.minAmount;
      if (params.maxAmount) queryParams.maxAmount = params.maxAmount;
      
      console.log('支付列表API参数:', queryParams);
      
      const response = await simple.get<any>('/payments', { params: queryParams });
      
      const backendData = response.data?.data || response.data || response;
      const payments = (backendData.payments || []).map((payment: any) => ({
        id: payment.payment_id,
        paymentNo: payment.payment_id,
        orderId: payment.order_no,
        order: {
          id: payment.order_info?.order?.id || '',
          orderNo: payment.order_no,
          totalAmount: payment.order_info?.order?.totalAmount || 0,
          paidAmount: payment.order_info?.order?.paidAmount || 0,
        },
        user: {
          phone: payment.order_info?.user?.phone || '',
          nickname: payment.order_info?.user?.nickname || '',
        },
        amount: Number(payment.amount || 0),
        actualAmount: Number(payment.amount || 0),
        method: paymentService.mapPaymentMethod(payment.payment_method),
        status: paymentService.mapPaymentStatus(payment.status),
        thirdPartyId: payment.transaction_id || '',
        refundAmount: Number(payment.refund_amount || payment.refundAmount || 0),
        processedAt: payment.paid_at,
        createdAt: payment.created_at,
        updatedAt: payment.created_at,
      }));
      
      return {
        data: {
          list: payments,
          pagination: {
            current: backendData.pagination?.page || params.page || 1,
            pageSize: backendData.pagination?.limit || params.pageSize || 20,
            total: backendData.pagination?.total || 0,
          },
        },
      };
    } catch (error) {
      console.error('获取支付列表失败:', error);
      throw error;
    }
  },

  // 支付方式映射（后端 Prisma PaymentMethod → 前端 PaymentMethod）
  mapPaymentMethod: (backendMethod: string) => {
    const methodMap: { [key: string]: string } = {
      'WECHAT_PAY': 'WECHAT',
      'WECHAT_TRANSFER': 'WECHAT',
      'ALIPAY_TRANSFER': 'ALIPAY',
      'CASH': 'CASH',
      'BANK_CARD': 'BANK_TRANSFER',
    };
    return methodMap[backendMethod] || '';
  },

  // 支付状态映射
  mapPaymentStatus: (backendStatus: string) => {
    const statusMap: { [key: string]: string } = {
      'PENDING': 'PENDING',
      'PENDING_PAYMENT': 'PENDING',
      'PROCESSING': 'PROCESSING',
      'PAID': 'PAID',
      'SUCCESS': 'PAID',
      'FULLY_PAID': 'PAID',
      'PARTIAL_PAID': 'PENDING',
      'FAILED': 'FAILED',
      'CANCELED': 'CANCELLED',
      'CANCELLED': 'CANCELLED',
      'REFUNDED': 'REFUNDED',
      'PARTIAL_REFUNDED': 'REFUNDED',
      'REFUNDING': 'REFUNDING',
    };
    return statusMap[backendStatus] || 'PENDING';
  },

  // 获取支付详情
  getPaymentById: async (id: string) => {
    try {
      const response = await simple.get<any>(`/payments/${id}`);
      const payment = response.data?.data || response.data;
      
      return {
        data: {
          id: payment.payment_id || payment.id,
          paymentNo: payment.payment_id || payment.id,
          orderId: payment.order_no,
          order: payment.order_info?.order || {},
          user: payment.order_info?.user || {},
          amount: Number(payment.amount || 0),
          actualAmount: Number(payment.amount || 0),
          method: paymentService.mapPaymentMethod(payment.payment_type),
          status: paymentService.mapPaymentStatus(payment.status),
          thirdPartyId: payment.transaction_id || '',
          refundAmount: Number(payment.refund_amount || 0),
          refundReason: payment.refund_reason || '',
          processedAt: payment.paid_at,
          createdAt: payment.created_at,
          updatedAt: payment.created_at,
        }
      };
    } catch (error) {
      console.error('获取支付详情失败:', error);
      throw error;
    }
  },

  // 处理退款
  processRefund: async (refundRequest: RefundRequest) => {
    try {
      const response = await request.post(`/payments/${refundRequest.paymentId}/refund`, {
        refundAmount: refundRequest.amount,
        refundReason: refundRequest.reason,
        notes: refundRequest.notes,
      });
      return response;
    } catch (error) {
      console.error('处理退款失败:', error);
      throw error;
    }
  },

  // 同步第三方支付状态
  syncPaymentStatus: async (id: string) => {
    try {
      const response = await request.post(`/payments/${id}/sync-status`);
      return response;
    } catch (error) {
      console.error('同步支付状态失败:', error);
      throw error;
    }
  },

  // 确认支付（手动确认）
  confirmPayment: async (id: string) => {
    try {
      const response = await request.post(`/payments/${id}/confirm`);
      return response;
    } catch (error) {
      console.error('确认支付失败:', error);
      throw error;
    }
  },

  // 获取订单的支付历史
  getPaymentHistory: async (orderId: string) => {
    try {
      const response = await simple.get<any>(`/payments/orders/${orderId}/history`);
      const backendData = response.data?.data || response.data || [];
      
      // 将后端数据转换为前端格式
      return (Array.isArray(backendData) ? backendData : []).map((payment: any) => ({
        id: payment.payment_id || payment.id,
        paymentNo: payment.payment_id || payment.paymentNo,
        orderId: payment.order_no || payment.orderId,
        orderNo: payment.order_no || payment.orderNo,
        amount: Number(payment.amount || 0),
        refundAmount: Number(payment.refund_amount || payment.refundAmount || 0),
        method: paymentService.mapPaymentMethod(payment.payment_method || payment.paymentMethod),
        status: paymentService.mapPaymentStatus(payment.status),
        thirdPartyId: payment.transaction_id || payment.thirdPartyId || payment.transactionId,
        description: payment.description || payment.notes,
        createdAt: payment.created_at || payment.createdAt,
        paidAt: payment.paid_at || payment.paidAt,
      }));
    } catch (error) {
      console.error('获取支付历史失败:', error);
      // 如果API不存在或失败,返回空数组
      return [];
    }
  },

  // 取消支付
  cancelPayment: (id: string, reason: string) =>
    request.patch(`/payments/${id}/cancel`, { reason }),

  // 获取支付统计
  getPaymentStats: async (params?: { startDate?: string; endDate?: string; paymentType?: string }) => {
    try {
      const response = await simple.get<any>('/payments/statistics/overview', { params });
      const stats = response.data?.data || response.data || {};
      
      return {
        data: {
          totalPayments: stats.totalCount || 0,
          successPayments: stats.successCount || 0,
          totalAmount: Number(stats.totalAmount || 0),
          todayAmount: Number(stats.todayAmount || 0),
          failedPayments: stats.failedCount || 0,
          pendingPayments: stats.pendingCount || 0,
          refundAmount: Number(stats.refundAmount || 0),
          conversionRate: stats.conversionRate || 0,
        },
      };
    } catch (error) {
      console.error('获取支付统计失败:', error);
      // 返回默认数据以防止页面崩溃
      return {
        data: {
          totalPayments: 0,
          successPayments: 0,
          totalAmount: 0,
          todayAmount: 0,
          failedPayments: 0,
          pendingPayments: 0,
          refundAmount: 0,
          conversionRate: 0,
        },
      };
    }
  },

  // 获取对账数据
  getReconciliation: (params: { date: string; platform?: string }) =>
    request.get('/payments/reconciliation', { params }),

  // 导出支付数据
  exportPayments: async (params: PaymentSearchParams): Promise<any[]> => {
    const response = await simple.get<any>('/payments/export', { params });
    return response?.data || [];
  },
  // 创建支付记录
  createPayment: async (data: {
    orderNo: string;
    amount: number;
    paymentType: string;
    description?: string;
  }) => {
    try {
      const response = await request.post('/payments', data);
      return response;
    } catch (error) {
      console.error('创建支付记录失败:', error);
      throw error;
    }
  },

  // 获取支付趋势
  getPaymentTrends: async (period: string = '7d') => {
    try {
      const response = await simple.get<any>('/payments/trends', { params: { period } });
      return response;
    } catch (error) {
      console.error('获取支付趋势失败:', error);
      return {
        data: {
          data: []
        }
      };
    }
  },

  // 获取可疑支付列表（支持新的分页API）
  getSuspiciousPayments: async (params?: {
    type?: 'duplicate' | 'overpayment' | 'system_error' | 'all';
    severity?: 'high' | 'medium' | 'low' | 'all';
    page?: number;
    limit?: number;
  }) => {
    try {
      const queryParams = {
        type: params?.type || 'all',
        severity: params?.severity || 'all',
        page: params?.page || 1,
        limit: params?.limit || 20,
      };
      const response = await simple.get<any>('/payments/suspicious', { params: queryParams });
      const backendData = response.data?.data || response.data || {};
      
      const suspiciousPayments = (backendData.suspiciousPayments || []).map((item: any) => ({
        id: item.paymentId,
        paymentId: item.paymentId,
        orderNo: item.orderNo,
        customer: {
          name: item.customerName,
          phone: item.customerPhone,
        },
        amount: Number(item.amount || 0),
        type: item.type,
        severity: item.severity,
        reason: item.reason,
        detectedAt: item.detectedAt,
        metadata: item.metadata,
      }));
      
      return {
        data: {
          list: suspiciousPayments,
          pagination: backendData.pagination || {
            page: queryParams.page,
            limit: queryParams.limit,
            total: 0,
            totalPages: 0,
          },
        },
      };
    } catch (error) {
      console.error('获取可疑支付列表失败:', error);
      return {
        data: {
          list: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        },
      };
    }
  },

  // 标记可疑支付为已处理
  resolveSuspiciousPayment: async (paymentId: string, notes?: string) => {
    try {
      const response = await request.patch(`/payments/suspicious/${paymentId}/resolve`, { notes });
      return response;
    } catch (error) {
      console.error('标记可疑支付失败:', error);
      throw error;
    }
  },

  // 获取支付元数据（状态、渠道枚举等）
  getPaymentMeta: async () => {
    try {
      const response = await simple.get<any>('/payments/meta');
      return response.data?.data || response.data || {};
    } catch (error) {
      console.error('获取支付元数据失败:', error);
      return {
        paymentStatuses: [],
        orderStatuses: [],
        channels: [],
        descriptions: {},
      };
    }
  },

  // 手动触发对账任务
  triggerReconciliation: async () => {
    try {
      const response = await request.post('/payments/reconciliation/manual');
      return response;
    } catch (error) {
      console.error('触发对账任务失败:', error);
      throw error;
    }
  },
};
