-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "business_scope" TEXT,
ADD COLUMN     "douyin_id" VARCHAR(100),
ADD COLUMN     "kuaishou_id" VARCHAR(100),
ADD COLUMN     "legal_person" VARCHAR(100),
ADD COLUMN     "telephone" VARCHAR(50),
ADD COLUMN     "wechat_id" VARCHAR(100),
ADD COLUMN     "xiaohongshu_id" VARCHAR(100);

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
