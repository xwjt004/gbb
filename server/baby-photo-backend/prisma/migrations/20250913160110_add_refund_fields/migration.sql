-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "refund_reason" TEXT,
ADD COLUMN     "refunded_at" TIMESTAMP(3);
