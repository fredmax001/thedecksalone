-- Production performance indexes for hot query paths
-- These support admin dashboards, public listings, search, and messaging.

-- User lookups
CREATE INDEX IF NOT EXISTS "users_role_createdAt_idx" ON "users"("role", "createdAt");
CREATE INDEX IF NOT EXISTS "users_status_createdAt_idx" ON "users"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "users_dateOfBirth_idx" ON "users"("dateOfBirth");
CREATE INDEX IF NOT EXISTS "users_referredBy_idx" ON "users"("referredBy");
CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "users"("createdAt");

-- DJ profile listings and filters
CREATE INDEX IF NOT EXISTS "dj_profiles_subscriptionTier_idx" ON "dj_profiles"("subscriptionTier");
CREATE INDEX IF NOT EXISTS "dj_profiles_isPublic_createdAt_idx" ON "dj_profiles"("isPublic", "createdAt");
CREATE INDEX IF NOT EXISTS "dj_profiles_isPublic_verified_rankingScore_idx" ON "dj_profiles"("isPublic", "verified", "rankingScore");
CREATE INDEX IF NOT EXISTS "dj_profiles_updatedAt_idx" ON "dj_profiles"("updatedAt");

-- Mix listings, discovery, and trending
CREATE INDEX IF NOT EXISTS "mixes_plays_idx" ON "mixes"("plays");
CREATE INDEX IF NOT EXISTS "mixes_likes_idx" ON "mixes"("likes");
CREATE INDEX IF NOT EXISTS "mixes_title_idx" ON "mixes"("title");
CREATE INDEX IF NOT EXISTS "mixes_isPublic_featured_createdAt_idx" ON "mixes"("isPublic", "featured", "createdAt");
CREATE INDEX IF NOT EXISTS "mixes_isPublic_genre_createdAt_idx" ON "mixes"("isPublic", "genre", "createdAt");
CREATE INDEX IF NOT EXISTS "mixes_isPublic_category_createdAt_idx" ON "mixes"("isPublic", "category", "createdAt");
CREATE INDEX IF NOT EXISTS "mixes_hallOfFame_isPublic_createdAt_idx" ON "mixes"("hallOfFame", "isPublic", "createdAt");

-- Event listings and filters
CREATE INDEX IF NOT EXISTS "events_status_date_idx" ON "events"("status", "date");
CREATE INDEX IF NOT EXISTS "events_publishStatus_status_date_idx" ON "events"("publishStatus", "status", "date");
CREATE INDEX IF NOT EXISTS "events_city_date_idx" ON "events"("city", "date");

-- Ticket and booking lookups
CREATE INDEX IF NOT EXISTS "event_tickets_userId_status_idx" ON "event_tickets"("userId", "status");
CREATE INDEX IF NOT EXISTS "event_tickets_status_paymentStatus_idx" ON "event_tickets"("status", "paymentStatus");
CREATE INDEX IF NOT EXISTS "bookings_clientId_createdAt_idx" ON "bookings"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "bookings_status_createdAt_idx" ON "bookings"("status", "createdAt");

-- Messaging
CREATE INDEX IF NOT EXISTS "messages_receiverId_createdAt_idx" ON "messages"("receiverId", "createdAt");
CREATE INDEX IF NOT EXISTS "messages_senderId_receiverId_createdAt_idx" ON "messages"("senderId", "receiverId", "createdAt");

-- Payment lookups
CREATE INDEX IF NOT EXISTS "payments_djId_idx" ON "payments"("djId");
CREATE INDEX IF NOT EXISTS "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- Notifications inbox
CREATE INDEX IF NOT EXISTS "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt");

-- Moderation and opportunities
CREATE INDEX IF NOT EXISTS "violation_reports_status_createdAt_idx" ON "violation_reports"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "opportunities_status_eventDate_idx" ON "opportunities"("status", "eventDate");

-- Campaigns and sets
CREATE INDEX IF NOT EXISTS "ad_campaigns_targetId_idx" ON "ad_campaigns"("targetId");
CREATE INDEX IF NOT EXISTS "dj_sets_djId_isPublic_createdAt_idx" ON "dj_sets"("djId", "isPublic", "createdAt");

-- Comments threading
CREATE INDEX IF NOT EXISTS "mix_comments_mixId_parentId_createdAt_idx" ON "mix_comments"("mixId", "parentId", "createdAt");
