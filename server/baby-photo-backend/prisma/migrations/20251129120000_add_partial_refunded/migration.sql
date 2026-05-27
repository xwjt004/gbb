-- 添加 PARTIAL_REFUNDED（部分退款）枚举值到 PaymentStatus
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIAL_REFUNDED';

-- 注释：部分退款状态用于订单部分退款后的支付状态
-- 例如：订单总额 1000 元，退款 300 元，剩余 700 元仍然有效
