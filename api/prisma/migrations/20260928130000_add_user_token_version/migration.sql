-- Add token version for JWT revocation on password change/reset (AUTH-1).
-- Existing tokens carry no tokenVersion in their payload and are treated as
-- version 0, so they remain valid until the user's next password change.
-- Rollback: ALTER TABLE "users" DROP COLUMN IF EXISTS "tokenVersion";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
