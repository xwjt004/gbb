-- 添加 refund_to_method 字段到 refund_requests 表
-- 创建日期: 2025-11-29

-- 添加 refund_to_method 字段（如果不存在）
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'refund_requests' 
        AND column_name = 'refund_to_method'
    ) THEN
        ALTER TABLE "refund_requests" ADD COLUMN "refund_to_method" "PaymentMethod";
        
        RAISE NOTICE '✅ refund_to_method 字段已添加到 refund_requests 表';
    ELSE
        RAISE NOTICE 'ℹ️  refund_to_method 字段已存在';
    END IF;
END $$;
