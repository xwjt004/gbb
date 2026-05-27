-- CreateEnum
CREATE TYPE "TimeSlotStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "time_slots" ADD COLUMN     "available_count" INTEGER,
ADD COLUMN     "booked_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "is_holiday" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "price_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "status" "TimeSlotStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "time_slots_status_idx" ON "time_slots"("status");
