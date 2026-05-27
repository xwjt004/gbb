-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_PAYMENT', 'PARTIAL_PAID', 'FULLY_PAID', 'REFUNDING', 'REFUNDED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (PaymentMethod may already exist from 20251129_add_payment_method migration)
DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'WECHAT_PAY', 'ALIPAY', 'BANK_CARD', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN
        -- Add values not present in the previous migration's version
        ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ALIPAY';
        ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'OTHER';
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentMode" AS ENUM ('ONLINE', 'OFFLINE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'BALANCE', 'FULL_PAYMENT', 'REFUND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable orders - convert order_status from TEXT to OrderStatus
ALTER TABLE "orders"
  ALTER COLUMN "order_status" DROP DEFAULT,
  ALTER COLUMN "order_status" TYPE "OrderStatus" USING (
    CASE "order_status"::text
      WHEN 'CREATED' THEN 'PENDING'::"OrderStatus"
      WHEN 'PENDING' THEN 'PENDING'::"OrderStatus"
      WHEN 'PENDING_CONFIRMATION' THEN 'PENDING'::"OrderStatus"
      WHEN 'CONFIRMED' THEN 'CONFIRMED'::"OrderStatus"
      WHEN 'REJECTED' THEN 'REJECTED'::"OrderStatus"
      WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'::"OrderStatus"
      WHEN 'COMPLETED' THEN 'COMPLETED'::"OrderStatus"
      WHEN 'CANCELLED' THEN 'CANCELLED'::"OrderStatus"
      ELSE 'PENDING'::"OrderStatus"
    END
  ),
  ALTER COLUMN "order_status" SET DEFAULT 'PENDING'::"OrderStatus";

-- AlterTable orders - convert payment_status from TEXT to PaymentStatus
ALTER TABLE "orders"
  ALTER COLUMN "payment_status" DROP DEFAULT,
  ALTER COLUMN "payment_status" TYPE "PaymentStatus" USING (
    CASE "payment_status"::text
      WHEN 'CREATED' THEN 'PENDING_PAYMENT'::"PaymentStatus"
      WHEN 'PENDING' THEN 'PENDING_PAYMENT'::"PaymentStatus"
      WHEN 'PENDING_PAYMENT' THEN 'PENDING_PAYMENT'::"PaymentStatus"
      WHEN 'PARTIAL' THEN 'PARTIAL_PAID'::"PaymentStatus"
      WHEN 'PARTIAL_PAID' THEN 'PARTIAL_PAID'::"PaymentStatus"
      WHEN 'PAID' THEN 'FULLY_PAID'::"PaymentStatus"
      WHEN 'FULLY_PAID' THEN 'FULLY_PAID'::"PaymentStatus"
      WHEN 'REFUNDING' THEN 'REFUNDING'::"PaymentStatus"
      WHEN 'REFUNDED' THEN 'REFUNDED'::"PaymentStatus"
      WHEN 'CANCELLED' THEN 'CANCELLED'::"PaymentStatus"
      ELSE 'PENDING_PAYMENT'::"PaymentStatus"
    END
  ),
  ALTER COLUMN "payment_status" SET DEFAULT 'PENDING_PAYMENT'::"PaymentStatus";

-- AlterTable payments - convert status from TEXT to PaymentStatus
ALTER TABLE "payments"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PaymentStatus" USING (
    CASE "status"::text
      WHEN 'CREATED' THEN 'PENDING_PAYMENT'::"PaymentStatus"
      WHEN 'PENDING' THEN 'PENDING_PAYMENT'::"PaymentStatus"
      WHEN 'PENDING_PAYMENT' THEN 'PENDING_PAYMENT'::"PaymentStatus"
      WHEN 'PAID' THEN 'FULLY_PAID'::"PaymentStatus"
      WHEN 'FULLY_PAID' THEN 'FULLY_PAID'::"PaymentStatus"
      WHEN 'FAILED' THEN 'CANCELLED'::"PaymentStatus"
      WHEN 'CANCELLED' THEN 'CANCELLED'::"PaymentStatus"
      ELSE 'PENDING_PAYMENT'::"PaymentStatus"
    END
  ),
  ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT'::"PaymentStatus";

-- AlterTable payments - convert payment_type from TEXT to PaymentType
ALTER TABLE "payments"
  ALTER COLUMN "payment_type" TYPE "PaymentType" USING (
    CASE "payment_type"::text
      WHEN 'DEPOSIT' THEN 'DEPOSIT'::"PaymentType"
      WHEN 'BALANCE' THEN 'BALANCE'::"PaymentType"
      WHEN 'FULL_PAYMENT' THEN 'FULL_PAYMENT'::"PaymentType"
      WHEN 'REFUND' THEN 'REFUND'::"PaymentType"
      ELSE 'FULL_PAYMENT'::"PaymentType"
    END
  );
