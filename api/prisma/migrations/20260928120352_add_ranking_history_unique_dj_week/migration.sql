-- RANK-10 / DB-6: enforce a single RankingHistory row per (djId, week).
--
-- Pre-existing duplicate rows (from reruns of the weekly recalc, since
-- createMany({ skipDuplicates: true }) had no unique constraint to hit) would
-- violate the new constraint, so delete them first — keeping the newest row
-- per (djId, week). cuid() ids are lexicographically time-ordered, so the
-- largest id per group is the most recent insert.
DELETE FROM "ranking_history" a
USING "ranking_history" b
WHERE a."djId" = b."djId"
  AND a.week = b.week
  AND a.id < b.id;

-- CreateIndex
CREATE UNIQUE INDEX "ranking_history_djId_week_key" ON "ranking_history"("djId", "week");
