-- DB-1: EventTicket.idempotencyKey (schema.prisma) had NO migration.
--
-- The column is nullable with @unique; prod databases were kept in sync via
-- `prisma db push` (see INFRA-7), so the column may ALREADY exist there.
-- This migration is therefore written idempotently (IF NOT EXISTS) so it
-- applies cleanly both to fresh databases and to prod.
--
-- Rollback:
--   DROP INDEX IF EXISTS "event_tickets_idempotencyKey_key";
--   ALTER TABLE "event_tickets" DROP COLUMN IF EXISTS "idempotencyKey";

-- AlterTable
ALTER TABLE "event_tickets" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "event_tickets_idempotencyKey_key" ON "event_tickets"("idempotencyKey");
