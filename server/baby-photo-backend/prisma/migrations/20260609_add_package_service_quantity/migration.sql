-- Add quantity column to package_services
ALTER TABLE "package_services" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;
