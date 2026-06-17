-- CreateTable: baby_milestone_upload_logs
CREATE TABLE "baby_milestone_upload_logs" (
    "id" TEXT NOT NULL,
    "wx_user_id" TEXT NOT NULL,
    "upload_type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "baby_milestone_upload_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "baby_milestone_upload_logs_wx_user_id_created_at_idx" ON "baby_milestone_upload_logs"("wx_user_id", "created_at");

-- CreateTable: baby_milestone_play_logs
CREATE TABLE "baby_milestone_play_logs" (
    "id" TEXT NOT NULL,
    "wx_user_id" TEXT NOT NULL,
    "play_date" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "baby_milestone_play_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "baby_milestone_play_logs_wx_user_id_play_date_idx" ON "baby_milestone_play_logs"("wx_user_id", "play_date");
