-- Add groupBuyDescription field to packages table
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "group_buy_description" TEXT;
