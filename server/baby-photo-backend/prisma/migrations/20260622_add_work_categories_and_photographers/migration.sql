-- CreateTable work_categories
CREATE TABLE IF NOT EXISTS "work_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable photographers
CREATE TABLE IF NOT EXISTS "photographers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "avatar" TEXT,
    "description" TEXT,
    "style" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photographers_pkey" PRIMARY KEY ("id")
);

-- AlterTable photo_albums add new columns
ALTER TABLE "photo_albums" ADD COLUMN IF NOT EXISTS "category_id" INTEGER;
ALTER TABLE "photo_albums" ADD COLUMN IF NOT EXISTS "photographer_id" INTEGER;
ALTER TABLE "photo_albums" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "work_categories_name_key" ON "work_categories"("name");
CREATE INDEX IF NOT EXISTS "work_categories_sort_order_idx" ON "work_categories"("sort_order");
CREATE INDEX IF NOT EXISTS "photographers_status_idx" ON "photographers"("status");
CREATE INDEX IF NOT EXISTS "photographers_sort_order_idx" ON "photographers"("sort_order");
CREATE INDEX IF NOT EXISTS "photo_albums_category_id_idx" ON "photo_albums"("category_id");
CREATE INDEX IF NOT EXISTS "photo_albums_photographer_id_idx" ON "photo_albums"("photographer_id");

-- AddForeignKey
ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "work_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "photographers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
