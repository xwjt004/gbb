-- AlterTable: add email, passwordHash, resetToken, resetExpires
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" VARCHAR;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token" VARCHAR;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_expires" TIMESTAMPTZ;
