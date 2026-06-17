-- CreateTable: baby_milestones
CREATE TABLE "baby_milestones" (
    "id" TEXT NOT NULL,
    "wx_user_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "record_date" TIMESTAMPTZ,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "hobby" TEXT,
    "photo" TEXT,
    "mom_blessing" TEXT,
    "dad_blessing" TEXT,
    "elder_blessing" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "baby_milestones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "baby_milestones_wx_user_id_idx" ON "baby_milestones"("wx_user_id");
CREATE INDEX "baby_milestones_type_idx" ON "baby_milestones"("type");

ALTER TABLE "baby_milestones" ADD CONSTRAINT "baby_milestones_wx_user_id_fkey"
    FOREIGN KEY ("wx_user_id") REFERENCES "wx_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
