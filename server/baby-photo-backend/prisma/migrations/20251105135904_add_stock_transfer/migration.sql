-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "transfer_no" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "from_warehouse" TEXT NOT NULL DEFAULT 'MAIN',
    "to_warehouse" TEXT NOT NULL DEFAULT 'BRANCH',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitter_id" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approver_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "reason" TEXT,
    "approval_note" TEXT,
    "shipping_note" TEXT,
    "receiving_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_transfer_no_key" ON "stock_transfers"("transfer_no");

-- CreateIndex
CREATE INDEX "stock_transfers_transfer_no_idx" ON "stock_transfers"("transfer_no");

-- CreateIndex
CREATE INDEX "stock_transfers_product_id_idx" ON "stock_transfers"("product_id");

-- CreateIndex
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");

-- CreateIndex
CREATE INDEX "stock_transfers_submitter_id_idx" ON "stock_transfers"("submitter_id");

-- CreateIndex
CREATE INDEX "stock_transfers_submitted_at_idx" ON "stock_transfers"("submitted_at");

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
