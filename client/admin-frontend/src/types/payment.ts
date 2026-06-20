import { BaseEntity } from './common';
import { Order } from './order';
import { User } from './user';

export enum PaymentStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',  // 待支付
  PARTIAL_PAID = 'PARTIAL_PAID',        // 部分支付
  PAID = 'PAID',                        // 已支付
  PENDING = 'PENDING',                  // 处理中（旧版兼容）
  PROCESSING = 'PROCESSING',            // 处理中
  FAILED = 'FAILED',                    // 支付失败
  REFUNDING = 'REFUNDING',              // 退款中
  REFUNDED = 'REFUNDED',                // 已退款
  PARTIAL_REFUNDED = 'PARTIAL_REFUNDED',// 部分退款
  CANCELLED = 'CANCELLED',              // 已取消
}

export enum PaymentMethod {
  WECHAT = 'WECHAT',
  ALIPAY = 'ALIPAY',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export interface Payment extends BaseEntity {
  paymentNo: string;
  orderId: string;
  order?: Order;
  userId: string;
  user?: User;
  amount: number;
  actualAmount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  thirdPartyId?: string;
  thirdPartyData?: any;
  refundAmount: number;
  refundReason?: string;
  notes?: string;
  processedAt?: string;
  refundedAt?: string;
  platformFee: number;
  netAmount: number;
}

export interface PaymentSearchParams {
  paymentNo?: string;
  orderId?: string;
  phone?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  thirdPartyId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaymentStats {
  totalPayments: number;
  successPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalAmount: number;
  totalRefund: number;
  todayAmount: number;
  conversionRate: number;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
  notes?: string;
}
