-- Add employee profile fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "real_name" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birth_date" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "education" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "skills" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "work_history" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wechat_official_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "remarks" TEXT;

-- Create unique index on username (nullable for now, backfill in data migration)
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users"("username");

-- Create UserRole junction table
CREATE TABLE IF NOT EXISTS "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id")
);

-- Add foreign key constraints for user_roles
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for user_roles
CREATE INDEX IF NOT EXISTS "user_roles_user_id_idx" ON "user_roles"("user_id");
CREATE INDEX IF NOT EXISTS "user_roles_role_id_idx" ON "user_roles"("role_id");
