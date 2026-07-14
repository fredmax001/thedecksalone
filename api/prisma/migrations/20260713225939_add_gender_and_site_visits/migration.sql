-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gender" "Gender";

-- CreateTable
CREATE TABLE "site_visits" (
    "id" TEXT NOT NULL,
    "path" TEXT,
    "userId" TEXT,
    "ipHash" TEXT,
    "city" TEXT,
    "country" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_visits_createdAt_idx" ON "site_visits"("createdAt");

-- CreateIndex
CREATE INDEX "site_visits_userId_createdAt_idx" ON "site_visits"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "site_visits_country_createdAt_idx" ON "site_visits"("country", "createdAt");

-- CreateIndex
CREATE INDEX "site_visits_city_createdAt_idx" ON "site_visits"("city", "createdAt");
