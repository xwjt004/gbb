-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TimeSlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('FULL', 'PARTIAL', 'DEPOSIT_ONLY');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL', 'CASH', 'BANK');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundExecutionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('FULL_ONLINE', 'DEPOSIT_ONLINE', 'FULL_OFFLINE', 'DEPOSIT_OFFLINE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'FINAL', 'FULL', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('WECHAT_PAY', 'CASH', 'WECHAT_TRANSFER', 'ALIPAY_TRANSFER', 'BANK_CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_PAYMENT', 'PARTIAL_PAID', 'FULLY_PAID', 'REFUNDING', 'PARTIAL_REFUNDED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

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

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PUSH', 'EMAIL', 'SYSTEM', 'WECHAT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "openid" TEXT NOT NULL,
    "nickname" TEXT,
    "avatar" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role_id" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "deposit" DECIMAL(10,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_id" INTEGER,
    "package_type" VARCHAR(20) NOT NULL DEFAULT 'CUSTOM',
    "style" VARCHAR(100),
    "theme" VARCHAR(100),
    "detail_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_on_sale" BOOLEAN NOT NULL DEFAULT true,
    "sales_volume" INTEGER NOT NULL DEFAULT 0,
    "base_sales" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "video_url" TEXT,
    "virtual_sales" INTEGER NOT NULL DEFAULT 0,
    "promotion_price" DECIMAL(10,2),
    "promotion_start" TIMESTAMP(3),
    "promotion_end" TIMESTAMP(3),
    "group_min_count" INTEGER DEFAULT 0,
    "group_price" DECIMAL(10,2),

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasonal_prices" (
    "id" SERIAL NOT NULL,
    "package_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "label" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasonal_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_sell_packages" (
    "id" SERIAL NOT NULL,
    "source_pkg_id" INTEGER NOT NULL,
    "recommended_pkg_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cross_sell_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_slots" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "is_booked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available_count" INTEGER,
    "booked_count" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 3,
    "is_holiday" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "price_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" "TimeSlotStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "package_id" INTEGER,
    "time_slot_id" INTEGER,
    "appointment_date" TIMESTAMP(3),
    "total_amount" DECIMAL(10,2) NOT NULL,
    "deposit_amount" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "children_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "diy_package_id" INTEGER,
    "coupon_id" TEXT,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shipping_address_id" TEXT,
    "shipping_info" JSONB,
    "source" "OrderSource" NOT NULL DEFAULT 'ADMIN',
    "wx_user_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deposit_timeout" TIMESTAMP(3),
    "final_timeout" TIMESTAMP(3),
    "payment_mode" "PaymentMode" NOT NULL DEFAULT 'FULL_ONLINE',
    "payment_summary" JSONB,
    "refunded_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "order_status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "agreement_accepted" BOOLEAN,
    "agreement_version" TEXT,
    "agreement_accepted_at" TIMESTAMP(3),
    "photographer_id" INTEGER,
    "checkin_status" TEXT NOT NULL DEFAULT 'PENDING',
    "checkin_time" TIMESTAMP(3),
    "reminder_sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "photo_pick_reminder_sent_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "refund_reason" TEXT,
    "refunded_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "idempotency_key" TEXT,
    "operator_id" TEXT,
    "operator_name" TEXT,
    "payment_method" "PaymentMethod" NOT NULL,
    "receipt_image" TEXT,
    "receipt_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "receipt_no" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_change_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "old_value" TEXT NOT NULL,
    "new_value" TEXT NOT NULL,
    "operator" TEXT,
    "reason" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "refund_no" TEXT NOT NULL,
    "refund_type" "RefundType" NOT NULL DEFAULT 'PARTIAL',
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "refund_reason" TEXT NOT NULL,
    "refund_method" "RefundMethod" NOT NULL DEFAULT 'ORIGINAL',
    "applicant_type" TEXT NOT NULL DEFAULT 'USER',
    "applicant_id" TEXT,
    "applicant_name" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "refunded_by" TEXT,
    "refunded_at" TIMESTAMP(3),
    "transaction_id" TEXT,
    "notes" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "refund_to_method" "PaymentMethod",

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "refund_request_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "original_payment_id" TEXT NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "refund_type" TEXT NOT NULL,
    "refund_method" TEXT NOT NULL,
    "transaction_id" TEXT,
    "execution_status" "RefundExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" TIMESTAMP(3),
    "error_message" TEXT,
    "receipt_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

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
    "max_stock" INTEGER,
    "min_stock" INTEGER,
    "reorder_point" INTEGER,
    "safety_stock" INTEGER NOT NULL DEFAULT 0,
    "daily_consumption" INTEGER NOT NULL DEFAULT 0,
    "slow_moving_days" INTEGER NOT NULL DEFAULT 90,
    "brand" VARCHAR(50),
    "model" VARCHAR(50),
    "detail_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_on_sale" BOOLEAN NOT NULL DEFAULT true,
    "sales_volume" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "virtual_sales" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "detail_content" JSONB,
    "base_sales" INTEGER NOT NULL DEFAULT 0,

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
    "images" JSONB,

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
CREATE TABLE "auto_purchase_suggestions" (
    "id" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "current_stock" INTEGER NOT NULL,
    "min_stock" INTEGER NOT NULL,
    "suggested_qty" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_purchase_suggestions_pkey" PRIMARY KEY ("id")
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
    "business_scope" TEXT,
    "douyin_id" VARCHAR(100),
    "kuaishou_id" VARCHAR(100),
    "legal_person" VARCHAR(100),
    "telephone" VARCHAR(50),
    "wechat_id" VARCHAR(100),
    "xiaohongshu_id" VARCHAR(100),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "shop_info" (
    "id" SERIAL NOT NULL,
    "shop_name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "telephone" VARCHAR(50),
    "shop_photo" TEXT,
    "location_map" TEXT,
    "business_scope" TEXT,
    "wechat_id" VARCHAR(100),
    "douyin_id" VARCHAR(100),
    "kuaishou_id" VARCHAR(100),
    "xiaohongshu_id" VARCHAR(100),
    "business_license" VARCHAR(100),
    "business_hours" VARCHAR(200),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_settings" (
    "id" SERIAL NOT NULL,
    "show_shop_name" BOOLEAN NOT NULL DEFAULT true,
    "show_address" BOOLEAN NOT NULL DEFAULT true,
    "show_phone" BOOLEAN NOT NULL DEFAULT true,
    "show_telephone" BOOLEAN NOT NULL DEFAULT false,
    "show_wechat_id" BOOLEAN NOT NULL DEFAULT true,
    "show_douyin_id" BOOLEAN NOT NULL DEFAULT false,
    "show_kuaishou_id" BOOLEAN NOT NULL DEFAULT false,
    "show_xiaohongshu_id" BOOLEAN NOT NULL DEFAULT false,
    "show_business_scope" BOOLEAN NOT NULL DEFAULT true,
    "show_business_hours" BOOLEAN NOT NULL DEFAULT true,
    "footer_font_size" INTEGER NOT NULL DEFAULT 12,
    "footer_align" TEXT NOT NULL DEFAULT 'center',
    "show_divider" BOOLEAN NOT NULL DEFAULT true,
    "custom_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_settings_pkey" PRIMARY KEY ("id")
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
    "product_id" INTEGER,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "qualified_quantity" INTEGER NOT NULL DEFAULT 0,
    "defective_quantity" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "barcode" TEXT,
    "brand" TEXT,
    "cost_price" DECIMAL(10,2),
    "description" TEXT,
    "images" TEXT[],
    "model" TEXT,
    "product_category_id" INTEGER,
    "product_name" TEXT NOT NULL,
    "product_no" TEXT NOT NULL,
    "sale_price" DECIMAL(10,2),
    "specification" TEXT,
    "unit" TEXT NOT NULL,

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
    "original_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "discount_rate" DECIMAL(5,2) NOT NULL,
    "saved_amount" DECIMAL(10,2) NOT NULL,
    "discount_rule_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "wx_user_id" TEXT,

    CONSTRAINT "diy_packages_pkey" PRIMARY KEY ("id")
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
    "birthday" TIMESTAMP(3),
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "zodiac" TEXT,
    "constellation" TEXT,
    "hundred_days_date" TIMESTAMP(3),
    "first_birthday_date" TIMESTAMP(3),
    "grasp_gift" TEXT,
    "hand_foot_print" TEXT,
    "wallet_photo" TEXT,
    "address" TEXT,
    "school_name" TEXT,
    "talent" TEXT,
    "status" "WxUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "linked_user_id" INTEGER,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "member_level" TEXT NOT NULL DEFAULT 'NORMAL',
    "growth_points" INTEGER NOT NULL DEFAULT 0,
    "last_order_at" TIMESTAMP(3),
    "churn_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wx_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "id" TEXT NOT NULL,
    "wx_user_id" TEXT NOT NULL,
    "package_id" INTEGER,
    "product_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "member_levels" (
    "id" SERIAL NOT NULL,
    "level" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "min_growth" INTEGER NOT NULL,
    "max_growth" INTEGER NOT NULL,
    "benefits" JSONB,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "complaint_no" TEXT NOT NULL,
    "wx_user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "handler_id" INTEGER,
    "resolution" TEXT,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "automation_rules" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "trigger" VARCHAR(50) NOT NULL,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "recipient" TEXT,
    "error_message" TEXT,
    "sentAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "operator_id" TEXT,
    "operator_name" TEXT,
    "target_id" TEXT,
    "target_desc" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "params" JSONB,
    "ip" TEXT,
    "duration" INTEGER NOT NULL,
    "status_code" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_segments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "segmentId" TEXT,
    "campaignType" TEXT NOT NULL,
    "couponId" TEXT,
    "title" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "convertedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_tracks" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "wxUserId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "orderId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_openid_key" ON "users"("openid");

-- CreateIndex
CREATE INDEX "users_openid_idx" ON "users"("openid");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_status_idx" ON "roles"("status");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_key" ON "role_permissions"("role_id", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "package_categories_name_key" ON "package_categories"("name");

-- CreateIndex
CREATE INDEX "package_categories_status_idx" ON "package_categories"("status");

-- CreateIndex
CREATE INDEX "package_categories_sort_order_idx" ON "package_categories"("sort_order");

-- CreateIndex
CREATE INDEX "packages_category_id_idx" ON "packages"("category_id");

-- CreateIndex
CREATE INDEX "packages_package_type_idx" ON "packages"("package_type");

-- CreateIndex
CREATE INDEX "packages_is_on_sale_idx" ON "packages"("is_on_sale");

-- CreateIndex
CREATE INDEX "packages_sales_volume_idx" ON "packages"("sales_volume");

-- CreateIndex
CREATE INDEX "packages_sort_order_idx" ON "packages"("sort_order");

-- CreateIndex
CREATE INDEX "seasonal_prices_package_id_start_date_end_date_idx" ON "seasonal_prices"("package_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "cross_sell_packages_source_pkg_id_recommended_pkg_id_key" ON "cross_sell_packages"("source_pkg_id", "recommended_pkg_id");

-- CreateIndex
CREATE INDEX "time_slots_date_idx" ON "time_slots"("date");

-- CreateIndex
CREATE INDEX "time_slots_is_booked_idx" ON "time_slots"("is_booked");

-- CreateIndex
CREATE INDEX "time_slots_status_idx" ON "time_slots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_date_start_time_key" ON "time_slots"("date", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "orders_diy_package_id_idx" ON "orders"("diy_package_id");

-- CreateIndex
CREATE INDEX "orders_wx_user_id_idx" ON "orders"("wx_user_id");

-- CreateIndex
CREATE INDEX "orders_source_idx" ON "orders"("source");

-- CreateIndex
CREATE INDEX "orders_deposit_timeout_idx" ON "orders"("deposit_timeout");

-- CreateIndex
CREATE INDEX "orders_final_timeout_idx" ON "orders"("final_timeout");

-- CreateIndex
CREATE INDEX "orders_checkin_status_idx" ON "orders"("checkin_status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "payments_payment_type_status_idx" ON "payments"("payment_type", "status");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_transaction_id_idx" ON "payments"("transaction_id");

-- CreateIndex
CREATE INDEX "payments_idempotency_key_idx" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_expired_at_idx" ON "payments"("expired_at");

-- CreateIndex
CREATE INDEX "status_change_logs_order_id_idx" ON "status_change_logs"("order_id");

-- CreateIndex
CREATE INDEX "status_change_logs_field_name_idx" ON "status_change_logs"("field_name");

-- CreateIndex
CREATE INDEX "status_change_logs_created_at_idx" ON "status_change_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_refund_no_key" ON "refund_requests"("refund_no");

-- CreateIndex
CREATE INDEX "refund_requests_order_id_idx" ON "refund_requests"("order_id");

-- CreateIndex
CREATE INDEX "refund_requests_order_no_idx" ON "refund_requests"("order_no");

-- CreateIndex
CREATE INDEX "refund_requests_refund_no_idx" ON "refund_requests"("refund_no");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE INDEX "refund_requests_created_at_idx" ON "refund_requests"("created_at");

-- CreateIndex
CREATE INDEX "refund_audits_refund_request_id_idx" ON "refund_audits"("refund_request_id");

-- CreateIndex
CREATE INDEX "refund_audits_order_id_idx" ON "refund_audits"("order_id");

-- CreateIndex
CREATE INDEX "refund_audits_action_idx" ON "refund_audits"("action");

-- CreateIndex
CREATE INDEX "refunds_execution_status_idx" ON "refunds"("execution_status");

-- CreateIndex
CREATE INDEX "refunds_original_payment_id_idx" ON "refunds"("original_payment_id");

-- CreateIndex
CREATE INDEX "refunds_refund_request_id_idx" ON "refunds"("refund_request_id");

-- CreateIndex
CREATE INDEX "refunds_created_at_idx" ON "refunds"("created_at");

-- CreateIndex
CREATE INDEX "refunds_next_retry_at_idx" ON "refunds"("next_retry_at");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE INDEX "refunds_transaction_id_idx" ON "refunds"("transaction_id");

-- CreateIndex
CREATE INDEX "refunds_execution_status_created_at_idx" ON "refunds"("execution_status", "created_at");

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
CREATE INDEX "products_is_on_sale_idx" ON "products"("is_on_sale");

-- CreateIndex
CREATE INDEX "products_sales_volume_idx" ON "products"("sales_volume");

-- CreateIndex
CREATE INDEX "products_sort_order_idx" ON "products"("sort_order");

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
CREATE INDEX "auto_purchase_suggestions_status_created_at_idx" ON "auto_purchase_suggestions"("status", "created_at");

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
CREATE INDEX "supplier_rating_history_supplier_id_idx" ON "supplier_rating_history"("supplier_id");

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
CREATE INDEX "purchase_order_items_product_no_idx" ON "purchase_order_items"("product_no");

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

-- CreateIndex
CREATE INDEX "discount_rules_min_amount_max_amount_idx" ON "discount_rules"("min_amount", "max_amount");

-- CreateIndex
CREATE INDEX "discount_rules_is_active_idx" ON "discount_rules"("is_active");

-- CreateIndex
CREATE INDEX "discount_rules_created_at_idx" ON "discount_rules"("created_at");

-- CreateIndex
CREATE INDEX "diy_packages_customer_id_idx" ON "diy_packages"("customer_id");

-- CreateIndex
CREATE INDEX "diy_packages_wx_user_id_idx" ON "diy_packages"("wx_user_id");

-- CreateIndex
CREATE INDEX "diy_packages_status_idx" ON "diy_packages"("status");

-- CreateIndex
CREATE INDEX "diy_packages_created_at_idx" ON "diy_packages"("created_at");

-- CreateIndex
CREATE INDEX "diy_packages_expires_at_idx" ON "diy_packages"("expires_at");

-- CreateIndex
CREATE INDEX "diy_packages_discount_rule_id_idx" ON "diy_packages"("discount_rule_id");

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
CREATE INDEX "wx_users_churn_status_idx" ON "wx_users"("churn_status");

-- CreateIndex
CREATE INDEX "wx_users_last_order_at_idx" ON "wx_users"("last_order_at");

-- CreateIndex
CREATE INDEX "user_favorites_wx_user_id_idx" ON "user_favorites"("wx_user_id");

-- CreateIndex
CREATE INDEX "user_favorites_package_id_idx" ON "user_favorites"("package_id");

-- CreateIndex
CREATE INDEX "user_favorites_product_id_idx" ON "user_favorites"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_wx_user_id_package_id_key" ON "user_favorites"("wx_user_id", "package_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_wx_user_id_product_id_key" ON "user_favorites"("wx_user_id", "product_id");

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
CREATE UNIQUE INDEX "member_levels_level_key" ON "member_levels"("level");

-- CreateIndex
CREATE INDEX "member_levels_level_idx" ON "member_levels"("level");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_complaint_no_key" ON "complaints"("complaint_no");

-- CreateIndex
CREATE INDEX "complaints_wx_user_id_idx" ON "complaints"("wx_user_id");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_created_at_idx" ON "complaints"("created_at");

-- CreateIndex
CREATE INDEX "complaints_handler_id_idx" ON "complaints"("handler_id");

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
CREATE INDEX "automation_rules_trigger_enabled_idx" ON "automation_rules"("trigger", "enabled");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_items_package_id_idx" ON "order_items"("package_id");

-- CreateIndex
CREATE INDEX "app_notifications_type_idx" ON "app_notifications"("type");

-- CreateIndex
CREATE INDEX "app_notifications_status_idx" ON "app_notifications"("status");

-- CreateIndex
CREATE INDEX "app_notifications_created_at_idx" ON "app_notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_name_key" ON "notification_templates"("name");

-- CreateIndex
CREATE INDEX "operation_logs_module_idx" ON "operation_logs"("module");

-- CreateIndex
CREATE INDEX "operation_logs_operator_id_idx" ON "operation_logs"("operator_id");

-- CreateIndex
CREATE INDEX "operation_logs_created_at_idx" ON "operation_logs"("created_at");

-- CreateIndex
CREATE INDEX "operation_logs_module_created_at_idx" ON "operation_logs"("module", "created_at");

-- CreateIndex
CREATE INDEX "marketing_campaigns_segmentId_idx" ON "marketing_campaigns"("segmentId");

-- CreateIndex
CREATE INDEX "marketing_campaigns_status_idx" ON "marketing_campaigns"("status");

-- CreateIndex
CREATE INDEX "campaign_tracks_campaignId_idx" ON "campaign_tracks"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_tracks_wxUserId_idx" ON "campaign_tracks"("wxUserId");

-- CreateIndex
CREATE INDEX "campaign_tracks_event_idx" ON "campaign_tracks"("event");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "package_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasonal_prices" ADD CONSTRAINT "seasonal_prices_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_sell_packages" ADD CONSTRAINT "cross_sell_packages_source_pkg_id_fkey" FOREIGN KEY ("source_pkg_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_sell_packages" ADD CONSTRAINT "cross_sell_packages_recommended_pkg_id_fkey" FOREIGN KEY ("recommended_pkg_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_diy_package_id_fkey" FOREIGN KEY ("diy_package_id") REFERENCES "diy_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "time_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_change_logs" ADD CONSTRAINT "status_change_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_audits" ADD CONSTRAINT "refund_audits_refund_request_id_fkey" FOREIGN KEY ("refund_request_id") REFERENCES "refund_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_original_payment_id_fkey" FOREIGN KEY ("original_payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_refund_request_id_fkey" FOREIGN KEY ("refund_request_id") REFERENCES "refund_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "stock_outbounds" ADD CONSTRAINT "stock_outbounds_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outbounds" ADD CONSTRAINT "stock_outbounds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outbounds" ADD CONSTRAINT "stock_outbounds_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outbound_items" ADD CONSTRAINT "stock_outbound_items_outbound_id_fkey" FOREIGN KEY ("outbound_id") REFERENCES "stock_outbounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outbound_items" ADD CONSTRAINT "stock_outbound_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_checks" ADD CONSTRAINT "stock_checks_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_checks" ADD CONSTRAINT "stock_checks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_checks" ADD CONSTRAINT "stock_checks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_check_items" ADD CONSTRAINT "stock_check_items_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "stock_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_check_items" ADD CONSTRAINT "stock_check_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_purchase_suggestions" ADD CONSTRAINT "auto_purchase_suggestions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "stock_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_outbound_id_fkey" FOREIGN KEY ("outbound_id") REFERENCES "stock_outbounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_rating_history" ADD CONSTRAINT "supplier_rating_history_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receive_records" ADD CONSTRAINT "purchase_receive_records_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_refunds" ADD CONSTRAINT "purchase_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "purchase_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_refunds" ADD CONSTRAINT "purchase_refunds_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_transit_goods" ADD CONSTRAINT "in_transit_goods_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_records" ADD CONSTRAINT "inbound_records_in_transit_id_fkey" FOREIGN KEY ("in_transit_id") REFERENCES "in_transit_goods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_records" ADD CONSTRAINT "inbound_records_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diy_packages" ADD CONSTRAINT "diy_packages_discount_rule_id_fkey" FOREIGN KEY ("discount_rule_id") REFERENCES "discount_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diy_packages" ADD CONSTRAINT "diy_packages_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wx_users" ADD CONSTRAINT "wx_users_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_wx_user_id_fkey" FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "customer_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_tracks" ADD CONSTRAINT "campaign_tracks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

