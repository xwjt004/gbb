// 统一支付状态枚举(与 Prisma schema 保持一致)
// 注意:这个枚举应该从 @prisma/client 导入,这里保留是为了向后兼容
export enum PaymentStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',      // 待支付
  PARTIAL_PAID = 'PARTIAL_PAID',            // 部分支付(已付定金)
  FULLY_PAID = 'FULLY_PAID',                // 已全额支付
  REFUNDING = 'REFUNDING',                  // 退款处理中
  PARTIAL_REFUNDED = 'PARTIAL_REFUNDED',    // 部分退款
  REFUNDED = 'REFUNDED',                    // 已退款
  CANCELLED = 'CANCELLED',                  // 已取消
  
  // 向后兼容的别名
  PENDING = 'PENDING_PAYMENT',
  PARTIAL = 'PARTIAL_PAID',
  PAID = 'FULLY_PAID',
  PROCESSING = 'PENDING_PAYMENT',
  OVERPAID = 'FULLY_PAID',
  FREE = 'FULLY_PAID',
  FAILED = 'CANCELLED',
}

// 状态显示文本映射
export const PAYMENT_STATUS_TEXT: Record<string, string> = {
  [PaymentStatus.PENDING_PAYMENT]: '待支付',
  [PaymentStatus.PARTIAL_PAID]: '部分支付',
  [PaymentStatus.FULLY_PAID]: '已支付',
  [PaymentStatus.REFUNDING]: '退款中',
  [PaymentStatus.PARTIAL_REFUNDED]: '部分退款',
  [PaymentStatus.REFUNDED]: '已退款',
  [PaymentStatus.CANCELLED]: '已取消',
  // 向后兼容
  'PROCESSING': '处理中',
  'OVERPAID': '多收款',
  'FREE': '免费订单',
  'FAILED': '支付失败',
};

// 前端消费所需的元数据（如需通过接口暴露，可以直接 import 后返回）
export const PAYMENT_STATUS_LIST: Array<{ value: PaymentStatus; label: string }> = Object.values(PaymentStatus).map(v => ({
  value: v as PaymentStatus,
  label: PAYMENT_STATUS_TEXT[v as PaymentStatus]
}));

// 校验辅助:是否为最终终止状态
export const TERMINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.FULLY_PAID,
  PaymentStatus.CANCELLED,
  PaymentStatus.REFUNDED
];

// 外部网关状态映射（SUCCESS -> FULLY_PAID 等）
export function mapGatewayStatus(tradeState: string): PaymentStatus {
  switch (tradeState) {
    case 'SUCCESS':
      return PaymentStatus.FULLY_PAID;
    case 'USERPAYING':
      return PaymentStatus.PENDING_PAYMENT;
    case 'CLOSED':
    case 'REVOKED':
      return PaymentStatus.CANCELLED;
    default:
      return PaymentStatus.PENDING_PAYMENT;
  }
}
