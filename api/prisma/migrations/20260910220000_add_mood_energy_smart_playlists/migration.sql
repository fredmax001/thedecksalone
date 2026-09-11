-- AlterTable
ALTER TABLE "mixes" ADD COLUMN IF NOT EXISTS "mood" TEXT;
ALTER TABLE "mixes" ADD COLUMN IF NOT EXISTS "energy" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "smart_playlists" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "slug" TEXT NOT NULL,
    "genres" TEXT[],
    "moods" TEXT[],
    "energies" TEXT[],
    "sortBy" TEXT NOT NULL DEFAULT 'trending',
    "trackLimit" INTEGER NOT NULL DEFAULT 20,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_playlists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "smart_playlists_slug_key" ON "smart_playlists"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "smart_playlists_isPublished_idx" ON "smart_playlists"("isPublished");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "smart_playlists_isPublished_isFeatured_idx" ON "smart_playlists"("isPublished", "isFeatured");
