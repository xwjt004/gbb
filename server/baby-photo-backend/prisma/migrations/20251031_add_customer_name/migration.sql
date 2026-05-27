-- AddColumn customer_name to orders table
ALTER TABLE "orders" ADD COLUMN "customer_name" TEXT;

-- Add comment
COMMENT ON COLUMN "orders"."customer_name" IS '客户姓名（可选填写）';
