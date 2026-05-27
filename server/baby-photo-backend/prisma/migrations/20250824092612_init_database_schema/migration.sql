/*
  Warnings:

  - A unique constraint covering the columns `[date,start_time]` on the table `time_slots` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "time_slots" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "time_slots_date_idx" ON "time_slots"("date");

-- CreateIndex
CREATE INDEX "time_slots_is_booked_idx" ON "time_slots"("is_booked");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_date_start_time_key" ON "time_slots"("date", "start_time");

-- CreateIndex
CREATE INDEX "users_openid_idx" ON "users"("openid");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");
