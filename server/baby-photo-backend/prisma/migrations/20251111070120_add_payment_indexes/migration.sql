-- CreateTable
CREATE TABLE "refund_audits" (
    "id" TEXT NOT NULL,
    "refund_request_id" TEXT,
    "order_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "before_paid" DECIMAL(10,2) NOT NULL,
    "after_paid" DECIMAL(10,2) NOT NULL,
    "operator_id" TEXT,
    "operator_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refund_audits_refund_request_id_idx" ON "refund_audits"("refund_request_id");

-- CreateIndex
CREATE INDEX "refund_audits_order_id_idx" ON "refund_audits"("order_id");

-- CreateIndex
CREATE INDEX "refund_audits_action_idx" ON "refund_audits"("action");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "payments_payment_type_status_idx" ON "payments"("payment_type", "status");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_transaction_id_idx" ON "payments"("transaction_id");

-- AddForeignKey
ALTER TABLE "refund_audits" ADD CONSTRAINT "refund_audits_refund_request_id_fkey" FOREIGN KEY ("refund_request_id") REFERENCES "refund_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
