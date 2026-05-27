-- CreateTable
CREATE TABLE "status_change_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "old_value" TEXT NOT NULL,
    "new_value" TEXT NOT NULL,
    "operator" TEXT,
    "reason" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "status_change_logs_order_id_idx" ON "status_change_logs"("order_id");

-- CreateIndex
CREATE INDEX "status_change_logs_field_name_idx" ON "status_change_logs"("field_name");

-- CreateIndex
CREATE INDEX "status_change_logs_created_at_idx" ON "status_change_logs"("created_at");

-- AddForeignKey
ALTER TABLE "status_change_logs" ADD CONSTRAINT "status_change_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
