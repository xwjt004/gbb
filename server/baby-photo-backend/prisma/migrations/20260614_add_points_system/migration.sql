-- AlterTable: add points_balance to wx_users
ALTER TABLE "wx_users" ADD COLUMN "points_balance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: points_transactions
CREATE TABLE "points_transactions" (
    "id" TEXT NOT NULL,
    "wx_user_id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "reason" VARCHAR(50) NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "points_transactions_wx_user_id_created_at_idx" ON "points_transactions"("wx_user_id", "created_at");

ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_wx_user_id_fkey"
    FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: points_configs
CREATE TABLE "points_configs" (
    "id" TEXT NOT NULL,
    "photo_upload_cost" INTEGER NOT NULL DEFAULT 50,
    "video_upload_cost" INTEGER NOT NULL DEFAULT 50,
    "video_play_cost" INTEGER NOT NULL DEFAULT 50,
    "purchase_rate" INTEGER NOT NULL DEFAULT 1000,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "points_configs_pkey" PRIMARY KEY ("id")
);

-- Insert default points config
INSERT INTO "points_configs" ("id", "photo_upload_cost", "video_upload_cost", "video_play_cost", "purchase_rate")
VALUES (gen_random_uuid()::text, 50, 50, 50, 1000);
