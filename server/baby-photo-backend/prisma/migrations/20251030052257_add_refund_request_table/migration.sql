-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('FULL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL', 'CASH', 'BANK');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "refund_no" TEXT NOT NULL,
    "refund_type" "RefundType" NOT NULL DEFAULT 'PARTIAL',
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "refund_reason" TEXT NOT NULL,
    "refund_method" "RefundMethod" NOT NULL DEFAULT 'ORIGINAL',
    "applicant_type" TEXT NOT NULL DEFAULT 'USER',
    "applicant_id" TEXT,
    "applicant_name" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "refunded_by" TEXT,
    "refunded_at" TIMESTAMP(3),
    "transaction_id" TEXT,
    "notes" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_refund_no_key" ON "refund_requests"("refund_no");

-- CreateIndex
CREATE INDEX "refund_requests_order_id_idx" ON "refund_requests"("order_id");

-- CreateIndex
CREATE INDEX "refund_requests_order_no_idx" ON "refund_requests"("order_no");

-- CreateIndex
CREATE INDEX "refund_requests_refund_no_idx" ON "refund_requests"("refund_no");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE INDEX "refund_requests_created_at_idx" ON "refund_requests"("created_at");
