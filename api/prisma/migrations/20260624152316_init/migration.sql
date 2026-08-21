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

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
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
    "yearsActive" INTEGER,
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
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
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

    CONSTRAINT "dj_profiles_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "mixes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
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

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "dj_profiles_userId_key" ON "dj_profiles"("userId");

-- CreateIndex
CREATE INDEX "dj_profiles_userId_idx" ON "dj_profiles"("userId");

-- CreateIndex
CREATE INDEX "dj_profiles_city_idx" ON "dj_profiles"("city");

-- CreateIndex
CREATE INDEX "dj_profiles_verified_idx" ON "dj_profiles"("verified");

-- CreateIndex
CREATE INDEX "dj_profiles_rankingScore_idx" ON "dj_profiles"("rankingScore");

-- CreateIndex
CREATE INDEX "dj_profiles_isPublic_idx" ON "dj_profiles"("isPublic");

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
CREATE INDEX "bookings_clientId_idx" ON "bookings"("clientId");

-- CreateIndex
CREATE INDEX "bookings_djId_idx" ON "bookings"("djId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_eventDate_idx" ON "bookings"("eventDate");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_clientId_idx" ON "payments"("clientId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_providerRef_idx" ON "payments"("providerRef");

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

-- AddForeignKey
ALTER TABLE "dj_profiles" ADD CONSTRAINT "dj_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streaming_platforms" ADD CONSTRAINT "streaming_platforms_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mixes" ADD CONSTRAINT "mixes_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
