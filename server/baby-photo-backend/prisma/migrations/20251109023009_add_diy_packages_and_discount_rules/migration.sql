-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_package_id_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "diy_package_id" INTEGER,
ALTER COLUMN "package_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "discount_rules" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "min_amount" DECIMAL(65,30) NOT NULL,
    "max_amount" DECIMAL(65,30) NOT NULL,
    "discount_rate" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diy_packages" (
    "id" SERIAL NOT NULL,
    "package_name" TEXT NOT NULL,
    "customer_id" INTEGER,
    "customer_info" JSONB,
    "selected_items" JSONB NOT NULL,
    "original_amount" DECIMAL(65,30) NOT NULL,
    "discount_amount" DECIMAL(65,30) NOT NULL,
    "discount_rate" DECIMAL(65,30) NOT NULL,
    "saved_amount" DECIMAL(65,30) NOT NULL,
    "discount_rule_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diy_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discount_rules_min_amount_max_amount_idx" ON "discount_rules"("min_amount", "max_amount");

-- CreateIndex
CREATE INDEX "discount_rules_is_active_idx" ON "discount_rules"("is_active");

-- CreateIndex
CREATE INDEX "discount_rules_created_at_idx" ON "discount_rules"("created_at");

-- CreateIndex
CREATE INDEX "diy_packages_customer_id_idx" ON "diy_packages"("customer_id");

-- CreateIndex
CREATE INDEX "diy_packages_status_idx" ON "diy_packages"("status");

-- CreateIndex
CREATE INDEX "diy_packages_created_at_idx" ON "diy_packages"("created_at");

-- CreateIndex
CREATE INDEX "diy_packages_expires_at_idx" ON "diy_packages"("expires_at");

-- CreateIndex
CREATE INDEX "diy_packages_discount_rule_id_idx" ON "diy_packages"("discount_rule_id");

-- CreateIndex
CREATE INDEX "orders_diy_package_id_idx" ON "orders"("diy_package_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_diy_package_id_fkey" FOREIGN KEY ("diy_package_id") REFERENCES "diy_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diy_packages" ADD CONSTRAINT "diy_packages_discount_rule_id_fkey" FOREIGN KEY ("discount_rule_id") REFERENCES "discount_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
