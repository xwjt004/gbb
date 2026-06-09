-- AlterTable: add banners and bannerInterval to shop_info
ALTER TABLE "shop_info" ADD COLUMN "banners" JSONB;
ALTER TABLE "shop_info" ADD COLUMN "banner_interval" INTEGER DEFAULT 4000;
