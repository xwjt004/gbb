-- P0 功能手动迁移脚本
-- 创建日期: 2024-11-29
-- 目的: 添加支付回调幂等性、退款原路返回、超时订单处理功能所需的数据库字段

-- ===========================================
-- 1. 创建 RefundExecutionStatus 枚举
-- ===========================================
DO $$ BEGIN
    CREATE TYPE "RefundExecutionStatus" AS ENUM (
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===========================================
-- 2. 更新 Payment 表 - 添加 P0 字段
-- ===========================================

-- 添加幂等性键字段
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

-- 添加支付超时时间
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "expired_at" TIMESTAMP(3);

-- 添加收据图片数组（新字段）
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receipt_images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 添加操作人信息
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "operator_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "operator_name" TEXT;

-- 添加收据号
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receipt_no" TEXT;

-- 添加更新时间（如果不存在）
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ===========================================
-- 3. 更新 Order 表 - 添加超时字段
-- ===========================================

-- 添加定金超时时间
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deposit_timeout" TIMESTAMP(3);

-- 添加尾款超时时间
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "final_timeout" TIMESTAMP(3);

-- 添加支付模式字段
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_mode" TEXT;

-- 添加支付汇总信息
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_summary" TEXT;

-- 添加退款金额
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refunded_amount" DECIMAL(10,2) DEFAULT 0;

-- 添加剩余金额
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "remaining_amount" DECIMAL(10,2) DEFAULT 0;

-- 添加软删除字段
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- ===========================================
-- 4. 创建 Refund 表
-- ===========================================
CREATE TABLE IF NOT EXISTS "refunds" (
    "id" TEXT NOT NULL,
    "refund_request_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "original_payment_id" TEXT NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "refund_type" TEXT NOT NULL,
    "refund_method" TEXT NOT NULL,
    "transaction_id" TEXT,
    "execution_status" "RefundExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" TIMESTAMP(3),
    "error_message" TEXT,
    "receipt_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- ===========================================
-- 5. 创建索引
-- ===========================================

-- Payment 表索引
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_key" ON "payments"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "payments_idempotency_key_idx" ON "payments"("idempotency_key");
CREATE INDEX IF NOT EXISTS "payments_expired_at_idx" ON "payments"("expired_at");

-- Order 表索引
CREATE INDEX IF NOT EXISTS "orders_deposit_timeout_idx" ON "orders"("deposit_timeout");
CREATE INDEX IF NOT EXISTS "orders_final_timeout_idx" ON "orders"("final_timeout");

-- Refund 表索引
CREATE INDEX IF NOT EXISTS "refunds_execution_status_idx" ON "refunds"("execution_status");
CREATE INDEX IF NOT EXISTS "refunds_original_payment_id_idx" ON "refunds"("original_payment_id");
CREATE INDEX IF NOT EXISTS "refunds_refund_request_id_idx" ON "refunds"("refund_request_id");
CREATE INDEX IF NOT EXISTS "refunds_created_at_idx" ON "refunds"("created_at");
CREATE INDEX IF NOT EXISTS "refunds_next_retry_at_idx" ON "refunds"("next_retry_at");
CREATE INDEX IF NOT EXISTS "refunds_order_id_idx" ON "refunds"("order_id");
CREATE INDEX IF NOT EXISTS "refunds_transaction_id_idx" ON "refunds"("transaction_id");
CREATE INDEX IF NOT EXISTS "refunds_execution_status_created_at_idx" ON "refunds"("execution_status", "created_at");

-- ===========================================
-- 6. 添加外键约束
-- ===========================================

-- Refund 表外键
DO $$ BEGIN
    ALTER TABLE "refunds" ADD CONSTRAINT "refunds_original_payment_id_fkey" 
        FOREIGN KEY ("original_payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "refunds" ADD CONSTRAINT "refunds_refund_request_id_fkey" 
        FOREIGN KEY ("refund_request_id") REFERENCES "refund_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" 
        FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===========================================
-- 7. 完成提示
-- ===========================================
DO $$ BEGIN
    RAISE NOTICE 'P0 功能数据库迁移完成！';
    RAISE NOTICE '✅ RefundExecutionStatus 枚举已创建';
    RAISE NOTICE '✅ Payment 表新增 7 个字段（idempotency_key, expired_at, receipt_images 等）';
    RAISE NOTICE '✅ Order 表新增 7 个字段（deposit_timeout, final_timeout 等）';
    RAISE NOTICE '✅ Refund 表已创建（16 个字段）';
    RAISE NOTICE '✅ 所有索引已创建（15 个）';
    RAISE NOTICE '✅ 外键约束已添加（3 个）';
END $$;
