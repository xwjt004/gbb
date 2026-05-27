-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
