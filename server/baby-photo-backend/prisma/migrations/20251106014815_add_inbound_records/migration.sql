-- CreateTable
CREATE TABLE "inbound_records" (
    "id" TEXT NOT NULL,
    "inbound_no" VARCHAR(50) NOT NULL,
    "in_transit_id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "inbound_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inbound_type" VARCHAR(50) NOT NULL DEFAULT 'PURCHASE',
    "expected_quantity" INTEGER NOT NULL DEFAULT 0,
    "actual_quantity" INTEGER NOT NULL DEFAULT 0,
    "qualified_quantity" INTEGER NOT NULL DEFAULT 0,
    "defective_quantity" INTEGER NOT NULL DEFAULT 0,
    "quality_check_status" TEXT NOT NULL DEFAULT 'PENDING',
    "quality_check_by" VARCHAR(100),
    "quality_check_at" TIMESTAMP(3),
    "quality_check_result" TEXT,
    "quality_check_photos" JSONB,
    "defect_types" JSONB,
    "defect_description" TEXT,
    "inbound_status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmed_by" VARCHAR(100),
    "confirmed_at" TIMESTAMP(3),
    "inventory_updated" BOOLEAN NOT NULL DEFAULT false,
    "inventory_update_at" TIMESTAMP(3),
    "warehouse_id" VARCHAR(100),
    "location_id" VARCHAR(100),
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) DEFAULT 0,
    "package_count" INTEGER DEFAULT 0,
    "package_type" VARCHAR(50),
    "package_condition" VARCHAR(50),
    "temperature" DECIMAL(5,2),
    "humidity" DECIMAL(5,2),
    "rejection_reason" TEXT,
    "return_requested" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbound_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbound_records_inbound_no_key" ON "inbound_records"("inbound_no");

-- CreateIndex
CREATE INDEX "inbound_records_inbound_no_idx" ON "inbound_records"("inbound_no");

-- CreateIndex
CREATE INDEX "inbound_records_in_transit_id_idx" ON "inbound_records"("in_transit_id");

-- CreateIndex
CREATE INDEX "inbound_records_purchase_order_id_idx" ON "inbound_records"("purchase_order_id");

-- CreateIndex
CREATE INDEX "inbound_records_inbound_date_idx" ON "inbound_records"("inbound_date");

-- CreateIndex
CREATE INDEX "inbound_records_quality_check_status_idx" ON "inbound_records"("quality_check_status");

-- CreateIndex
CREATE INDEX "inbound_records_inbound_status_idx" ON "inbound_records"("inbound_status");

-- CreateIndex
CREATE INDEX "inbound_records_inventory_updated_idx" ON "inbound_records"("inventory_updated");

-- AddForeignKey
ALTER TABLE "inbound_records" ADD CONSTRAINT "inbound_records_in_transit_id_fkey" FOREIGN KEY ("in_transit_id") REFERENCES "in_transit_goods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_records" ADD CONSTRAINT "inbound_records_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
