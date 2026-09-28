-- DB-3: account purge must not destroy the financial ledger.
--
-- payments / paypal_payments / payout_requests rows are retained and
-- anonymized (owning FK set to NULL) when the owning user, booking, or DJ
-- profile is deleted, instead of being hard-deleted.
--
-- Constraint names verified against 20260821000000_baseline/migration.sql:
--   payments_bookingId_fkey      (was: cascade;  now: SET NULL)
--   payments_clientId_fkey       (was: restrict; now: SET NULL)
-- paypal_payments and payout_requests were never in any migration (prod was
-- db-push'd), so their table-level statements are guarded with IF EXISTS and
-- their constraint names follow Prisma's default naming:
--   paypal_payments_userId_fkey  (was: cascade;  now: SET NULL)
--   payout_requests_djId_fkey    (was: cascade;  now: SET NULL)
-- PROD CONSTRAINT STATE SHOULD BE CHECKED BEFORE DEPLOY
--   (psql \d payments / \d paypal_payments / \d payout_requests) — if prod
--   drift produced different constraint names, adjust the DROP/ADD below.

-- payments: make owner references nullable so rows survive purge anonymization
ALTER TABLE "payments" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "djId" DROP NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "bookingId" DROP NOT NULL;

-- payments -> bookings: deleted booking must not erase its payment rows
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_bookingId_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- payments -> users: purged user must not erase (or RESTRICT-block on) payment rows
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_clientId_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- paypal_payments -> users: keep the PayPal ledger when the user is purged
ALTER TABLE IF EXISTS "paypal_payments" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE IF EXISTS "paypal_payments" DROP CONSTRAINT IF EXISTS "paypal_payments_userId_fkey";
ALTER TABLE IF EXISTS "paypal_payments" ADD CONSTRAINT "paypal_payments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- payout_requests -> dj_profiles: purge deletes the DJ profile; keep payout rows
ALTER TABLE IF EXISTS "payout_requests" ALTER COLUMN "djId" DROP NOT NULL;
ALTER TABLE IF EXISTS "payout_requests" DROP CONSTRAINT IF EXISTS "payout_requests_djId_fkey";
ALTER TABLE IF EXISTS "payout_requests" ADD CONSTRAINT "payout_requests_djId_fkey"
  FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- ROLLBACK (restore pre-DB-3 behavior):
--   ALTER TABLE "payments" ALTER COLUMN "clientId" SET NOT NULL;
--   ALTER TABLE "payments" ALTER COLUMN "djId" SET NOT NULL;
--   ALTER TABLE "payments" ALTER COLUMN "bookingId" SET NOT NULL;
--   ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_bookingId_fkey";
--   ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey"
--     FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--   ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_clientId_fkey";
--   ALTER TABLE "payments" ADD CONSTRAINT "payments_clientId_fkey"
--     FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
--   ALTER TABLE IF EXISTS "paypal_payments" ALTER COLUMN "userId" SET NOT NULL;
--   ALTER TABLE IF EXISTS "paypal_payments" DROP CONSTRAINT IF EXISTS "paypal_payments_userId_fkey";
--   ALTER TABLE IF EXISTS "paypal_payments" ADD CONSTRAINT "paypal_payments_userId_fkey"
--     FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--   ALTER TABLE IF EXISTS "payout_requests" ALTER COLUMN "djId" SET NOT NULL;
--   ALTER TABLE IF EXISTS "payout_requests" DROP CONSTRAINT IF EXISTS "payout_requests_djId_fkey";
--   ALTER TABLE IF EXISTS "payout_requests" ADD CONSTRAINT "payout_requests_djId_fkey"
--     FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- NOTE: SET NOT NULL will fail if any NULLs were written while DB-3 was live.
