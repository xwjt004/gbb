-- AlterTable
ALTER TABLE "products" ADD COLUMN     "max_stock" INTEGER,
ADD COLUMN     "min_stock" INTEGER,
ADD COLUMN     "reorder_point" INTEGER;

-- CreateTable
CREATE TABLE "stock_outbounds" (
    "id" TEXT NOT NULL,
    "outbound_no" TEXT NOT NULL,
    "outbound_type" TEXT NOT NULL,
    "outbound_date" TIMESTAMP(3) NOT NULL,
    "order_id" TEXT,
    "status" TEXT NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "submitter_id" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approver_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "approval_note" TEXT,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_outbounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_outbound_items" (
    "id" TEXT NOT NULL,
    "outbound_id" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_outbound_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_checks" (
    "id" TEXT NOT NULL,
    "check_no" TEXT NOT NULL,
    "check_type" TEXT NOT NULL,
    "check_date" TIMESTAMP(3) NOT NULL,
    "category_id" INTEGER,
    "status" TEXT NOT NULL,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "profit_items" INTEGER NOT NULL DEFAULT 0,
    "loss_items" INTEGER NOT NULL DEFAULT 0,
    "profit_quantity" INTEGER NOT NULL DEFAULT 0,
    "loss_quantity" INTEGER NOT NULL DEFAULT 0,
    "profit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "loss_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "creator_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approver_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "approval_note" TEXT,
    "remark" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_check_items" (
    "id" TEXT NOT NULL,
    "check_id" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "system_quantity" INTEGER NOT NULL,
    "actual_quantity" INTEGER NOT NULL,
    "difference_qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "difference_amount" DECIMAL(10,2) NOT NULL,
    "difference_type" TEXT NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_check_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_alerts" (
    "id" TEXT NOT NULL,
    "alert_no" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "alert_type" TEXT NOT NULL,
    "current_stock" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "handler_id" INTEGER,
    "handled_at" TIMESTAMP(3),
    "handle_note" TEXT,
    "alerted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" TEXT NOT NULL,
    "transaction_no" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "before_stock" INTEGER NOT NULL,
    "after_stock" INTEGER NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "outbound_id" TEXT,
    "check_id" TEXT,
    "operator_id" INTEGER NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_outbounds_outbound_no_key" ON "stock_outbounds"("outbound_no");

-- CreateIndex
CREATE INDEX "stock_outbounds_outbound_no_idx" ON "stock_outbounds"("outbound_no");

-- CreateIndex
CREATE INDEX "stock_outbounds_outbound_type_idx" ON "stock_outbounds"("outbound_type");

-- CreateIndex
CREATE INDEX "stock_outbounds_status_idx" ON "stock_outbounds"("status");

-- CreateIndex
CREATE INDEX "stock_outbounds_outbound_date_idx" ON "stock_outbounds"("outbound_date");

-- CreateIndex
CREATE INDEX "stock_outbounds_order_id_idx" ON "stock_outbounds"("order_id");

-- CreateIndex
CREATE INDEX "stock_outbound_items_outbound_id_idx" ON "stock_outbound_items"("outbound_id");

-- CreateIndex
CREATE INDEX "stock_outbound_items_product_id_idx" ON "stock_outbound_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_checks_check_no_key" ON "stock_checks"("check_no");

-- CreateIndex
CREATE INDEX "stock_checks_check_no_idx" ON "stock_checks"("check_no");

-- CreateIndex
CREATE INDEX "stock_checks_check_type_idx" ON "stock_checks"("check_type");

-- CreateIndex
CREATE INDEX "stock_checks_status_idx" ON "stock_checks"("status");

-- CreateIndex
CREATE INDEX "stock_checks_check_date_idx" ON "stock_checks"("check_date");

-- CreateIndex
CREATE INDEX "stock_checks_category_id_idx" ON "stock_checks"("category_id");

-- CreateIndex
CREATE INDEX "stock_check_items_check_id_idx" ON "stock_check_items"("check_id");

-- CreateIndex
CREATE INDEX "stock_check_items_product_id_idx" ON "stock_check_items"("product_id");

-- CreateIndex
CREATE INDEX "stock_check_items_difference_type_idx" ON "stock_check_items"("difference_type");

-- CreateIndex
CREATE UNIQUE INDEX "stock_alerts_alert_no_key" ON "stock_alerts"("alert_no");

-- CreateIndex
CREATE INDEX "stock_alerts_alert_no_idx" ON "stock_alerts"("alert_no");

-- CreateIndex
CREATE INDEX "stock_alerts_product_id_idx" ON "stock_alerts"("product_id");

-- CreateIndex
CREATE INDEX "stock_alerts_alert_type_idx" ON "stock_alerts"("alert_type");

-- CreateIndex
CREATE INDEX "stock_alerts_status_idx" ON "stock_alerts"("status");

-- CreateIndex
CREATE INDEX "stock_alerts_priority_idx" ON "stock_alerts"("priority");

-- CreateIndex
CREATE INDEX "stock_alerts_alerted_at_idx" ON "stock_alerts"("alerted_at");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transactions_transaction_no_key" ON "stock_transactions"("transaction_no");

-- CreateIndex
CREATE INDEX "stock_transactions_transaction_no_idx" ON "stock_transactions"("transaction_no");

-- CreateIndex
CREATE INDEX "stock_transactions_product_id_created_at_idx" ON "stock_transactions"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_transactions_transaction_type_created_at_idx" ON "stock_transactions"("transaction_type", "created_at");

-- CreateIndex
CREATE INDEX "stock_transactions_ref_type_ref_id_idx" ON "stock_transactions"("ref_type", "ref_id");

-- AddForeignKey
ALTER TABLE "stock_outbounds" ADD CONSTRAINT "stock_outbounds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outbounds" ADD CONSTRAINT "stock_outbounds_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outbounds" ADD CONSTRAINT "stock_outbounds_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outbound_items" ADD CONSTRAINT "stock_outbound_items_outbound_id_fkey" FOREIGN KEY ("outbound_id") REFERENCES "stock_outbounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outbound_items" ADD CONSTRAINT "stock_outbound_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_checks" ADD CONSTRAINT "stock_checks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_checks" ADD CONSTRAINT "stock_checks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_checks" ADD CONSTRAINT "stock_checks_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_check_items" ADD CONSTRAINT "stock_check_items_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "stock_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_check_items" ADD CONSTRAINT "stock_check_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_outbound_id_fkey" FOREIGN KEY ("outbound_id") REFERENCES "stock_outbounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "stock_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
