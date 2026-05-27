-- CreateTable
CREATE TABLE "purchase_payments" (
    "id" TEXT NOT NULL,
    "payment_no" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_date" DATE NOT NULL,
    "transaction_no" VARCHAR(100),
    "bank_name" VARCHAR(100),
    "bank_account" VARCHAR(50),
    "payee" VARCHAR(100),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmed_by" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "remark" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_refunds" (
    "id" TEXT NOT NULL,
    "refund_no" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "refund_amount" DECIMAL(12,2) NOT NULL,
    "refund_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "applicant_id" INTEGER,
    "applicant_name" VARCHAR(100),
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "approval_remark" TEXT,
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "completed_by" INTEGER,
    "completed_at" TIMESTAMP(3),
    "transaction_no" VARCHAR(100),
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_payments_payment_no_key" ON "purchase_payments"("payment_no");

-- CreateIndex
CREATE INDEX "purchase_payments_payment_no_idx" ON "purchase_payments"("payment_no");

-- CreateIndex
CREATE INDEX "purchase_payments_purchase_order_id_idx" ON "purchase_payments"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_payments_payment_date_idx" ON "purchase_payments"("payment_date");

-- CreateIndex
CREATE INDEX "purchase_payments_status_idx" ON "purchase_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_refunds_refund_no_key" ON "purchase_refunds"("refund_no");

-- CreateIndex
CREATE INDEX "purchase_refunds_refund_no_idx" ON "purchase_refunds"("refund_no");

-- CreateIndex
CREATE INDEX "purchase_refunds_purchase_order_id_idx" ON "purchase_refunds"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_refunds_payment_id_idx" ON "purchase_refunds"("payment_id");

-- CreateIndex
CREATE INDEX "purchase_refunds_status_idx" ON "purchase_refunds"("status");

-- CreateIndex
CREATE INDEX "purchase_refunds_applied_at_idx" ON "purchase_refunds"("applied_at");

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_refunds" ADD CONSTRAINT "purchase_refunds_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_refunds" ADD CONSTRAINT "purchase_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "purchase_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
