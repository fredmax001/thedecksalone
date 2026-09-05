-- AlterTable
ALTER TABLE "mixes" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mixes_slug_idx" ON "mixes"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mixes_djId_slug_idx" ON "mixes"("djId", "slug");
