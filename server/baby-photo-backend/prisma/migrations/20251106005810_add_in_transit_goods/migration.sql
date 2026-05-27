-- CreateTable
CREATE TABLE "in_transit_goods" (
    "id" TEXT NOT NULL,
    "transit_no" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "total_quantity" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipped_date" DATE,
    "shipped_by" VARCHAR(100),
    "shipped_from" VARCHAR(200),
    "shipping_company" VARCHAR(100),
    "tracking_no" VARCHAR(100),
    "shipping_method" TEXT DEFAULT 'LAND',
    "shipping_status" TEXT NOT NULL DEFAULT 'PREPARING',
    "expected_date" DATE NOT NULL,
    "estimated_days" INTEGER DEFAULT 0,
    "actual_date" DATE,
    "actual_days" INTEGER,
    "received_by" VARCHAR(100),
    "received_at" TIMESTAMP(3),
    "received_quantity" INTEGER DEFAULT 0,
    "current_location" VARCHAR(200),
    "last_update_time" TIMESTAMP(3),
    "tracking_history" JSONB,
    "is_delayed" BOOLEAN NOT NULL DEFAULT false,
    "delay_days" INTEGER DEFAULT 0,
    "delay_reason" TEXT,
    "has_exception" BOOLEAN NOT NULL DEFAULT false,
    "exception_type" VARCHAR(50),
    "exception_desc" TEXT,
    "exception_handled" BOOLEAN NOT NULL DEFAULT false,
    "remark" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "in_transit_goods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "in_transit_goods_transit_no_key" ON "in_transit_goods"("transit_no");

-- CreateIndex
CREATE INDEX "in_transit_goods_transit_no_idx" ON "in_transit_goods"("transit_no");

-- CreateIndex
CREATE INDEX "in_transit_goods_purchase_order_id_idx" ON "in_transit_goods"("purchase_order_id");

-- CreateIndex
CREATE INDEX "in_transit_goods_tracking_no_idx" ON "in_transit_goods"("tracking_no");

-- CreateIndex
CREATE INDEX "in_transit_goods_shipping_status_idx" ON "in_transit_goods"("shipping_status");

-- CreateIndex
CREATE INDEX "in_transit_goods_expected_date_idx" ON "in_transit_goods"("expected_date");

-- CreateIndex
CREATE INDEX "in_transit_goods_shipped_date_idx" ON "in_transit_goods"("shipped_date");

-- CreateIndex
CREATE INDEX "in_transit_goods_is_delayed_idx" ON "in_transit_goods"("is_delayed");

-- CreateIndex
CREATE INDEX "in_transit_goods_has_exception_idx" ON "in_transit_goods"("has_exception");

-- AddForeignKey
ALTER TABLE "in_transit_goods" ADD CONSTRAINT "in_transit_goods_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
