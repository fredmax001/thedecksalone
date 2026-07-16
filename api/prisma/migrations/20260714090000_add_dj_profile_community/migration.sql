ALTER TABLE "dj_profiles" ADD COLUMN "community" TEXT;

CREATE INDEX "dj_profiles_community_idx" ON "dj_profiles"("community");
