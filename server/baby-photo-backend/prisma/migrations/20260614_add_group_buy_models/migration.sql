-- AlterEnum: add GROUP_BUY to CouponType
ALTER TYPE "CouponType" ADD VALUE IF NOT EXISTS 'GROUP_BUY';

-- CreateTable: group_buy_activities
CREATE TABLE "group_buy_activities" (
    "id" TEXT NOT NULL,
    "package_id" INTEGER NOT NULL,
    "creator_user_id" TEXT NOT NULL,
    "min_count" INTEGER NOT NULL DEFAULT 3,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "group_buy_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "group_buy_activities_package_id_idx" ON "group_buy_activities"("package_id");
CREATE INDEX "group_buy_activities_creator_user_id_idx" ON "group_buy_activities"("creator_user_id");
CREATE INDEX "group_buy_activities_status_idx" ON "group_buy_activities"("status");

ALTER TABLE "group_buy_activities" ADD CONSTRAINT "group_buy_activities_package_id_fkey"
    FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_buy_activities" ADD CONSTRAINT "group_buy_activities_creator_user_id_fkey"
    FOREIGN KEY ("creator_user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: group_buy_participants
CREATE TABLE "group_buy_participants" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'JOINED',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_buy_participants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "group_buy_participants_activity_id_idx" ON "group_buy_participants"("activity_id");
CREATE INDEX "group_buy_participants_user_id_idx" ON "group_buy_participants"("user_id");

ALTER TABLE "group_buy_participants" ADD CONSTRAINT "group_buy_participants_activity_id_fkey"
    FOREIGN KEY ("activity_id") REFERENCES "group_buy_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_buy_participants" ADD CONSTRAINT "group_buy_participants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
