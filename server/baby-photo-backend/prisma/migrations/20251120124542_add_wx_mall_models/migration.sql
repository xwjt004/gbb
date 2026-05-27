/*
  Warnings:

  - You are about to alter the column `original_amount` on the `diy_packages` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `discount_amount` on the `diy_packages` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `discount_rate` on the `diy_packages` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(5,2)`.
  - You are about to alter the column `saved_amount` on the `diy_packages` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.

*/
-- CreateEnum
CREATE TYPE "WxUserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "CartItemType" AS ENUM ('PRODUCT', 'PACKAGE', 'DIY_COMPONENT');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('REGISTER', 'PROMOTION', 'REBATE', 'BIRTHDAY');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UserCouponStatus" AS ENUM ('UNUSED', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderItemType" AS ENUM ('PRODUCT', 'PACKAGE', 'DIY_PACKAGE', 'SERVICE');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('ADMIN', 'WXAPP', 'H5', 'API');

-- DropForeignKey
ALTER TABLE "purchase_order_items" DROP CONSTRAINT "purchase_order_items_product_id_fkey";

-- AlterTable
ALTER TABLE "diy_packages" ADD COLUMN     "wx_user_id" TEXT,
ALTER COLUMN "original_amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "discount_amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "discount_rate" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "saved_amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "coupon_id" TEXT,
ADD COLUMN     "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shipping_address_id" TEXT,
ADD COLUMN     "shipping_info" JSONB,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "wx_user_id" TEXT;

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "detail_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_on_sale" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sales_volume" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "video_url" TEXT,
ADD COLUMN     "virtual_sales" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "detail_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_on_sale" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sales_volume" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "virtual_sales" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "cost_price" DECIMAL(10,2),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "model" TEXT,
ADD COLUMN     "product_category_id" INTEGER,
ADD COLUMN     "product_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "product_no" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sale_price" DECIMAL(10,2),
ADD COLUMN     "specification" TEXT,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT '件',
ALTER COLUMN "product_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "supplier_rating_history" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_rating_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wx_users" (
    "id" TEXT NOT NULL,
    "openid" TEXT NOT NULL,
    "unionid" TEXT,
    "session_key" TEXT,
    "nickname" TEXT,
    "avatar" TEXT,
    "gender" INTEGER,
    "phone" TEXT,
    "phone_encrypted" TEXT,
    "real_name" TEXT,
    "status" "WxUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "linked_user_id" INTEGER,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "member_level" TEXT NOT NULL DEFAULT 'NORMAL',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wx_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "wx_user_id" TEXT NOT NULL,
    "item_type" "CartItemType" NOT NULL,
    "product_id" INTEGER,
    "package_id" INTEGER,
    "diy_components" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_selected" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_addresses" (
    "id" TEXT NOT NULL,
    "wx_user_id" TEXT NOT NULL,
    "receiver_name" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "province" VARCHAR(50) NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "district" VARCHAR(50) NOT NULL,
    "detail" VARCHAR(200) NOT NULL,
    "postal_code" VARCHAR(10),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "coupon_code" TEXT NOT NULL,
    "coupon_name" TEXT NOT NULL,
    "coupon_type" "CouponType" NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_amount" DECIMAL(10,2),
    "max_discount" DECIMAL(10,2),
    "total_count" INTEGER NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "per_user_limit" INTEGER NOT NULL DEFAULT 1,
    "applicable_type" TEXT NOT NULL DEFAULT 'ALL',
    "applicable_ids" INTEGER[],
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_coupons" (
    "id" TEXT NOT NULL,
    "wx_user_id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "status" "UserCouponStatus" NOT NULL DEFAULT 'UNUSED',
    "used_at" TIMESTAMP(3),
    "order_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "item_type" "OrderItemType" NOT NULL,
    "product_id" INTEGER,
    "package_id" INTEGER,
    "item_name" TEXT NOT NULL,
    "item_image" TEXT,
    "specification" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "diy_meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_rating_history_supplier_id_idx" ON "supplier_rating_history"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "wx_users_openid_key" ON "wx_users"("openid");

-- CreateIndex
CREATE UNIQUE INDEX "wx_users_unionid_key" ON "wx_users"("unionid");

-- CreateIndex
CREATE INDEX "wx_users_openid_idx" ON "wx_users"("openid");

-- CreateIndex
CREATE INDEX "wx_users_phone_idx" ON "wx_users"("phone");

-- CreateIndex
CREATE INDEX "wx_users_status_idx" ON "wx_users"("status");

-- CreateIndex
CREATE INDEX "wx_users_member_level_idx" ON "wx_users"("member_level");

-- CreateIndex
CREATE INDEX "cart_items_wx_user_id_idx" ON "cart_items"("wx_user_id");

-- CreateIndex
CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("product_id");

-- CreateIndex
CREATE INDEX "cart_items_package_id_idx" ON "cart_items"("package_id");

-- CreateIndex
CREATE INDEX "shipping_addresses_wx_user_id_idx" ON "shipping_addresses"("wx_user_id");

-- CreateIndex
CREATE INDEX "shipping_addresses_is_default_idx" ON "shipping_addresses"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_coupon_code_key" ON "coupons"("coupon_code");

-- CreateIndex
CREATE INDEX "coupons_coupon_code_idx" ON "coupons"("coupon_code");

-- CreateIndex
CREATE INDEX "coupons_status_idx" ON "coupons"("status");

-- CreateIndex
CREATE INDEX "coupons_start_time_end_time_idx" ON "coupons"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "user_coupons_wx_user_id_idx" ON "user_coupons"("wx_user_id");

-- CreateIndex
CREATE INDEX "user_coupons_coupon_id_idx" ON "user_coupons"("coupon_id");

-- CreateIndex
CREATE INDEX "user_coupons_status_idx" ON "user_coupons"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_items_package_id_idx" ON "order_items"("package_id");

-- CreateIndex
CREATE INDEX "diy_packages_wx_user_id_idx" ON "diy_packages"("wx_user_id");

-- CreateIndex
CREATE INDEX "orders_wx_user_id_idx" ON "orders"("wx_user_id");

-- CreateIndex
CREATE INDEX "orders_source_idx" ON "orders"("source");

-- CreateIndex
CREATE INDEX "packages_is_on_sale_idx" ON "packages"("is_on_sale");

-- CreateIndex
CREATE INDEX "packages_sales_volume_idx" ON "packages"("sales_volume");

-- CreateIndex
CREATE INDEX "packages_sort_order_idx" ON "packages"("sort_order");

-- CreateIndex
CREATE INDEX "products_is_on_sale_idx" ON "products"("is_on_sale");

-- CreateIndex
CREATE INDEX "products_sales_volume_idx" ON "products"("sales_volume");

-- CreateIndex
CREATE INDEX "products_sort_order_idx" ON "products"("sort_order");

-- CreateIndex
CREATE INDEX "purchase_order_items_product_no_idx" ON "purchase_order_items"("product_no");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_rating_history" ADD CONSTRAINT "supplier_rating_history_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diy_packages" ADD CONSTRAINT "diy_packages_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wx_users" ADD CONSTRAINT "wx_users_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
