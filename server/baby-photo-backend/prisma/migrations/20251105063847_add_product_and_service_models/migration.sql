-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "package_type" VARCHAR(20) NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN     "style" VARCHAR(100),
ADD COLUMN     "theme" VARCHAR(100);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "product_no" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "specification" VARCHAR(100),
    "unit" VARCHAR(20) NOT NULL DEFAULT '件',
    "cost_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sale_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "market_price" DECIMAL(10,2),
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock" INTEGER NOT NULL DEFAULT 10,
    "is_track_stock" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "images" JSONB,
    "attributes" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_items" (
    "id" SERIAL NOT NULL,
    "service_no" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(10,2),
    "price_unit" VARCHAR(20),
    "description" TEXT,
    "duration" INTEGER,
    "requirements" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_products" (
    "id" SERIAL NOT NULL,
    "package_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_services" (
    "id" SERIAL NOT NULL,
    "package_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "is_included" BOOLEAN NOT NULL DEFAULT true,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "extra_charge" DECIMAL(10,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_code_key" ON "product_categories"("code");

-- CreateIndex
CREATE INDEX "product_categories_code_idx" ON "product_categories"("code");

-- CreateIndex
CREATE INDEX "product_categories_is_active_idx" ON "product_categories"("is_active");

-- CreateIndex
CREATE INDEX "product_categories_sort_order_idx" ON "product_categories"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_no_key" ON "products"("product_no");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_product_no_idx" ON "products"("product_no");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_items_service_no_key" ON "service_items"("service_no");

-- CreateIndex
CREATE INDEX "service_items_service_no_idx" ON "service_items"("service_no");

-- CreateIndex
CREATE INDEX "service_items_category_idx" ON "service_items"("category");

-- CreateIndex
CREATE INDEX "service_items_is_active_idx" ON "service_items"("is_active");

-- CreateIndex
CREATE INDEX "package_products_package_id_idx" ON "package_products"("package_id");

-- CreateIndex
CREATE INDEX "package_products_product_id_idx" ON "package_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_products_package_id_product_id_key" ON "package_products"("package_id", "product_id");

-- CreateIndex
CREATE INDEX "package_services_package_id_idx" ON "package_services"("package_id");

-- CreateIndex
CREATE INDEX "package_services_service_id_idx" ON "package_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_services_package_id_service_id_key" ON "package_services"("package_id", "service_id");

-- CreateIndex
CREATE INDEX "packages_package_type_idx" ON "packages"("package_type");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_products" ADD CONSTRAINT "package_products_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_products" ADD CONSTRAINT "package_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_services" ADD CONSTRAINT "package_services_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_services" ADD CONSTRAINT "package_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
