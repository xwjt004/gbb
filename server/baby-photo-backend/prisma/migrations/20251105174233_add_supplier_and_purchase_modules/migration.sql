-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "supplier_no" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_name" VARCHAR(100),
    "contact_person" VARCHAR(100) NOT NULL,
    "contact_phone" VARCHAR(50) NOT NULL,
    "contact_email" VARCHAR(100),
    "address" VARCHAR(500),
    "business_license" VARCHAR(100),
    "tax_id" VARCHAR(100),
    "bank_account" VARCHAR(100),
    "bank_name" VARCHAR(200),
    "supplier_type" TEXT NOT NULL DEFAULT 'PRODUCT',
    "category" VARCHAR(100),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "credit_level" TEXT DEFAULT 'B',
    "payment_terms" VARCHAR(200),
    "delivery_days" INTEGER DEFAULT 7,
    "min_order_amount" DECIMAL(10,2) DEFAULT 0,
    "rating" DOUBLE PRECISION DEFAULT 5.0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remark" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "purchase_no" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "purchase_date" DATE NOT NULL,
    "expected_date" DATE NOT NULL,
    "actual_date" DATE,
    "total_quantity" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shipping_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipping_company" VARCHAR(100),
    "tracking_no" VARCHAR(100),
    "shipping_status" TEXT NOT NULL DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submitter_id" INTEGER,
    "submitted_at" TIMESTAMP(3),
    "approver_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "receiver_id" INTEGER,
    "received_at" TIMESTAMP(3),
    "received_quantity" INTEGER DEFAULT 0,
    "quality_check_status" TEXT DEFAULT 'PENDING',
    "quality_check_remark" TEXT,
    "remark" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "qualified_quantity" INTEGER NOT NULL DEFAULT 0,
    "defective_quantity" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receive_records" (
    "id" TEXT NOT NULL,
    "receive_no" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "receive_date" DATE NOT NULL,
    "receive_quantity" INTEGER NOT NULL,
    "qualified_quantity" INTEGER NOT NULL DEFAULT 0,
    "defective_quantity" INTEGER NOT NULL DEFAULT 0,
    "quality_check_status" TEXT NOT NULL DEFAULT 'PASSED',
    "quality_check_remark" TEXT,
    "inbound_status" TEXT NOT NULL DEFAULT 'PENDING',
    "inbounded_at" TIMESTAMP(3),
    "receiver_id" INTEGER NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receive_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplier_no_key" ON "suppliers"("supplier_no");

-- CreateIndex
CREATE INDEX "suppliers_supplier_no_idx" ON "suppliers"("supplier_no");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE INDEX "suppliers_supplier_type_idx" ON "suppliers"("supplier_type");

-- CreateIndex
CREATE INDEX "suppliers_created_at_idx" ON "suppliers"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_purchase_no_key" ON "purchase_orders"("purchase_no");

-- CreateIndex
CREATE INDEX "purchase_orders_purchase_no_idx" ON "purchase_orders"("purchase_no");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_shipping_status_idx" ON "purchase_orders"("shipping_status");

-- CreateIndex
CREATE INDEX "purchase_orders_purchase_date_idx" ON "purchase_orders"("purchase_date");

-- CreateIndex
CREATE INDEX "purchase_orders_expected_date_idx" ON "purchase_orders"("expected_date");

-- CreateIndex
CREATE INDEX "purchase_orders_submitter_id_idx" ON "purchase_orders"("submitter_id");

-- CreateIndex
CREATE INDEX "purchase_orders_created_at_idx" ON "purchase_orders"("created_at");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_product_id_idx" ON "purchase_order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receive_records_receive_no_key" ON "purchase_receive_records"("receive_no");

-- CreateIndex
CREATE INDEX "purchase_receive_records_receive_no_idx" ON "purchase_receive_records"("receive_no");

-- CreateIndex
CREATE INDEX "purchase_receive_records_purchase_order_id_idx" ON "purchase_receive_records"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_receive_records_receive_date_idx" ON "purchase_receive_records"("receive_date");

-- CreateIndex
CREATE INDEX "purchase_receive_records_inbound_status_idx" ON "purchase_receive_records"("inbound_status");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receive_records" ADD CONSTRAINT "purchase_receive_records_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
