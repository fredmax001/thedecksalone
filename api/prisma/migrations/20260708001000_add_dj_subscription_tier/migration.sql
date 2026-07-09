ALTER TABLE "dj_profiles" ADD COLUMN "subscriptionTier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "dj_profiles" ADD COLUMN "subscriptionActivatedAt" TIMESTAMP(3);

UPDATE "dj_profiles"
SET "subscriptionTier" = 'pro'
WHERE "isPro" = true AND "subscriptionTier" = 'free';
