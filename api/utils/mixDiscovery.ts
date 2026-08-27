const { prisma } = require('./prisma');
const { getActiveCampaigns, applyCampaignBoost } = require('./campaignBoost');

/**
 * Deck Salone Mix Discovery Algorithm
 * ===================================
 * Ranks mixes algorithmically for discovery feeds, search results,
 * and personalized recommendations. Scores are computed from:
 *
 * 1. Metadata Quality  (30%) — completeness of title, description,
 *    tags, cover image, genre, category, audio presence
 * 2. Audio Quality     (20%) — duration, bitrate proxy (via file size
 *    if available), format consistency
 * 3. Engagement        (35%) — plays, likes, downloads, recency decay
 * 4. DJ Reputation     (15%) — the DJ's platform ranking score
 *
 * The algorithm favors well-documented, actively-engaged content from
 * reputable DJs while giving fresh uploads a temporary boost.
 *
 * Phase 2 update: discovery scores are pre-computed and stored on the Mix
 * row. The feed sorts by the stored score and only falls back to live
 * scoring for text searches or when the stored score is missing/stale.
 */

const DISCOVERY_WEIGHTS = {
  metadata: 0.30,
  audio: 0.20,
  engagement: 0.35,
  djReputation: 0.15,
};

const DISCOVERY_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

/* ─────────── Metadata quality scoring ─────────── */

function scoreMetadata(mix: any) {
  let score = 0;

  // Title quality (max 20 pts)
  const titleLength = (mix.title || '').length;
  if (titleLength >= 10 && titleLength <= 80) score += 20;
  else if (titleLength >= 5) score += 10;
  else score += 5;

  // Description present (max 15 pts)
  const descLength = (mix.description || '').length;
  if (descLength >= 100) score += 15;
  else if (descLength >= 50) score += 10;
  else if (descLength > 0) score += 5;

  // Tags present (max 15 pts)
  const tagCount = (mix.tags || []).length;
  score += Math.min(15, tagCount * 3);

  // Cover image present (max 15 pts)
  if (mix.coverImage) score += 15;

  // Genre and category present (max 15 pts each)
  if (mix.genre && mix.genre !== 'Unknown') score += 15;
  if (mix.category && mix.category !== 'Unknown') score += 15;

  // Audio URL present (max 20 pts) — critical for playability
  if (mix.audioUrl) score += 20;

  return score; // max 120, will normalize to 0-100
}

/* ─────────── Audio quality scoring ─────────── */

function scoreAudio(mix: any) {
  let score = 0;

  const duration = mix.duration || 0;
  if (duration >= 300 && duration <= 10800) score += 40;
  else if (duration > 0) score += 20;

  if (mix.audioUrl) score += 30;

  const audioUrl = mix.audioUrl || '';
  const ext = audioUrl.split('.').pop()?.toLowerCase();
  const qualityFormats = ['wav', 'flac', 'aiff', 'm4a'];
  const standardFormats = ['mp3', 'ogg', 'aac'];
  if (qualityFormats.includes(ext)) score += 20;
  else if (standardFormats.includes(ext)) score += 15;
  else if (audioUrl) score += 10;

  if (mix.coverImage) score += 10;

  return score; // max 100
}

/* ─────────── Engagement scoring ─────────── */

function scoreEngagement(mix: any) {
  let score = 0;

  const plays = mix.plays || 0;
  score += Math.min(35, (plays / 100000) * 35);

  const likes = mix.likes || 0;
  score += Math.min(25, (likes / 5000) * 25);

  const downloads = mix.downloads || 0;
  score += Math.min(15, (downloads / 1000) * 15);

  const likePlayRatio = plays > 0 ? likes / plays : 0;
  score += Math.min(15, likePlayRatio * 150);

  const ageDays = (Date.now() - new Date(mix.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyBoost = Math.max(0, 10 - ageDays * (10 / 30));
  score += recencyBoost;

  return score; // max 100
}

/* ─────────── DJ reputation scoring ─────────── */

function scoreDjReputation(djRankingScore: number) {
  return Math.min(100, djRankingScore || 0);
}

/* ─────────── Composite mix scoring ─────────── */

function computeMixScore(mix: any, djRankingScore = 0) {
  const metadataScore = Math.min(100, (scoreMetadata(mix) / 120) * 100);
  const audioScore = scoreAudio(mix);
  const engagementScore = scoreEngagement(mix);
  const reputationScore = scoreDjReputation(djRankingScore);

  const composite =
    metadataScore * DISCOVERY_WEIGHTS.metadata +
    audioScore * DISCOVERY_WEIGHTS.audio +
    engagementScore * DISCOVERY_WEIGHTS.engagement +
    reputationScore * DISCOVERY_WEIGHTS.djReputation;

  return {
    mixId: mix.id,
    metadataScore: Math.round(metadataScore * 10) / 10,
    audioScore: Math.round(audioScore * 10) / 10,
    engagementScore: Math.round(engagementScore * 10) / 10,
    reputationScore: Math.round(reputationScore * 10) / 10,
    discoveryScore: Math.round(composite * 10) / 10,
  };
}

function isStoredScoreStale(mix: any) {
  if (mix.discoveryScore == null) return true;
  if (!mix.discoveryScoredAt) return true;
  return Date.now() - new Date(mix.discoveryScoredAt).getTime() > DISCOVERY_STALE_MS;
}

function attachScore(mix: any) {
  const djRankingScore = mix.dj?.rankingScore || 0;
  const live = computeMixScore(mix, djRankingScore);
  const useStored = !isStoredScoreStale(mix);

  return {
    ...mix,
    metadataScore: live.metadataScore,
    audioScore: live.audioScore,
    engagementScore: live.engagementScore,
    reputationScore: live.reputationScore,
    // Prefer the pre-computed composite score when fresh; otherwise use live.
    discoveryScore: useStored ? mix.discoveryScore : live.discoveryScore,
    _scoreSource: useStored ? 'stored' : 'live',
  };
}

function djSelect() {
  return {
    id: true,
    stageName: true,
    avatar: true,
    rankingScore: true,
    city: true,
  };
}

/**
 * Discover mixes — return mixes ranked by the discovery algorithm.
 * Supports filtering by genre, category, and search query.
 *
 * Phase 2: uses the stored discoveryScore for DB-level sorting and pagination
 * when no free-text search is requested. Text searches still compute scores
 * on a limited result set because the stored score cannot account for the
 * search relevance signal.
 */
async function discoverMixes(options: any = {}) {
  const {
    genre,
    category,
    search,
    page = 1,
    limit = 20,
    sortBy = 'discovery',
  } = options;
  const pageNum = Math.max(1, page);
  const limitNum = Math.min(50, Math.max(1, limit));
  const skip = (pageNum - 1) * limitNum;

  const where: any = { isPublic: true };
  const andConditions: any[] = [];

  if (genre) {
    andConditions.push({
      OR: [
        { genre: { equals: genre, mode: 'insensitive' } },
        { category: { equals: genre, mode: 'insensitive' } },
      ],
    });
  }
  if (category) {
    andConditions.push({
      OR: [
        { category: { equals: category, mode: 'insensitive' } },
        { genre: { equals: category, mode: 'insensitive' } },
      ],
    });
  }
  if (search) {
    andConditions.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const campaigns = await getActiveCampaigns('mix');
  const promotedIds = campaigns.map((c: any) => c.targetId).filter(Boolean);

  let scored: any[];
  let total: number;

  if (search) {
    // Free-text search: compute live scores on a limited pool (GIN indexes help here).
    const searchPoolLimit = Math.max(200, skip + limitNum);
    const mixes = await prisma.mix.findMany({
      where,
      include: { dj: { select: djSelect() } },
      take: searchPoolLimit,
    });

    scored = mixes.map((mix: any) => attachScore(mix));
    total = scored.length;
  } else {
    // No text search: sort and paginate by stored discoveryScore.
    const [mixes, count] = await Promise.all([
      prisma.mix.findMany({
        where,
        orderBy: { discoveryScore: { sort: 'desc', nulls: 'last' } },
        skip,
        take: limitNum,
        include: { dj: { select: djSelect() } },
      }),
      prisma.mix.count({ where }),
    ]);

    scored = mixes.map((mix: any) => attachScore(mix));
    total = count;

    // Merge promoted mixes that are not already in the page so campaign boosts can surface them.
    if (promotedIds.length > 0) {
      const fetchedIds = new Set(scored.map((m) => m.id));
      const missingPromotedIds = promotedIds.filter((id: string) => !fetchedIds.has(id));
      if (missingPromotedIds.length > 0) {
        const promotedMixes = await prisma.mix.findMany({
          where: { id: { in: missingPromotedIds }, isPublic: true },
          include: { dj: { select: djSelect() } },
        });
        scored.push(...promotedMixes.map((mix: any) => attachScore(mix)));
      }
    }
  }

  // Sort based on requested sortBy
  switch (sortBy) {
    case 'newest':
      scored.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'trending':
      scored.sort((a, b) => b.engagementScore - a.engagementScore);
      break;
    case 'plays':
      scored.sort((a, b) => b.plays - a.plays);
      break;
    case 'likes':
      scored.sort((a, b) => b.likes - a.likes);
      break;
    case 'discovery':
    default:
      scored.sort((a, b) => b.discoveryScore - a.discoveryScore);
      break;
  }

  // Re-order so promoted mixes surface at the top by reach score
  const boosted = applyCampaignBoost(scored, campaigns, (m: any) => m.id);

  // When using text search we paginate in memory; otherwise the DB already paginated.
  const paginated = search ? boosted.slice(skip, skip + limitNum) : boosted.slice(0, limitNum);
  const resultTotal = search ? boosted.length : total;

  return {
    data: paginated,
    meta: {
      total: resultTotal,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(resultTotal / limitNum),
    },
  };
}

/**
 * Get trending mixes — high engagement mixes from the last 7 days.
 */
async function getTrendingMixes(limit = 10) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Phase 2: prefer stored discoveryScore for the pool sort; fallback DJs without
  // stored scores still get live scoring after fetch.
  const mixes = await prisma.mix.findMany({
    where: {
      isPublic: true,
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      dj: {
        select: {
          id: true,
          stageName: true,
          avatar: true,
          rankingScore: true,
        },
      },
    },
    orderBy: [{ discoveryScore: { sort: 'desc', nulls: 'last' } }, { plays: 'desc' }, { likes: 'desc' }],
    take: limit * 3,
  });

  const scored = mixes
    .map((mix: any) => attachScore(mix))
    .sort((a: any, b: any) => b.discoveryScore - a.discoveryScore)
    .slice(0, limit);

  return scored;
}

/**
 * Personalized recommendations for a user based on their follows and likes.
 */
async function getPersonalizedRecommendations(userId: string, limit = 10) {
  const [follows, likedMixes] = await Promise.all([
    prisma.follow.findMany({
      where: { userId },
      select: { djId: true },
    }),
    prisma.mixLike.findMany({
      where: { userId },
      include: {
        mix: { select: { genre: true, category: true, tags: true } },
      },
    }),
  ]);

  const followedDjIds = follows.map((f: any) => f.djId);

  const genreCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  for (const like of likedMixes) {
    if (like.mix.genre) genreCounts[like.mix.genre] = (genreCounts[like.mix.genre] || 0) + 1;
    if (like.mix.category) categoryCounts[like.mix.category] = (categoryCounts[like.mix.category] || 0) + 1;
  }

  const preferredGenres = Object.entries(genreCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]: any) => g);

  const preferredCategories = Object.entries(categoryCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]: any) => c);

  const orConditions = [];
  if (followedDjIds.length > 0) {
    orConditions.push({ djId: { in: followedDjIds } });
  }
  if (preferredGenres.length > 0) {
    orConditions.push({ genre: { in: preferredGenres } });
  }
  if (preferredCategories.length > 0) {
    orConditions.push({ category: { in: preferredCategories } });
  }

  if (orConditions.length === 0) {
    return getTrendingMixes(limit);
  }

  const mixes = await prisma.mix.findMany({
    where: {
      isPublic: true,
      OR: orConditions,
      id: { notIn: likedMixes.map((l: any) => l.mixId) },
    },
    include: {
      dj: {
        select: {
          id: true,
          stageName: true,
          avatar: true,
          rankingScore: true,
          city: true,
        },
      },
    },
    orderBy: { discoveryScore: { sort: 'desc', nulls: 'last' } },
    take: limit * 4,
  });

  const scored = mixes.map((mix: any) => {
    const base = attachScore(mix);
    let boost = 0;

    if (followedDjIds.includes(mix.djId)) boost += 15;
    if (preferredGenres.includes(mix.genre)) boost += 10;
    if (preferredCategories.includes(mix.category)) boost += 5;

    return {
      ...base,
      discoveryScore: Math.min(100, base.discoveryScore + boost),
    };
  });

  scored.sort((a: any, b: any) => b.discoveryScore - a.discoveryScore);
  return scored.slice(0, limit);
}

/**
 * Get Hall of Fame candidates — mixes with exceptional discovery scores.
 */
async function getHallOfFameCandidates(limit = 10) {
  const mixes = await prisma.mix.findMany({
    where: { isPublic: true },
    include: {
      dj: {
        select: {
          id: true,
          stageName: true,
          avatar: true,
          rankingScore: true,
        },
      },
    },
    orderBy: { discoveryScore: { sort: 'desc', nulls: 'last' } },
    take: 200,
  });

  const scored = mixes
    .map((mix: any) => attachScore(mix))
    .filter((m: any) => m.discoveryScore >= 70)
    .sort((a: any, b: any) => b.discoveryScore - a.discoveryScore)
    .slice(0, limit);

  return scored;
}

module.exports = {
  computeMixScore,
  discoverMixes,
  getTrendingMixes,
  getPersonalizedRecommendations,
  getHallOfFameCandidates,
  DISCOVERY_WEIGHTS,
  scoreMetadata,
  scoreAudio,
  scoreEngagement,
  scoreDjReputation,
};
