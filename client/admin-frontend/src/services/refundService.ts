import { request } from './api';

// 退款类型
export enum RefundType {
  FULL = 'FULL',      // 全额退款
  PARTIAL = 'PARTIAL', // 部分退款
}

// 退款方式
export enum RefundMethod {
  ORIGINAL = 'ORIGINAL', // 原路退回
  CASH = 'CASH',         // 现金退款
  BANK = 'BANK',         // 银行转账
}

// 退款状态
export enum RefundStatus {
  PENDING = 'PENDING',       // 待审批
  APPROVED = 'APPROVED',     // 已审批
  REJECTED = 'REJECTED',     // 已拒绝
  PROCESSING = 'PROCESSING', // 处理中
  COMPLETED = 'COMPLETED',   // 已完成
  FAILED = 'FAILED',         // 退款失败
  CANCELLED = 'CANCELLED',   // 已取消
}

// 创建退款申请DTO
export interface CreateRefundRequestDto {
  orderNo: string;
  refundType: RefundType;
  refundAmount: number;
  refundReason: string;
  refundMethod?: RefundMethod;
  applicantType?: string;
  applicantId?: string;
  applicantName?: string;
  notes?: string;
  attachments?: string[];
}

// 退款申请对象
export interface RefundRequest {
  id: string;
  orderId: string;
  orderNo: string;
  refundNo: string;
  refundType: RefundType;
  refundAmount: number;
  refundReason: string;
  refundMethod: RefundMethod;
  applicantType: string;
  applicantId?: string;
  applicantName?: string;
  status: RefundStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectReason?: string;
  refundedBy?: string;
  refundedAt?: string;
  transactionId?: string;
  notes?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  // 关联订单的金额信息（用于退款审批时显示剩余可退金额）
  order?: {
    totalAmount: number;  // 订单总额
    paidAmount: number;   // 已付金额
    refundAmount: number; // 已退金额（包含所有已完成的退款）
  };
}

// 查询参数
export interface RefundRequestSearchDto {
  orderNo?: string;
  refundNo?: string;
  status?: RefundStatus;
  applicantId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// 审批DTO
export interface ApproveRefundRequestDto {
  approvedBy?: string;
  notes?: string;
}

// 拒绝DTO
export interface RejectRefundRequestDto {
  rejectedBy?: string;
  rejectReason: string;
}

// 执行退款DTO
export interface ProcessRefundRequestDto {
  refundedBy?: string;
  transactionId?: string;
  notes?: string;
}

// 退款统计
export interface RefundStatistics {
  statusStats: Array<{
    status: RefundStatus;
    _count: { status: number };
    _sum: { refundAmount: number };
  }>;
  completedRefunds: {
    amount: number;
    count: number;
  };
  pendingRefunds: {
    amount: number;
    count: number;
  };
}

class RefundService {
  /**
   * 创建退款申请
   */
  async createRefundRequest(data: CreateRefundRequestDto): Promise<RefundRequest> {
    const response = await request.post('/payments/refund-requests', data);
    // 后端可能返回数组格式，取第一个元素
    const result = response.data.data || response.data;
    return Array.isArray(result) ? result[0] : result;
  }

  /**
   * 判断订单是否存在未处理(待审批/已审批/处理中)的退款申请
   */
  async hasUnresolvedRefund(orderNo: string): Promise<boolean> {
    try {
      const list = await this.getRefundRequestsByOrderNo(orderNo);
      return list.some(r => [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.PROCESSING].includes(r.status));
    } catch (e) {
      return false; // 失败时忽略，交由调用方再处理
    }
  }

  /**
   * 查询退款申请列表
   */
  async getRefundRequests(params?: RefundRequestSearchDto): Promise<{
    data: RefundRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await request.get('/payments/refund-requests', { params });
    // 后端返回格式: { data: [...], total, page, limit, totalPages }
    return response.data as any;
  }

  /**
   * 获取退款申请详情
   */
  async getRefundRequestById(id: string): Promise<RefundRequest> {
    const response = await request.get(`/payments/refund-requests/${id}`);
    return response.data.data || response.data;
  }

  /**
   * 审批通过退款申请
   */
  async approveRefundRequest(
    id: string,
    data?: ApproveRefundRequestDto
  ): Promise<RefundRequest> {
    const response = await request.put(`/payments/refund-requests/${id}/approve`, data || {});
    return response.data.data || response.data;
  }

  /**
   * 拒绝退款申请
   */
  async rejectRefundRequest(
    id: string,
    data: RejectRefundRequestDto
  ): Promise<RefundRequest> {
    const response = await request.put(`/payments/refund-requests/${id}/reject`, data);
    return response.data.data || response.data;
  }

  /**
   * 执行退款
   */
  async processRefundRequest(
    id: string,
    data?: ProcessRefundRequestDto
  ): Promise<RefundRequest> {
    const response = await request.post(`/payments/refund-requests/${id}/process`, data || {});
    return response.data.data || response.data;
  }

  /**
   * 取消退款申请
   */
  async cancelRefundRequest(id: string): Promise<RefundRequest> {
    const response = await request.put(`/payments/refund-requests/${id}/cancel`);
    return response.data.data || response.data;
  }

  /**
   * 获取订单的退款申请列表
   */
  async getRefundRequestsByOrderNo(orderNo: string): Promise<RefundRequest[]> {
    const response = await request.get(`/payments/refund-requests/order/${orderNo}`);
    return response.data.data || response.data;
  }

  /**
   * 获取退款统计信息
   */
  async getRefundStatistics(params?: RefundRequestSearchDto): Promise<RefundStatistics> {
    const response = await request.get('/payments/refund-requests/statistics/summary', { params });
    return response.data.data || response.data;
  }

  /**
   * 获取退款审计历史
   */
  async getRefundAudits(refundRequestId: string): Promise<any[]> {
    const response = await request.get(`/payments/refund-requests/${refundRequestId}/audits`);
    return response.data.data || response.data || [];
  }

  /**
   * 获取退款状态文本
   */
  getStatusText(status: RefundStatus): string {
    const statusMap: Record<RefundStatus, string> = {
      [RefundStatus.PENDING]: '待审批',
      [RefundStatus.APPROVED]: '已审批',
      [RefundStatus.REJECTED]: '已拒绝',
      [RefundStatus.PROCESSING]: '处理中',
      [RefundStatus.COMPLETED]: '已完成',
      [RefundStatus.FAILED]: '退款失败',
      [RefundStatus.CANCELLED]: '已取消',
    };
    return statusMap[status] || status;
  }

  /**
   * 获取退款类型文本
   */
  getTypeText(type: RefundType): string {
    return type === RefundType.FULL ? '全额退款' : '部分退款';
  }

  /**
   * 获取退款方式文本
   */
  getMethodText(method: RefundMethod): string {
    const methodMap: Record<RefundMethod, string> = {
      [RefundMethod.ORIGINAL]: '原路退回',
      [RefundMethod.CASH]: '现金退款',
      [RefundMethod.BANK]: '银行转账',
    };
    return methodMap[method] || method;
  }

  /**
   * 获取状态标签颜色
   */
  getStatusColor(status: RefundStatus): string {
    const colorMap: Record<RefundStatus, string> = {
      [RefundStatus.PENDING]: 'warning',
      [RefundStatus.APPROVED]: 'processing',
      [RefundStatus.REJECTED]: 'error',
      [RefundStatus.PROCESSING]: 'processing',
      [RefundStatus.COMPLETED]: 'success',
      [RefundStatus.FAILED]: 'error',
      [RefundStatus.CANCELLED]: 'default',
    };
    return colorMap[status] || 'default';
  }
}

export const refundService = new RefundService();
export default refundService;
