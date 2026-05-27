/**
 * 支付系统枚举定义
 * 
 * 本文件定义了支付系统中使用的所有枚举类型
 * 创建日期: 2025-11-26
 */

import { PaymentStatus } from './payment-status.enum';
import { OrderStatus } from './status.enum';

export { PaymentStatus, OrderStatus };

export enum PaymentMode {
  FULL_ONLINE = 'FULL_ONLINE',
  DEPOSIT_ONLINE = 'DEPOSIT_ONLINE',
  FULL_OFFLINE = 'FULL_OFFLINE',
  DEPOSIT_OFFLINE = 'DEPOSIT_OFFLINE',
}

export enum PaymentType {
  DEPOSIT = 'DEPOSIT',
  FINAL = 'FINAL',
  FULL = 'FULL',
  REFUND = 'REFUND',
}

export enum PaymentMethod {
  WECHAT_PAY = 'WECHAT_PAY',
  CASH = 'CASH',
  WECHAT_TRANSFER = 'WECHAT_TRANSFER',
  ALIPAY_TRANSFER = 'ALIPAY_TRANSFER',
  BANK_CARD = 'BANK_CARD',
}

export enum RefundType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  DEPOSIT_ONLY = 'DEPOSIT_ONLY',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const PAYMENT_STATUS_MAPPER: Record<string, PaymentStatus> = {
  'PENDING': PaymentStatus.PENDING_PAYMENT,
  'PENDING_PAYMENT': PaymentStatus.PENDING_PAYMENT,
  'PARTIAL': PaymentStatus.PARTIAL_PAID,
  'PARTIAL_PAID': PaymentStatus.PARTIAL_PAID,
  'PAID': PaymentStatus.FULLY_PAID,
  'FULLY_PAID': PaymentStatus.FULLY_PAID,
  'REFUNDING': PaymentStatus.REFUNDING,
  'REFUNDED': PaymentStatus.REFUNDED,
  'CANCELLED': PaymentStatus.CANCELLED,
};

export const ORDER_STATUS_MAPPER: Record<string, OrderStatus> = {
  'PENDING': OrderStatus.PENDING,
  'CONFIRMED': OrderStatus.CONFIRMED,
  'REJECTED': OrderStatus.REJECTED,
  'IN_PROGRESS': OrderStatus.IN_PROGRESS,
  'COMPLETED': OrderStatus.COMPLETED,
  'CANCELLED': OrderStatus.CANCELLED,
};

export const PAYMENT_STATUS_DISPLAY: Partial<Record<PaymentStatus, string>> = {
  [PaymentStatus.PENDING_PAYMENT]: 'Pending Payment',
  [PaymentStatus.PARTIAL_PAID]: 'Partial Paid',
  [PaymentStatus.FULLY_PAID]: 'Fully Paid',
  [PaymentStatus.REFUNDING]: 'Refunding',
  [PaymentStatus.PARTIAL_REFUNDED]: 'Partial Refunded',
  [PaymentStatus.REFUNDED]: 'Refunded',
  [PaymentStatus.CANCELLED]: 'Cancelled',
};

export const ORDER_STATUS_DISPLAY: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pending',
  [OrderStatus.CONFIRMED]: 'Confirmed',
  [OrderStatus.REJECTED]: 'Rejected',
  [OrderStatus.IN_PROGRESS]: 'In Progress',
  [OrderStatus.COMPLETED]: 'Completed',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

export const PAYMENT_MODE_DISPLAY: Record<PaymentMode, string> = {
  [PaymentMode.FULL_ONLINE]: 'Online Full Payment',
  [PaymentMode.DEPOSIT_ONLINE]: 'Online Deposit + Final',
  [PaymentMode.FULL_OFFLINE]: 'Offline Full Payment',
  [PaymentMode.DEPOSIT_OFFLINE]: 'Offline Deposit + Final',
};

export const PAYMENT_METHOD_DISPLAY: Record<PaymentMethod, string> = {
  [PaymentMethod.WECHAT_PAY]: 'WeChat Pay',
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.WECHAT_TRANSFER]: 'WeChat Transfer',
  [PaymentMethod.ALIPAY_TRANSFER]: 'Alipay Transfer',
  [PaymentMethod.BANK_CARD]: 'Bank Card',
};

export const PAYMENT_TYPE_DISPLAY: Record<PaymentType, string> = {
  [PaymentType.DEPOSIT]: 'Deposit',
  [PaymentType.FINAL]: 'Final Payment',
  [PaymentType.FULL]: 'Full Payment',
  [PaymentType.REFUND]: 'Refund',
};