-- 补充迁移：添加 payment_method 字段
-- 创建日期: 2025-11-29

-- 1. 先检查 PaymentMethod 枚举是否存在，如果不存在则创建
DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM (
        'WECHAT_PAY',
        'CASH',
        'WECHAT_TRANSFER',
        'ALIPAY_TRANSFER',
        'BANK_CARD'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        -- 枚举已存在，检查是否需要添加新值
        ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'WECHAT_TRANSFER';
        ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ALIPAY_TRANSFER';
END $$;

-- 2. 添加 payment_method 字段（如果不存在）
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE "payments" ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH';
        
        -- 添加索引
        CREATE INDEX "payments_payment_method_idx" ON "payments"("payment_method");
        
        RAISE NOTICE '✅ payment_method 字段已添加';
    ELSE
        RAISE NOTICE 'ℹ️  payment_method 字段已存在';
    END IF;
END $$;

-- 3. 添加 receipt_image 字段（如果不存在）
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receipt_image" TEXT;

-- 完成提示
DO $$ BEGIN
    RAISE NOTICE '✅ payments 表补充迁移完成';
END $$;
