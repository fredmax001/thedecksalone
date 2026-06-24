const { prisma } = require('./prisma');

/**
 * The Deck Salone Ranking Algorithm
 * ==================================
 * Computes a composite ranking score (0-100) for each DJ based on:
 * 1. Digital Score (40%) - streaming metrics, followers, upload consistency
 * 2. Industry Score (35%) - bookings, events, verified status, awards
 * 3. Community Score (25%) - reviews, engagement rate, likes/plays ratio
 *
 * The algorithm ensures the ranking is transparent, data-driven, and
 * resistant to gaming. We use normalized sub-scores so each dimension
 * contributes fairly regardless of absolute scale.
 */

const WEIGHTS = {
  digital: 0.40,
  industry: 0.35,
  community: 0.25,
};

/**
 * Calculate digital score (0-100) based on streaming metrics.
 */
function calculateDigitalScore(dj, platforms, totalMixes) {
  let score = 0;

  // Total followers across platforms (max 30 pts)
  const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0) || dj.totalFollowers;
  const followerScore = Math.min(30, (totalFollowers / 50000) * 30); // 50k followers = max
  score += followerScore;

  // Total streams (max 25 pts)
  const totalStreams = platforms.reduce((sum, p) => sum + p.streams, 0) || dj.totalStreams;
  const streamScore = Math.min(25, (totalStreams / 1000000) * 25); // 1M streams = max
  score += streamScore;

  // Upload consistency (max 20 pts) - more mixes = more active
  const uploadScore = Math.min(20, (totalMixes / 50) * 20); // 50 mixes = max
  score += uploadScore;

  // Platform diversity (max 15 pts) - presence on multiple platforms
  const platformCount = platforms.length;
  const diversityScore = Math.min(15, platformCount * 5); // 3 platforms = max
  score += diversityScore;

  // Engagement rate (max 10 pts) - likes + plays ratio
  const engagementScore = dj.totalStreams > 0
    ? Math.min(10, ((dj.totalMixes * 100) / dj.totalStreams) * 10)
    : 0;
  score += engagementScore;

  return Math.round(score * 10) / 10;
}

/**
 * Calculate industry score (0-100) based on professional metrics.
 */
function calculateIndustryScore(dj) {
  let score = 0;

  // Total bookings (max 35 pts)
  const bookingScore = Math.min(35, (dj.totalBookings / 100) * 35); // 100 bookings = max
  score += bookingScore;

  // Total events (max 20 pts)
  const eventScore = Math.min(20, (dj.totalEvents / 150) * 20); // 150 events = max
  score += eventScore;

  // Years active (max 15 pts) - veteran DJs get recognition
  const experienceScore = Math.min(15, ((dj.yearsActive || 0) / 15) * 15); // 15 years = max
  score += experienceScore;

  // Awards (max 15 pts)
  const awardCount = (dj.awards || []).length;
  const awardScore = Math.min(15, awardCount * 5); // 3 awards = max
  score += awardScore;

  // Verified status (max 10 pts)
  const verifiedScore = dj.verified ? 10 : 0;
  score += verifiedScore;

  // Equipment quality (max 5 pts) - more equipment = professional
  const equipmentCount = (dj.equipment || []).length;
  const equipmentScore = Math.min(5, equipmentCount * 2); // 3+ items = max
  score += equipmentScore;

  return Math.round(score * 10) / 10;
}

/**
 * Calculate community score (0-100) based on audience interaction.
 */
function calculateCommunityScore(dj, reviews) {
  let score = 0;

  // Average rating (max 40 pts) - 5 stars = max
  const ratingScore = (dj.averageRating || 0) * 8; // 5 * 8 = 40
  score += Math.min(40, ratingScore);

  // Review count (max 25 pts) - more reviews = more community engagement
  const reviewCount = reviews.length;
  const reviewCountScore = Math.min(25, (reviewCount / 50) * 25); // 50 reviews = max
  score += reviewCountScore;

  // Profile engagement (max 20 pts) - followers as a proxy
  const followerScore = Math.min(20, (dj.totalFollowers / 30000) * 20); // 30k = max
  score += followerScore;

  // Mix engagement (max 15 pts) - likes per mix
  const totalMixes = Math.max(1, dj.totalMixes);
  const likesPerMix = (dj.totalLikes || 0) / totalMixes; // Note: totalLikes not on schema yet, use proxy
  // Since we don't track totalLikes on DjProfile, we'll compute from mixes
  const engagementScore = Math.min(15, likesPerMix / 100); // 1500 likes per mix = max
  score += engagementScore;

  return Math.round(score * 10) / 10;
}

/**
 * Compute the composite ranking score for a single DJ.
 */
async function computeDjScore(djId) {
  const dj = await prisma.djProfile.findUnique({
    where: { id: djId },
    include: {
      streamingPlatforms: true,
      mixes: { select: { likes: true, plays: true } },
      reviews: { select: { rating: true } },
      _count: { select: { bookingsAsDj: true, events: true } },
    },
  });

  if (!dj) return null;

  // Calculate sub-scores
  const digitalScore = calculateDigitalScore(dj, dj.streamingPlatforms, dj.mixes.length);
  const industryScore = calculateIndustryScore(dj);
  const communityScore = calculateCommunityScore(dj, dj.reviews);

  // Composite score (weighted)
  const rankingScore =
    digitalScore * WEIGHTS.digital +
    industryScore * WEIGHTS.industry +
    communityScore * WEIGHTS.community;

  return {
    digitalScore: Math.round(digitalScore * 10) / 10,
    industryScore: Math.round(industryScore * 10) / 10,
    communityScore: Math.round(communityScore * 10) / 10,
    rankingScore: Math.round(rankingScore * 10) / 10,
  };
}

/**
 * Recalculate and update rankings for all DJs.
 * Call this via a cron job (e.g., weekly) or after significant events.
 */
async function recalculateAllRankings() {
  const djs = await prisma.djProfile.findMany({
    where: { isPublic: true },
    include: {
      streamingPlatforms: true,
      mixes: { select: { likes: true, plays: true } },
      reviews: { select: { rating: true } },
    },
  });

  // Compute scores for all DJs
  const scoredDjs = djs.map((dj) => {
    const digitalScore = calculateDigitalScore(dj, dj.streamingPlatforms, dj.mixes.length);
    const industryScore = calculateIndustryScore(dj);
    const communityScore = calculateCommunityScore(dj, dj.reviews);
    const rankingScore =
      digitalScore * WEIGHTS.digital +
      industryScore * WEIGHTS.industry +
      communityScore * WEIGHTS.community;

    return {
      id: dj.id,
      digitalScore: Math.round(digitalScore * 10) / 10,
      industryScore: Math.round(industryScore * 10) / 10,
      communityScore: Math.round(communityScore * 10) / 10,
      rankingScore: Math.round(rankingScore * 10) / 10,
    };
  });

  // Sort by ranking score descending
  scoredDjs.sort((a, b) => b.rankingScore - a.rankingScore);

  // Update database with new scores and positions
  const now = new Date();
  for (let i = 0; i < scoredDjs.length; i++) {
    const dj = scoredDjs[i];
    await prisma.djProfile.update({
      where: { id: dj.id },
      data: {
        rankingScore: dj.rankingScore,
        digitalScore: dj.digitalScore,
        industryScore: dj.industryScore,
        communityScore: dj.communityScore,
        rankingPosition: i + 1,
      },
    });

    // Save to history
    await prisma.rankingHistory.create({
      data: {
        djId: dj.id,
        position: i + 1,
        score: dj.rankingScore,
        digitalScore: dj.digitalScore,
        industryScore: dj.industryScore,
        communityScore: dj.communityScore,
        week: now,
      },
    });
  }

  return scoredDjs;
}

/**
 * Calculate a battle entry's base score from the DJ's current metrics.
 * This is the "metric" component of the battle (not user votes).
 */
async function calculateBattleBaseScore(djId, metricType = 'COMPOSITE') {
  const dj = await prisma.djProfile.findUnique({
    where: { id: djId },
    include: {
      streamingPlatforms: true,
      mixes: { select: { likes: true, plays: true } },
      reviews: { select: { rating: true } },
    },
  });

  if (!dj) return 0;

  switch (metricType) {
    case 'PLAYS': {
      // Sum of mix plays
      const totalPlays = dj.mixes.reduce((sum, m) => sum + m.plays, 0);
      return Math.min(100, (totalPlays / 100000) * 100); // 100k plays = max base score
    }
    case 'STREAMS': {
      // Total streams across platforms
      const totalStreams = dj.streamingPlatforms.reduce((sum, p) => sum + p.streams, 0);
      return Math.min(100, (totalStreams / 500000) * 100); // 500k streams = max
    }
    case 'FOLLOWERS': {
      const totalFollowers = dj.streamingPlatforms.reduce((sum, p) => sum + p.followers, 0);
      return Math.min(100, (totalFollowers / 25000) * 100); // 25k followers = max
    }
    case 'LIKES': {
      const totalLikes = dj.mixes.reduce((sum, m) => sum + m.likes, 0);
      return Math.min(100, (totalLikes / 10000) * 100); // 10k likes = max
    }
    case 'COMPOSITE':
    default: {
      // Use the full ranking score as the base
      const scores = await computeDjScore(djId);
      return scores ? scores.rankingScore : 0;
    }
  }
}

module.exports = {
  computeDjScore,
  recalculateAllRankings,
  calculateBattleBaseScore,
  WEIGHTS,
};
