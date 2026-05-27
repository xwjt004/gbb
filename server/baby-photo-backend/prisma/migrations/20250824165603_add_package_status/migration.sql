-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE';
