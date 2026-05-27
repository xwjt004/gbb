-- P0 功能数据库迁移
-- 创建日期: 2025-11-29
-- 功能: 支付幂等性、退款原路返回、订单超时处理

-- 1. Payment 表增加幂等性和超时字段
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(255);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "expired_at" TIMESTAMP;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receipt_images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 幂等性键唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_key" ON "payments"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

-- 超时订单查询索引
CREATE INDEX IF NOT EXISTS "payments_expired_at_idx" ON "payments"("expired_at") WHERE "status" = 'PENDING_PAYMENT';

-- 2. Order 表增加超时字段
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deposit_timeout" TIMESTAMP;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "final_timeout" TIMESTAMP;

-- 超时订单查询索引
CREATE INDEX IF NOT EXISTS "orders_deposit_timeout_idx" ON "orders"("deposit_timeout") WHERE "payment_status" = 'PENDING_PAYMENT';
CREATE INDEX IF NOT EXISTS "orders_final_timeout_idx" ON "orders"("final_timeout") WHERE "payment_status" = 'PARTIAL_PAID';

-- 3. 创建 Refund 表（退款记录表）
CREATE TABLE IF NOT EXISTS "refunds" (
    "id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "refund_request_id" VARCHAR(36),
    "order_id" VARCHAR(36) NOT NULL,
    "original_payment_id" VARCHAR(36),
    "refund_amount" DECIMAL(10, 2) NOT NULL,
    "refund_method" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "transaction_id" VARCHAR(255),
    "executed_by" VARCHAR(100),
    "executed_at" TIMESTAMP,
    "retry_count" INTEGER DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "fk_refunds_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_refunds_original_payment" FOREIGN KEY ("original_payment_id") REFERENCES "payments"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_refunds_request" FOREIGN KEY ("refund_request_id") REFERENCES "refund_requests"("id") ON DELETE SET NULL
);

-- Refund 表索引
CREATE INDEX IF NOT EXISTS "refunds_order_id_idx" ON "refunds"("order_id");
CREATE INDEX IF NOT EXISTS "refunds_original_payment_id_idx" ON "refunds"("original_payment_id");
CREATE INDEX IF NOT EXISTS "refunds_status_idx" ON "refunds"("status") WHERE "status" IN ('PENDING', 'PROCESSING', 'RETRY');
CREATE INDEX IF NOT EXISTS "refunds_created_at_idx" ON "refunds"("created_at");

-- 4. 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON "refunds"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 注释
COMMENT ON COLUMN "payments"."idempotency_key" IS '幂等性键，用于防止重复支付';
COMMENT ON COLUMN "payments"."expired_at" IS '支付超时时间';
COMMENT ON COLUMN "payments"."receipt_images" IS '收据图片数组（支持多张）';
COMMENT ON COLUMN "orders"."deposit_timeout" IS '定金支付截止时间';
COMMENT ON COLUMN "orders"."final_timeout" IS '尾款支付截止时间';
COMMENT ON TABLE "refunds" IS '退款记录表（实现原路退回）';
