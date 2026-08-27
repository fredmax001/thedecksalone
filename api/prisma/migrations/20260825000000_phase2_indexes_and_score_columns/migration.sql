-- Phase 2: Performance indexes and pre-computed score columns
-- Adds GIN/trigram indexes for search, array GIN indexes, composite B-tree indexes,
-- and new columns to store pre-computed discovery/ranking scores.

-- Enable trigram extension for fast fuzzy text search (idempotent).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- New columns for pre-computed scores
-- ============================================================

ALTER TABLE "dj_profiles"
    ADD COLUMN IF NOT EXISTS "rankingScoredAt" TIMESTAMP(3);

ALTER TABLE "mixes"
    ADD COLUMN IF NOT EXISTS "discoveryScore" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "discoveryScoredAt" TIMESTAMP(3);

-- ============================================================
-- Trigram GIN indexes for text search (not expressible in Prisma schema)
-- ============================================================

CREATE INDEX IF NOT EXISTS "dj_profiles_stageName_trgm_idx" ON "dj_profiles" USING GIN ("stageName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "dj_profiles_fullName_trgm_idx"  ON "dj_profiles" USING GIN ("fullName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "dj_profiles_bio_trgm_idx"       ON "dj_profiles" USING GIN ("bio" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "mixes_title_trgm_idx"       ON "mixes" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "mixes_description_trgm_idx" ON "mixes" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "users_name_trgm_idx" ON "users" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_bio_trgm_idx"  ON "users" USING GIN ("bio" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "events_title_trgm_idx"       ON "events" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "events_description_trgm_idx" ON "events" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "opportunities_title_trgm_idx"       ON "opportunities" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "opportunities_description_trgm_idx" ON "opportunities" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "official_playlists_title_trgm_idx"       ON "official_playlists" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "official_playlists_description_trgm_idx" ON "official_playlists" USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "hall_of_fame_legends_name_trgm_idx" ON "hall_of_fame_legends" USING GIN ("name" gin_trgm_ops);

-- ============================================================
-- GIN indexes for array columns (DjProfile)
-- ============================================================

CREATE INDEX IF NOT EXISTS "dj_profiles_genres_idx"      ON "dj_profiles" USING GIN ("genres");
CREATE INDEX IF NOT EXISTS "dj_profiles_awards_idx"      ON "dj_profiles" USING GIN ("awards");
CREATE INDEX IF NOT EXISTS "dj_profiles_equipment_idx"   ON "dj_profiles" USING GIN ("equipment");
CREATE INDEX IF NOT EXISTS "dj_profiles_badges_idx"      ON "dj_profiles" USING GIN ("badges");
CREATE INDEX IF NOT EXISTS "dj_profiles_eventTypes_idx"  ON "dj_profiles" USING GIN ("eventTypes");
CREATE INDEX IF NOT EXISTS "dj_profiles_languages_idx"   ON "dj_profiles" USING GIN ("languages");

-- ============================================================
-- GIN indexes for array columns (Mix)
-- ============================================================

CREATE INDEX IF NOT EXISTS "mixes_tags_idx"            ON "mixes" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "mixes_secondaryGenres_idx" ON "mixes" USING GIN ("secondaryGenres");

-- ============================================================
-- GIN indexes for array columns (User)
-- ============================================================

CREATE INDEX IF NOT EXISTS "users_favoriteGenres_idx" ON "users" USING GIN ("favoriteGenres");

-- ============================================================
-- Composite B-tree indexes for common ranking / discovery filters
-- ============================================================

-- DjProfile search + ranking
CREATE INDEX IF NOT EXISTS "dj_profiles_stageName_idx"              ON "dj_profiles"("stageName");
CREATE INDEX IF NOT EXISTS "dj_profiles_fullName_idx"               ON "dj_profiles"("fullName");
CREATE INDEX IF NOT EXISTS "dj_profiles_rankingScoredAt_idx"        ON "dj_profiles"("rankingScoredAt");
CREATE INDEX IF NOT EXISTS "dj_profiles_isPublic_rankingScore_idx"  ON "dj_profiles"("isPublic", "rankingScore");
CREATE INDEX IF NOT EXISTS "dj_profiles_isPublic_rankingScoredAt_idx" ON "dj_profiles"("isPublic", "rankingScoredAt");
CREATE INDEX IF NOT EXISTS "dj_profiles_isPublic_totalFollowers_idx" ON "dj_profiles"("isPublic", "totalFollowers");
CREATE INDEX IF NOT EXISTS "dj_profiles_isPublic_city_rankingScore_idx"  ON "dj_profiles"("isPublic", "city", "rankingScore");
CREATE INDEX IF NOT EXISTS "dj_profiles_isPublic_city_rankingScoredAt_idx" ON "dj_profiles"("isPublic", "city", "rankingScoredAt");

-- Mix discovery
CREATE INDEX IF NOT EXISTS "mixes_discoveryScore_idx"                ON "mixes"("discoveryScore");
CREATE INDEX IF NOT EXISTS "mixes_discoveryScoredAt_idx"             ON "mixes"("discoveryScoredAt");
CREATE INDEX IF NOT EXISTS "mixes_djId_isPublic_createdAt_idx"       ON "mixes"("djId", "isPublic", "createdAt");
CREATE INDEX IF NOT EXISTS "mixes_djId_isPublic_discoveryScore_idx"  ON "mixes"("djId", "isPublic", "discoveryScore");
CREATE INDEX IF NOT EXISTS "mixes_isPublic_plays_idx"                ON "mixes"("isPublic", "plays");
CREATE INDEX IF NOT EXISTS "mixes_isPublic_likes_idx"                ON "mixes"("isPublic", "likes");
CREATE INDEX IF NOT EXISTS "mixes_isPublic_discoveryScore_idx"       ON "mixes"("isPublic", "discoveryScore");
CREATE INDEX IF NOT EXISTS "mixes_isPublic_discoveryScoredAt_idx"    ON "mixes"("isPublic", "discoveryScoredAt");
CREATE INDEX IF NOT EXISTS "mixes_isPublic_featured_plays_idx"       ON "mixes"("isPublic", "featured", "plays");
CREATE INDEX IF NOT EXISTS "mixes_isPublic_hallOfFame_discoveryScore_idx" ON "mixes"("isPublic", "hallOfFame", "discoveryScore");
CREATE INDEX IF NOT EXISTS "mixes_hallOfFame_isPublic_discoveryScore_idx" ON "mixes"("hallOfFame", "isPublic", "discoveryScore");

-- Events
CREATE INDEX IF NOT EXISTS "events_djId_date_idx"             ON "events"("djId", "date");
CREATE INDEX IF NOT EXISTS "events_djId_status_date_idx"      ON "events"("djId", "status", "date");
CREATE INDEX IF NOT EXISTS "events_publishStatus_city_date_idx" ON "events"("publishStatus", "city", "date");

-- Bookings
CREATE INDEX IF NOT EXISTS "bookings_djId_status_eventDate_idx" ON "bookings"("djId", "status", "eventDate");
CREATE INDEX IF NOT EXISTS "bookings_status_eventDate_idx"      ON "bookings"("status", "eventDate");

-- Messages
CREATE INDEX IF NOT EXISTS "messages_senderId_createdAt_idx"  ON "messages"("senderId", "createdAt");
CREATE INDEX IF NOT EXISTS "messages_bookingId_createdAt_idx" ON "messages"("bookingId", "createdAt");

-- Users
CREATE INDEX IF NOT EXISTS "users_status_idx"             ON "users"("status");
CREATE INDEX IF NOT EXISTS "users_subscriptionTier_status_idx" ON "users"("subscriptionTier", "status");
CREATE INDEX IF NOT EXISTS "users_lastLoginAt_idx"        ON "users"("lastLoginAt");

-- Official playlists
CREATE INDEX IF NOT EXISTS "official_playlists_isPublished_isFeatured_idx" ON "official_playlists"("isPublished", "isFeatured");
CREATE INDEX IF NOT EXISTS "official_playlists_isPublished_createdAt_idx"  ON "official_playlists"("isPublished", "createdAt");
CREATE INDEX IF NOT EXISTS "official_playlists_slug_idx"                   ON "official_playlists"("slug");
