-- Add event ticket control fields for on-site tools and sales management
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ticketSalesClosed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "showRemainingTickets" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "onsitePassword" TEXT;

-- Ensure existing events get sensible defaults
UPDATE "events" SET "ticketSalesClosed" = false WHERE "ticketSalesClosed" IS NULL;
UPDATE "events" SET "showRemainingTickets" = true WHERE "showRemainingTickets" IS NULL;
