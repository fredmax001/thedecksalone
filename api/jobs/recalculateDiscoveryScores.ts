const { prisma } = require('../utils/prisma');
const { computeMixScore } = require('../utils/mixDiscovery');

const BATCH_SIZE = 200;
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Recalculate discovery scores for all public mixes in cursor-based batches.
 * Uses raw SQL batch updates for efficiency.
 */
export async function recalculateAllDiscoveryScores() {
  const startedAt = Date.now();
  let processed = 0;
  let cursor: string | undefined;
  const now = new Date();

  do {
    const mixes = await prisma.mix.findMany({
      where: { isPublic: true },
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        audioUrl: true,
        duration: true,
        genre: true,
        tags: true,
        category: true,
        plays: true,
        likes: true,
        downloads: true,
        createdAt: true,
        dj: { select: { rankingScore: true } },
      },
    });

    if (mixes.length === 0) break;

    const values = mixes
      .map((mix: any) => {
        const djRankingScore = mix.dj?.rankingScore || 0;
        const score = computeMixScore(mix, djRankingScore);
        return {
          id: mix.id,
          discoveryScore: score.discoveryScore,
        };
      })
      .filter((m: any) => Number.isFinite(m.discoveryScore));

    if (values.length > 0) {
      const cases = values
        .map((m: any) => `WHEN '${m.id}' THEN ${m.discoveryScore}`)
        .join(' ');
      const ids = values.map((m: any) => `'${m.id}'`).join(',');

      await prisma.$executeRawUnsafe(`
        UPDATE "mixes"
        SET "discoveryScore" = CASE "id" ${cases} END,
            "discoveryScoredAt" = $1
        WHERE "id" IN (${ids})
      `, now);
    }

    processed += mixes.length;
    cursor = mixes.length === BATCH_SIZE ? mixes[mixes.length - 1].id : undefined;
  } while (cursor);

  const durationMs = Date.now() - startedAt;
  console.log(`[DiscoveryScores] Recalculated ${processed} mixes in ${durationMs}ms`);
  return { processed, durationMs };
}

/**
 * Recalculate discovery scores only for mixes that are missing or stale.
 */
export async function recalculateStaleDiscoveryScores() {
  const startedAt = Date.now();
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);
  let processed = 0;
  let cursor: string | undefined;
  const now = new Date();

  do {
    const mixes = await prisma.mix.findMany({
      where: {
        isPublic: true,
        OR: [
          { discoveryScore: null },
          { discoveryScoredAt: { lt: staleThreshold } },
        ],
      },
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        audioUrl: true,
        duration: true,
        genre: true,
        tags: true,
        category: true,
        plays: true,
        likes: true,
        downloads: true,
        createdAt: true,
        dj: { select: { rankingScore: true } },
      },
    });

    if (mixes.length === 0) break;

    const values = mixes
      .map((mix: any) => {
        const djRankingScore = mix.dj?.rankingScore || 0;
        const score = computeMixScore(mix, djRankingScore);
        return {
          id: mix.id,
          discoveryScore: score.discoveryScore,
        };
      })
      .filter((m: any) => Number.isFinite(m.discoveryScore));

    if (values.length > 0) {
      const cases = values
        .map((m: any) => `WHEN '${m.id}' THEN ${m.discoveryScore}`)
        .join(' ');
      const ids = values.map((m: any) => `'${m.id}'`).join(',');

      await prisma.$executeRawUnsafe(`
        UPDATE "mixes"
        SET "discoveryScore" = CASE "id" ${cases} END,
            "discoveryScoredAt" = $1
        WHERE "id" IN (${ids})
      `, now);
    }

    processed += mixes.length;
    cursor = mixes.length === BATCH_SIZE ? mixes[mixes.length - 1].id : undefined;
  } while (cursor);

  const durationMs = Date.now() - startedAt;
  console.log(`[DiscoveryScores] Recalculated ${processed} stale mixes in ${durationMs}ms`);
  return { processed, durationMs };
}
