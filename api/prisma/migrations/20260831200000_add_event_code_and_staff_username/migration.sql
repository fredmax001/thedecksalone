-- Add eventCode and onsiteUsername to events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "onsiteUsername" TEXT DEFAULT 'staff';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "eventCode" TEXT;
