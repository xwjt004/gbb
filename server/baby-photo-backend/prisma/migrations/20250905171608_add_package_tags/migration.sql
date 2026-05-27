-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
