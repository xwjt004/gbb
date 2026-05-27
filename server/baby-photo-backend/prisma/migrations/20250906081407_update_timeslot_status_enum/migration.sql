/*
  Warnings:

  - The values [ACTIVE,INACTIVE] on the enum `TimeSlotStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TimeSlotStatus_new" AS ENUM ('AVAILABLE', 'BOOKED', 'UNAVAILABLE');
ALTER TABLE "time_slots" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "time_slots" ALTER COLUMN "status" TYPE "TimeSlotStatus_new" USING ("status"::text::"TimeSlotStatus_new");
ALTER TYPE "TimeSlotStatus" RENAME TO "TimeSlotStatus_old";
ALTER TYPE "TimeSlotStatus_new" RENAME TO "TimeSlotStatus";
DROP TYPE "TimeSlotStatus_old";
ALTER TABLE "time_slots" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
COMMIT;

-- AlterTable
ALTER TABLE "time_slots" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
