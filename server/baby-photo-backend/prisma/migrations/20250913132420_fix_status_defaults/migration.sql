-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'PENDING',
ALTER COLUMN "order_status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'PENDING';
