/**
 * 订单状态枚举
 * 注意：与前端 OrderStatus 保持完全一致
 */
export enum OrderStatus {
  PENDING = 'PENDING',           // 待确认
  CONFIRMED = 'CONFIRMED',       // 已确认接单  
  REJECTED = 'REJECTED',         // 已拒绝
  IN_PROGRESS = 'IN_PROGRESS',   // 进行中拍摄中
  COMPLETED = 'COMPLETED',       // 已付款完成
  CANCELLED = 'CANCELLED',       // 已取消取消订单
}

/**
 * 支付状态枚举
 * 注意：与 Prisma 数据库枚举保持完全一致
 */
export enum PaymentStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',    // 待支付
  PARTIAL_PAID = 'PARTIAL_PAID',          // 部分支付（已付定金）
  FULLY_PAID = 'FULLY_PAID',              // 已支付（全款到账）
  REFUNDING = 'REFUNDING',                // 退款中
  PARTIAL_REFUNDED = 'PARTIAL_REFUNDED',  // 部分退款
  REFUNDED = 'REFUNDED',                  // 已退款
  CANCELLED = 'CANCELLED',                // 已取消
  
  // 旧格式别名(向后兼容,前端仍在使用)
  PENDING = 'PENDING_PAYMENT',            // @deprecated 使用 PENDING_PAYMENT
  PARTIAL = 'PARTIAL_PAID',               // @deprecated 使用 PARTIAL_PAID
  PAID = 'FULLY_PAID',                    // @deprecated 使用 FULLY_PAID
  FAILED = 'CANCELLED',                   // @deprecated 使用 CANCELLED
}

/**
 * 状态组合验证映射
 * 定义了哪些订单状态和支付状态的组合是有效的
 */
export const VALID_STATUS_COMBINATIONS = new Map<OrderStatus, PaymentStatus[]>([
  [OrderStatus.PENDING, [PaymentStatus.PENDING_PAYMENT, PaymentStatus.PARTIAL_PAID, PaymentStatus.FULLY_PAID, PaymentStatus.REFUNDING]],
  [OrderStatus.CONFIRMED, [PaymentStatus.PENDING_PAYMENT, PaymentStatus.PARTIAL_PAID, PaymentStatus.FULLY_PAID, PaymentStatus.REFUNDING]],
  [OrderStatus.IN_PROGRESS, [PaymentStatus.PARTIAL_PAID, PaymentStatus.FULLY_PAID, PaymentStatus.REFUNDING]],
  [OrderStatus.COMPLETED, [PaymentStatus.FULLY_PAID, PaymentStatus.REFUNDING, PaymentStatus.PARTIAL_REFUNDED]],
  [OrderStatus.CANCELLED, [PaymentStatus.PENDING_PAYMENT, PaymentStatus.PARTIAL_PAID, PaymentStatus.CANCELLED, PaymentStatus.REFUNDING, PaymentStatus.PARTIAL_REFUNDED, PaymentStatus.REFUNDED]],
]);

/**
 * 状态描述映射
 */
export const STATUS_DESCRIPTIONS = {
  orderStatus: {
    [OrderStatus.PENDING]: '待确认',
    [OrderStatus.CONFIRMED]: '已确认',
    [OrderStatus.REJECTED]: '已拒绝',
    [OrderStatus.IN_PROGRESS]: '进行中',
    [OrderStatus.COMPLETED]: '已完成',
    [OrderStatus.CANCELLED]: '已取消',
  },
  paymentStatus: {
    [PaymentStatus.PENDING_PAYMENT]: '待支付',
    [PaymentStatus.PARTIAL_PAID]: '部分支付',
    [PaymentStatus.FULLY_PAID]: '已支付',
    [PaymentStatus.REFUNDING]: '退款中',
    [PaymentStatus.PARTIAL_REFUNDED]: '部分退款',
    [PaymentStatus.REFUNDED]: '已全额退款',
    [PaymentStatus.CANCELLED]: '已取消',
  },
};
