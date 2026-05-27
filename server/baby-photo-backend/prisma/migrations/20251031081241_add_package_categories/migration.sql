-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "category_id" INTEGER;

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

-- CreateIndex
CREATE UNIQUE INDEX "package_categories_name_key" ON "package_categories"("name");

-- CreateIndex
CREATE INDEX "package_categories_status_idx" ON "package_categories"("status");

-- CreateIndex
CREATE INDEX "package_categories_sort_order_idx" ON "package_categories"("sort_order");

-- CreateIndex
CREATE INDEX "packages_category_id_idx" ON "packages"("category_id");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "package_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
