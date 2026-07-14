-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CREATED', 'BOOKING_STATUS_CHANGED', 'COUNTER_OFFER', 'NEW_MESSAGE', 'NEW_FOLLOWER', 'MIX_LIKED', 'MIX_REUPPED', 'NEW_MIX', 'EVENT_REMINDER', 'SYSTEM', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'REVIEW_RECEIVED', 'VERIFICATION_STATUS', 'SUBSCRIPTION_STATUS');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'DJ', 'ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'NEGOTIATING', 'CONFIRMED', 'DEPOSIT_PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'FULL_PAYMENT', 'REFUND', 'PLATFORM_FEE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "googleId" TEXT,
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneOtp" TEXT,
    "phoneOtpExpiry" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "favoriteGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastLoginAt" TIMESTAMP(3),
    "location" TEXT,
    "name" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "socialLinks" JSONB,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "username" VARCHAR(30) NOT NULL,
    "notificationPreferences" JSONB,
    "privacyPreferences" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "entityId" TEXT,
    "entityType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dj_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "bio" TEXT,
    "avatar" TEXT,
    "coverBanner" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Sierra Leone',
    "city" TEXT,
    "genres" TEXT[],
    "awards" TEXT[],
    "equipment" TEXT[],
    "languages" TEXT[] DEFAULT ARRAY['English']::TEXT[],
    "bookingFeeMin" DOUBLE PRECISION,
    "bookingFeeMax" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "availability" TEXT,
    "website" TEXT,
    "whatsappNumber" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "totalFollowers" INTEGER NOT NULL DEFAULT 0,
    "totalStreams" INTEGER NOT NULL DEFAULT 0,
    "totalMixes" INTEGER NOT NULL DEFAULT 0,
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rankingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "digitalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "industryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "communityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rankingPosition" INTEGER NOT NULL DEFAULT 0,
    "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apiAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "canReceivePayments" BOOLEAN NOT NULL DEFAULT false,
    "canViewAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "depositPercent" INTEGER DEFAULT 30,
    "eventTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fullDayRate" DOUBLE PRECISION,
    "hasAccountManager" BOOLEAN NOT NULL DEFAULT false,
    "hearThisConnected" BOOLEAN NOT NULL DEFAULT false,
    "hearThisId" TEXT,
    "hourlyRate" DOUBLE PRECISION,
    "idDocumentType" TEXT,
    "idDocumentUrl" TEXT,
    "isLegendFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "isVerifiedEligible" BOOLEAN NOT NULL DEFAULT false,
    "legalName" TEXT,
    "maxTravelDistanceKm" INTEGER,
    "nationality" TEXT,
    "services" JSONB,
    "socialLinks" JSONB,
    "socialProof" TEXT,
    "startYear" INTEGER,
    "streamingLinks" JSONB,
    "subscriptionActivatedAt" TIMESTAMP(3),
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "totalMixUploads" INTEGER NOT NULL DEFAULT 0,
    "verificationNotes" TEXT,
    "verificationReason" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "verifiedAt" TIMESTAMP(3),
    "willTravel" BOOLEAN NOT NULL DEFAULT false,
    "monthlyListeners" INTEGER NOT NULL DEFAULT 0,
    "hallOfFame" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "dj_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streaming_platforms" (
    "id" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "streams" INTEGER NOT NULL DEFAULT 0,
    "uploads" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "streaming_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mixes" (
    "id" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "audioUrl" TEXT,
    "duration" INTEGER,
    "genre" TEXT NOT NULL,
    "tags" TEXT[],
    "category" TEXT NOT NULL,
    "plays" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "audioSource" TEXT,
    "originalUrl" TEXT,
    "hallOfFame" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mixes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mix_likes" (
    "id" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mix_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mix_plays" (
    "id" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mix_plays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mix_reups" (
    "id" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mix_reups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dj_highlights" (
    "id" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dj_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dj_sets" (
    "id" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "genre" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dj_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dj_set_items" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dj_set_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "djId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventLocation" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION,
    "deposit" DOUBLE PRECISION,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "requirements" TEXT,
    "rating" INTEGER,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetMax" DOUBLE PRECISION,
    "budgetMin" DOUBLE PRECISION,
    "equipmentNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eventTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "guestEmail" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "musicStyles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "services" JSONB,
    "travelNotes" TEXT,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gigs" (
    "id" TEXT NOT NULL,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "clientToken" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "durationHours" INTEGER,
    "location" TEXT NOT NULL,
    "city" TEXT,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "musicStyles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "equipmentNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_applications" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "proposedPrice" DOUBLE PRECISION,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gig_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "bookingId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedBySender" BOOLEAN NOT NULL DEFAULT false,
    "deletedByReceiver" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "type" "PaymentType" NOT NULL DEFAULT 'DEPOSIT',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pro_subscription_requests" (
    "id" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'pro',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 250,
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "paymentMethod" TEXT NOT NULL DEFAULT 'Orange Money',
    "paymentNumber" TEXT NOT NULL DEFAULT '+23272011156',
    "proofUrl" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pro_subscription_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "djId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "venue" TEXT,
    "image" TEXT,
    "isOpenSlot" BOOLEAN NOT NULL DEFAULT false,
    "slots" INTEGER NOT NULL DEFAULT 0,
    "filledSlots" INTEGER NOT NULL DEFAULT 0,
    "compensation" DOUBLE PRECISION,
    "requirements" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "soundItSaloneEventId" TEXT,
    "soundItSaloneUrl" TEXT,
    "isSyncedToSalone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ticketUrl" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_applications" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "eventType" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "theme" TEXT,
    "metricType" TEXT NOT NULL DEFAULT 'COMPOSITE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_entries" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "mixId" TEXT,
    "baseScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voteScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "votes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "battle_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_votes" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "battle_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_history" (
    "id" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "digitalScore" DOUBLE PRECISION NOT NULL,
    "industryScore" DOUBLE PRECISION NOT NULL,
    "communityScore" DOUBLE PRECISION NOT NULL,
    "week" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranking_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "advertiserId" TEXT,
    "targetType" TEXT NOT NULL DEFAULT 'profile',
    "targetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "reachScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creativeImageUrl" TEXT,
    "ctaUrl" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dj_photos" (
    "id" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dj_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventLocation" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "budgetCurrency" TEXT NOT NULL DEFAULT 'SLE',
    "genres" TEXT[],
    "musicStyle" TEXT,
    "hours" INTEGER,
    "equipmentNeeded" TEXT[],
    "requirements" TEXT,
    "notes" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "requiredTier" TEXT NOT NULL DEFAULT 'pro',
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opp_applications" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "opp_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_role_createdAt_idx" ON "users"("status", "role", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_targetId_createdAt_idx" ON "audit_logs"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_entity_createdAt_idx" ON "audit_logs"("action", "entity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "dj_profiles_userId_key" ON "dj_profiles"("userId");

-- CreateIndex
CREATE INDEX "dj_profiles_userId_idx" ON "dj_profiles"("userId");

-- CreateIndex
CREATE INDEX "dj_profiles_city_idx" ON "dj_profiles"("city");

-- CreateIndex
CREATE INDEX "dj_profiles_verified_idx" ON "dj_profiles"("verified");

-- CreateIndex
CREATE INDEX "dj_profiles_verificationStatus_idx" ON "dj_profiles"("verificationStatus");

-- CreateIndex
CREATE INDEX "dj_profiles_rankingScore_idx" ON "dj_profiles"("rankingScore");

-- CreateIndex
CREATE INDEX "dj_profiles_isPublic_idx" ON "dj_profiles"("isPublic");

-- CreateIndex
CREATE INDEX "follows_userId_idx" ON "follows"("userId");

-- CreateIndex
CREATE INDEX "follows_djId_idx" ON "follows"("djId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_userId_djId_key" ON "follows"("userId", "djId");

-- CreateIndex
CREATE INDEX "streaming_platforms_djId_idx" ON "streaming_platforms"("djId");

-- CreateIndex
CREATE INDEX "mixes_djId_idx" ON "mixes"("djId");

-- CreateIndex
CREATE INDEX "mixes_category_idx" ON "mixes"("category");

-- CreateIndex
CREATE INDEX "mixes_genre_idx" ON "mixes"("genre");

-- CreateIndex
CREATE INDEX "mixes_featured_idx" ON "mixes"("featured");

-- CreateIndex
CREATE INDEX "mixes_createdAt_idx" ON "mixes"("createdAt");

-- CreateIndex
CREATE INDEX "mix_likes_mixId_idx" ON "mix_likes"("mixId");

-- CreateIndex
CREATE INDEX "mix_likes_userId_idx" ON "mix_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mix_likes_mixId_userId_key" ON "mix_likes"("mixId", "userId");

-- CreateIndex
CREATE INDEX "mix_plays_djId_createdAt_idx" ON "mix_plays"("djId", "createdAt");

-- CreateIndex
CREATE INDEX "mix_plays_mixId_createdAt_idx" ON "mix_plays"("mixId", "createdAt");

-- CreateIndex
CREATE INDEX "mix_reups_djId_createdAt_idx" ON "mix_reups"("djId", "createdAt");

-- CreateIndex
CREATE INDEX "mix_reups_mixId_idx" ON "mix_reups"("mixId");

-- CreateIndex
CREATE UNIQUE INDEX "mix_reups_djId_mixId_key" ON "mix_reups"("djId", "mixId");

-- CreateIndex
CREATE INDEX "dj_highlights_djId_sortOrder_idx" ON "dj_highlights"("djId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "dj_highlights_djId_mixId_key" ON "dj_highlights"("djId", "mixId");

-- CreateIndex
CREATE INDEX "dj_sets_djId_createdAt_idx" ON "dj_sets"("djId", "createdAt");

-- CreateIndex
CREATE INDEX "dj_set_items_setId_sortOrder_idx" ON "dj_set_items"("setId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "dj_set_items_setId_mixId_key" ON "dj_set_items"("setId", "mixId");

-- CreateIndex
CREATE INDEX "bookings_clientId_idx" ON "bookings"("clientId");

-- CreateIndex
CREATE INDEX "bookings_djId_idx" ON "bookings"("djId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_eventDate_idx" ON "bookings"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "gigs_clientToken_key" ON "gigs"("clientToken");

-- CreateIndex
CREATE INDEX "gigs_status_idx" ON "gigs"("status");

-- CreateIndex
CREATE INDEX "gigs_city_idx" ON "gigs"("city");

-- CreateIndex
CREATE INDEX "gigs_eventDate_idx" ON "gigs"("eventDate");

-- CreateIndex
CREATE INDEX "gigs_createdAt_idx" ON "gigs"("createdAt");

-- CreateIndex
CREATE INDEX "gig_applications_gigId_idx" ON "gig_applications"("gigId");

-- CreateIndex
CREATE INDEX "gig_applications_djId_idx" ON "gig_applications"("djId");

-- CreateIndex
CREATE INDEX "gig_applications_status_idx" ON "gig_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "gig_applications_gigId_djId_key" ON "gig_applications"("gigId", "djId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_receiverId_idx" ON "messages"("receiverId");

-- CreateIndex
CREATE INDEX "messages_bookingId_idx" ON "messages"("bookingId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_clientId_idx" ON "payments"("clientId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_providerRef_idx" ON "payments"("providerRef");

-- CreateIndex
CREATE INDEX "pro_subscription_requests_djId_idx" ON "pro_subscription_requests"("djId");

-- CreateIndex
CREATE INDEX "pro_subscription_requests_status_idx" ON "pro_subscription_requests"("status");

-- CreateIndex
CREATE INDEX "pro_subscription_requests_createdAt_idx" ON "pro_subscription_requests"("createdAt");

-- CreateIndex
CREATE INDEX "events_djId_idx" ON "events"("djId");

-- CreateIndex
CREATE INDEX "events_city_idx" ON "events"("city");

-- CreateIndex
CREATE INDEX "events_date_idx" ON "events"("date");

-- CreateIndex
CREATE INDEX "events_soundItSaloneEventId_idx" ON "events"("soundItSaloneEventId");

-- CreateIndex
CREATE INDEX "events_isSyncedToSalone_idx" ON "events"("isSyncedToSalone");

-- CreateIndex
CREATE INDEX "event_applications_eventId_idx" ON "event_applications"("eventId");

-- CreateIndex
CREATE INDEX "event_applications_djId_idx" ON "event_applications"("djId");

-- CreateIndex
CREATE INDEX "event_applications_status_idx" ON "event_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "event_applications_eventId_djId_key" ON "event_applications"("eventId", "djId");

-- CreateIndex
CREATE INDEX "reviews_djId_idx" ON "reviews"("djId");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_djId_key" ON "reviews"("userId", "djId");

-- CreateIndex
CREATE INDEX "battles_status_idx" ON "battles"("status");

-- CreateIndex
CREATE INDEX "battles_weekStart_idx" ON "battles"("weekStart");

-- CreateIndex
CREATE INDEX "battle_entries_battleId_idx" ON "battle_entries"("battleId");

-- CreateIndex
CREATE INDEX "battle_entries_djId_idx" ON "battle_entries"("djId");

-- CreateIndex
CREATE INDEX "battle_entries_finalScore_idx" ON "battle_entries"("finalScore");

-- CreateIndex
CREATE INDEX "battle_votes_entryId_idx" ON "battle_votes"("entryId");

-- CreateIndex
CREATE INDEX "battle_votes_userId_idx" ON "battle_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "battle_votes_entryId_userId_key" ON "battle_votes"("entryId", "userId");

-- CreateIndex
CREATE INDEX "ranking_history_djId_idx" ON "ranking_history"("djId");

-- CreateIndex
CREATE INDEX "ranking_history_week_idx" ON "ranking_history"("week");

-- CreateIndex
CREATE INDEX "ad_campaigns_status_idx" ON "ad_campaigns"("status");

-- CreateIndex
CREATE INDEX "ad_campaigns_advertiserId_idx" ON "ad_campaigns"("advertiserId");

-- CreateIndex
CREATE INDEX "ad_campaigns_targetType_status_idx" ON "ad_campaigns"("targetType", "status");

-- CreateIndex
CREATE INDEX "dj_photos_djId_idx" ON "dj_photos"("djId");

-- CreateIndex
CREATE INDEX "opportunities_eventDate_idx" ON "opportunities"("eventDate");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");

-- CreateIndex
CREATE INDEX "opportunities_requiredTier_idx" ON "opportunities"("requiredTier");

-- CreateIndex
CREATE INDEX "opportunities_isFeatured_idx" ON "opportunities"("isFeatured");

-- CreateIndex
CREATE INDEX "opp_applications_opportunityId_idx" ON "opp_applications"("opportunityId");

-- CreateIndex
CREATE INDEX "opp_applications_djId_idx" ON "opp_applications"("djId");

-- CreateIndex
CREATE UNIQUE INDEX "opp_applications_opportunityId_djId_key" ON "opp_applications"("opportunityId", "djId");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dj_profiles" ADD CONSTRAINT "dj_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streaming_platforms" ADD CONSTRAINT "streaming_platforms_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mixes" ADD CONSTRAINT "mixes_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mix_likes" ADD CONSTRAINT "mix_likes_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "mixes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mix_likes" ADD CONSTRAINT "mix_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mix_plays" ADD CONSTRAINT "mix_plays_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "mixes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mix_reups" ADD CONSTRAINT "mix_reups_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mix_reups" ADD CONSTRAINT "mix_reups_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "mixes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dj_highlights" ADD CONSTRAINT "dj_highlights_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dj_highlights" ADD CONSTRAINT "dj_highlights_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "mixes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dj_sets" ADD CONSTRAINT "dj_sets_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dj_set_items" ADD CONSTRAINT "dj_set_items_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "mixes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dj_set_items" ADD CONSTRAINT "dj_set_items_setId_fkey" FOREIGN KEY ("setId") REFERENCES "dj_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_applications" ADD CONSTRAINT "gig_applications_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_applications" ADD CONSTRAINT "gig_applications_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_subscription_requests" ADD CONSTRAINT "pro_subscription_requests_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_applications" ADD CONSTRAINT "event_applications_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_applications" ADD CONSTRAINT "event_applications_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_entries" ADD CONSTRAINT "battle_entries_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_entries" ADD CONSTRAINT "battle_entries_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_votes" ADD CONSTRAINT "battle_votes_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "battle_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_votes" ADD CONSTRAINT "battle_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_history" ADD CONSTRAINT "ranking_history_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "dj_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dj_photos" ADD CONSTRAINT "dj_photos_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opp_applications" ADD CONSTRAINT "opp_applications_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opp_applications" ADD CONSTRAINT "opp_applications_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
