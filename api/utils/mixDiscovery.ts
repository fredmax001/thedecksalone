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
 */

const DISCOVERY_WEIGHTS = {
  metadata: 0.30,
  audio: 0.20,
  engagement: 0.35,
  djReputation: 0.15,
};

/* ─────────── Metadata quality scoring ─────────── */

function scoreMetadata(mix) {
  let score = 0;

  // Title quality (max 20 pts)
  // Penalize very short or generic titles; reward descriptive titles
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

function scoreAudio(mix) {
  let score = 0;

  // Duration present and reasonable (max 40 pts)
  // Mixes should be between 5 min and 3 hours (180 min)
  const duration = mix.duration || 0;
  if (duration >= 300 && duration <= 10800) score += 40;
  else if (duration > 0) score += 20;

  // Audio URL present (max 30 pts)
  if (mix.audioUrl) score += 30;

  // File type quality proxy (max 20 pts)
  // We can't check bitrate from DB, but we can infer from URL extension
  const audioUrl = mix.audioUrl || '';
  const ext = audioUrl.split('.').pop()?.toLowerCase();
  const qualityFormats = ['wav', 'flac', 'aiff', 'm4a'];
  const standardFormats = ['mp3', 'ogg', 'aac'];
  if (qualityFormats.includes(ext)) score += 20;
  else if (standardFormats.includes(ext)) score += 15;
  else if (audioUrl) score += 10;

  // Has cover art (max 10 pts) — correlated with production quality
  if (mix.coverImage) score += 10;

  return score; // max 100
}

/* ─────────── Engagement scoring ─────────── */

function scoreEngagement(mix) {
  let score = 0;

  // Plays (max 35 pts) — 100k plays = max
  const plays = mix.plays || 0;
  score += Math.min(35, (plays / 100000) * 35);

  // Likes (max 25 pts) — 5k likes = max
  const likes = mix.likes || 0;
  score += Math.min(25, (likes / 5000) * 25);

  // Downloads (max 15 pts) — 1k downloads = max
  const downloads = mix.downloads || 0;
  score += Math.min(15, (downloads / 1000) * 15);

  // Like-to-play ratio (max 15 pts) — 10% ratio = max
  const likePlayRatio = plays > 0 ? likes / plays : 0;
  score += Math.min(15, likePlayRatio * 150);

  // Recency boost (max 10 pts) — decays over 30 days
  const ageDays = (Date.now() - new Date(mix.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyBoost = Math.max(0, 10 - ageDays * (10 / 30)); // linear decay to 0 over 30 days
  score += recencyBoost;

  return score; // max 100
}

/* ─────────── DJ reputation scoring ─────────── */

function scoreDjReputation(djRankingScore) {
  // Normalize DJ ranking score (0-100 scale) to 0-100
  // If a DJ has a high rankingScore, their mixes get a boost
  return Math.min(100, djRankingScore || 0);
}

/* ─────────── Composite mix scoring ─────────── */

function computeMixScore(mix, djRankingScore = 0) {
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

/**
 * Discover mixes — return mixes ranked by the discovery algorithm.
 * Supports filtering by genre, category, and search query.
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
  if (genre) where.genre = { equals: genre, mode: 'insensitive' };
  if (category) where.category = { equals: category, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ];
  }

  // Fetch mixes with DJ ranking scores
  const mixes = await prisma.mix.findMany({
    where,
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
  });

  let scored = mixes.map((mix) => ({
    ...mix,
    ...computeMixScore(mix, mix.dj?.rankingScore || 0),
  }));

  // Apply active campaign boosts for promoted mixes
  const campaigns = await getActiveCampaigns('mix');
  const promotedIds = campaigns.map((c) => c.targetId).filter(Boolean);
  if (promotedIds.length > 0) {
    const promotedMixes = await prisma.mix.findMany({
      where: { id: { in: promotedIds }, isPublic: true },
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
    });
    const existingIds = new Set(scored.map((m) => m.id));
    for (const mix of promotedMixes) {
      if (!existingIds.has(mix.id)) {
        scored.push({ ...mix, ...computeMixScore(mix, mix.dj?.rankingScore || 0) });
      }
    }
  }

  // Sort based on requested sortBy
  switch (sortBy) {
    case 'newest':
      scored.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'trending':
      // Trending = high engagement in recent days (we use engagement score + recency)
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
  const boosted = applyCampaignBoost(scored, campaigns, (m) => m.id);

  const total = boosted.length;
  const paginated = boosted.slice(skip, skip + limitNum);

  return {
    data: paginated,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Get trending mixes — high engagement mixes from the last 7 days.
 */
async function getTrendingMixes(limit = 10) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

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
    orderBy: [{ plays: 'desc' }, { likes: 'desc' }],
    take: limit * 3, // fetch more to score and filter
  });

  const scored = mixes
    .map((mix) => ({
      ...mix,
      ...computeMixScore(mix, mix.dj?.rankingScore || 0),
    }))
    .sort((a, b) => b.discoveryScore - a.discoveryScore)
    .slice(0, limit);

  return scored;
}

/**
 * Personalized recommendations for a user based on their follows and likes.
 */
async function getPersonalizedRecommendations(userId, limit = 10) {
  // Get user's followed DJs and liked mixes (genres)
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

  const followedDjIds = follows.map((f) => f.djId);

  // Extract preferred genres/categories from liked mixes
  const genreCounts = {};
  const categoryCounts = {};
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

  // Build where clause for recommendation query
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

  // If we have no preferences, return trending
  if (orConditions.length === 0) {
    return getTrendingMixes(limit);
  }

  const mixes = await prisma.mix.findMany({
    where: {
      isPublic: true,
      OR: orConditions,
      // Exclude already liked mixes
      id: { notIn: likedMixes.map((l) => l.mixId) },
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
    take: limit * 4,
  });

  // Boost followed DJs and preferred genres
  const scored = mixes.map((mix) => {
    const base = computeMixScore(mix, mix.dj?.rankingScore || 0);
    let boost = 0;

    if (followedDjIds.includes(mix.djId)) boost += 15;
    if (preferredGenres.includes(mix.genre)) boost += 10;
    if (preferredCategories.includes(mix.category)) boost += 5;

    return {
      ...mix,
      ...base,
      discoveryScore: Math.min(100, base.discoveryScore + boost),
    };
  });

  scored.sort((a, b) => b.discoveryScore - a.discoveryScore);
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
    take: 200, // pool to score
  });

  const scored = mixes
    .map((mix) => ({
      ...mix,
      ...computeMixScore(mix, mix.dj?.rankingScore || 0),
    }))
    .filter((m) => m.discoveryScore >= 70) // only high-quality content
    .sort((a, b) => b.discoveryScore - a.discoveryScore)
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
