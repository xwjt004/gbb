-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PUSH', 'EMAIL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "recipient" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_notifications_type_idx" ON "app_notifications"("type");

-- CreateIndex
CREATE INDEX "app_notifications_status_idx" ON "app_notifications"("status");

-- CreateIndex
CREATE INDEX "app_notifications_created_at_idx" ON "app_notifications"("created_at");
