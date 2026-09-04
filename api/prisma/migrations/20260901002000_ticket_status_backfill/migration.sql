-- Backfill legacy event ticket statuses to current values
UPDATE "event_tickets" SET "status" = 'checked_in' WHERE "status" = 'scanned';
UPDATE "event_tickets" SET "status" = 'rejected' WHERE "status" = 'declined';
