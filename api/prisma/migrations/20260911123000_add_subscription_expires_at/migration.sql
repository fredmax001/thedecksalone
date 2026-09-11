-- Add subscription expiry tracking (enforcement of paid plan durations)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3);
ALTER TABLE "dj_profiles" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3);

-- Backfill expiry for existing subscribers from their real payment records:
--   1. latest approved ProSubscriptionRequest (manual Orange Money / admin-approved)
--   2. latest captured PayPal payment (whichever of the two is more recent wins)
-- Plan strings containing 'annual' grant 12 months, everything else 1 month.
-- Fallback when no payment record exists: subscriptionActivatedAt + 1 month.
WITH sub_users AS (
  SELECT u.id
  FROM "users" u
  WHERE u."subscriptionTier" IN ('pro', 'legend')
     OR EXISTS (
       SELECT 1 FROM "dj_profiles" d
       WHERE d."userId" = u.id AND (d."subscriptionTier" IN ('pro', 'legend') OR d."isPro" = true)
     )
),
last_pay AS (
  SELECT
    s.id AS user_id,
    CASE
      WHEN r."reviewedAt" >= COALESCE(pp."capturedAt", r."reviewedAt") THEN r."reviewedAt"
      ELSE pp."capturedAt"
    END AS paid_at,
    CASE
      WHEN r."reviewedAt" >= COALESCE(pp."capturedAt", r."reviewedAt") THEN r.plan
      ELSE pp.plan
    END AS plan
  FROM sub_users s
  LEFT JOIN LATERAL (
    SELECT psr."reviewedAt", psr.plan
    FROM "pro_subscription_requests" psr
    LEFT JOIN "dj_profiles" d ON d.id = psr."djId"
    WHERE (psr."userId" = s.id OR d."userId" = s.id)
      AND psr.status = 'approved'
      AND psr."reviewedAt" IS NOT NULL
    ORDER BY psr."reviewedAt" DESC
    LIMIT 1
  ) r ON TRUE
  LEFT JOIN LATERAL (
    SELECT p."capturedAt", p.plan
    FROM "paypal_payments" p
    WHERE p."userId" = s.id AND p.status = 'CAPTURED'
    ORDER BY p."capturedAt" DESC
    LIMIT 1
  ) pp ON TRUE
)
UPDATE "users" u
SET "subscriptionExpiresAt" = CASE
  WHEN lp.paid_at IS NOT NULL THEN
    lp.paid_at + (CASE WHEN lp.plan LIKE '%annual%' THEN INTERVAL '12 months' ELSE INTERVAL '1 month' END)
  WHEN u."subscriptionActivatedAt" IS NOT NULL THEN
    u."subscriptionActivatedAt" + INTERVAL '1 month'
  ELSE
    NOW() + INTERVAL '1 month'
END
FROM last_pay lp
WHERE u.id = lp.user_id;

-- Keep DjProfile in sync with the User value (same source of truth as activation)
UPDATE "dj_profiles" d
SET "subscriptionExpiresAt" = u."subscriptionExpiresAt"
FROM "users" u
WHERE d."userId" = u.id
  AND u."subscriptionExpiresAt" IS NOT NULL;
