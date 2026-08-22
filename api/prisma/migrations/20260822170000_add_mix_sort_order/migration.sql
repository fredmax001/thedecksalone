-- AlterTable
ALTER TABLE "mixes" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing mixes with descending sortOrder based on createdAt so newest mix gets highest order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" DESC) AS rn
  FROM "mixes"
)
UPDATE "mixes"
SET "sortOrder" = ordered.rn - 1
FROM ordered
WHERE "mixes".id = ordered.id;

-- CreateIndex
CREATE INDEX "mixes_djId_sortOrder_idx" ON "mixes"("djId", "sortOrder");
