const { prisma } = require('./prisma');

/**
 * Enhanced Deck Salone Ranking Algorithm v2
 * ==========================================
 * An extended, battle-aware ranking formula that computes a composite
 * score (0–100) for each DJ based on five weighted dimensions:
 *
 * 1. Follower Score     (20%) — total followers + platform diversity
 * 2. Rating Score       (20%) — average rating + review volume
 * 3. Mix Engagement     (25%) — total plays + likes per mix + upload consistency
 * 4. Booking Score      (20%) — total bookings + booking completion rate
 * 5. Battle Score       (15%) — battle wins + top-3 finishes + entry count
 *
 * The algorithm is designed to be transparent, resistant to gaming,
 * and rewards DJs who are active across the platform (uploads, bookings,
 * battles) rather than just those with large external followings.
 */

const WEIGHTS_V2 = {
  followers: 0.20,
  ratings: 0.20,
  mixEngagement: 0.25,
  bookings: 0.20,
  battles: 0.15,
};

/* ──────────────────── Sub-score calculators ──────────────────── */

function calculateFollowerScore(dj, platforms) {
  let score = 0;

  // Total followers (max 60 pts) — 100k followers = max
  const totalFollowers = platforms.reduce((sum, p) => sum + (p.followers || 0), 0);
  score += Math.min(60, (totalFollowers / 100000) * 60);

  // Platform diversity (max 25 pts) — presence on 5+ platforms = max
  const platformCount = platforms.length;
  score += Math.min(25, platformCount * 5);

  // Follower growth proxy: totalStreams / followers ratio (max 15 pts)
  const totalStreams = platforms.reduce((sum, p) => sum + (p.streams || 0), 0);
  const streamFollowerRatio = totalFollowers > 0 ? totalStreams / totalFollowers : 0;
  score += Math.min(15, streamFollowerRatio * 3);

  return Math.round(score * 10) / 10;
}

function calculateRatingScore(dj, reviews) {
  let score = 0;
  const reviewCount = reviews.length;

  // Average rating (max 50 pts) — 5.0 stars = max
  const avgRating = dj.averageRating || 0;
  score += Math.min(50, avgRating * 10);

  // Review volume (max 30 pts) — 50 reviews = max
  score += Math.min(30, (reviewCount / 50) * 30);

  // Verified reviews bonus (max 20 pts)
  const verifiedCount = reviews.filter((r) => r.verified).length;
  score += Math.min(20, (verifiedCount / 20) * 20);

  return Math.round(score * 10) / 10;
}

function calculateMixEngagementScore(dj, mixes) {
  let score = 0;
  const totalMixes = Math.max(1, mixes.length);
  const totalPlays = mixes.reduce((sum, m) => sum + (m.plays || 0), 0);
  const totalLikes = mixes.reduce((sum, m) => sum + (m.likes || 0), 0);

  // Total plays (max 35 pts) — 500k plays = max
  score += Math.min(35, (totalPlays / 500000) * 35);

  // Likes per mix (max 25 pts) — 1k likes per mix = max
  const likesPerMix = totalLikes / totalMixes;
  score += Math.min(25, (likesPerMix / 1000) * 25);

  // Upload consistency (max 25 pts) — 50 mixes = max
  score += Math.min(25, (totalMixes / 50) * 25);

  // Recency bonus: mixes uploaded in last 30 days (max 15 pts)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentMixes = mixes.filter((m) => new Date(m.createdAt) >= thirtyDaysAgo).length;
  score += Math.min(15, recentMixes * 3);

  // Monthly listeners bonus (max 10 pts) — 50k monthly listeners = max
  const monthlyListeners = dj.monthlyListeners || 0;
  score += Math.min(10, (monthlyListeners / 50000) * 10);

  return Math.round(score * 10) / 10;
}

function calculateBookingScore(dj, bookings) {
  let score = 0;
  const totalBookings = bookings.length;

  // Total bookings (max 50 pts) — 100 bookings = max
  score += Math.min(50, (totalBookings / 100) * 50);

  // Completion rate (max 30 pts) — 90%+ completion = max
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED').length;
  const completionRate = totalBookings > 0 ? completedBookings / totalBookings : 0;
  score += Math.min(30, completionRate * 33.33);

  // Average booking value (max 20 pts) — 5k+ SLE = max
  const avgBudget = totalBookings > 0
    ? bookings.reduce((sum, b) => sum + (b.budget || 0), 0) / totalBookings
    : 0;
  score += Math.min(20, (avgBudget / 5000) * 20);

  return Math.round(score * 10) / 10;
}

async function calculateBattleScore(djId) {
  let score = 0;

  // Count battle wins and top-3 finishes from badges
  const dj = await prisma.djProfile.findUnique({
    where: { id: djId },
    select: { badges: true },
  });

  const badges = dj?.badges || [];
  const wins = badges.filter((b) => b === 'Battle Champion').length;
  const runnerUps = badges.filter((b) => b === 'Battle Runner-Up').length;
  const thirdPlaces = badges.filter((b) => b === 'Battle Third Place').length;

  // Battle wins (max 50 pts) — 5 wins = max
  score += Math.min(50, wins * 10);

  // Runner-ups (max 25 pts) — 5 = max
  score += Math.min(25, runnerUps * 5);

  // Third places (max 15 pts) — 5 = max
  score += Math.min(15, thirdPlaces * 3);

  // Total battle entries (max 10 pts) — 10 entries = max
  const entryCount = await prisma.battleEntry.count({ where: { djId } });
  score += Math.min(10, entryCount);

  return Math.round(score * 10) / 10;
}

/* ──────────────────── Composite scoring ──────────────────── */

async function computeDjScoreV2(djId) {
  const dj = await prisma.djProfile.findUnique({
    where: { id: djId },
    select: {
      id: true,
      averageRating: true,
      monthlyListeners: true,
      streamingPlatforms: true,
      mixes: { select: { id: true, plays: true, likes: true, createdAt: true } },
      reviews: { select: { rating: true, verified: true } },
      bookingsAsDj: { select: { status: true, budget: true } },
      _count: { select: { bookingsAsDj: true, events: true } },
    },
  });

  if (!dj) return null;

  const followerScore = calculateFollowerScore(dj, dj.streamingPlatforms);
  const ratingScore = calculateRatingScore(dj, dj.reviews);
  const mixScore = calculateMixEngagementScore(dj, dj.mixes);
  const bookingScore = calculateBookingScore(dj, dj.bookingsAsDj);
  const battleScore = await calculateBattleScore(djId);

  const compositeScore =
    followerScore * WEIGHTS_V2.followers +
    ratingScore * WEIGHTS_V2.ratings +
    mixScore * WEIGHTS_V2.mixEngagement +
    bookingScore * WEIGHTS_V2.bookings +
    battleScore * WEIGHTS_V2.battles;

  return {
    djId: dj.id,
    followerScore: Math.round(followerScore * 10) / 10,
    ratingScore: Math.round(ratingScore * 10) / 10,
    mixScore: Math.round(mixScore * 10) / 10,
    bookingScore: Math.round(bookingScore * 10) / 10,
    battleScore: Math.round(battleScore * 10) / 10,
    compositeScore: Math.round(compositeScore * 10) / 10,
  };
}

/**
 * Recalculate enhanced rankings for all DJs in cursor-based batches.
 * Returns the full sorted leaderboard.
 */
async function recalculateAllRankingsV2() {
  const BATCH_SIZE = 100;
  const allScored = [];

  let cursor;
  do {
    const batch = await prisma.djProfile.findMany({
      where: { isPublic: true },
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        averageRating: true,
        monthlyListeners: true,
        badges: true,
        streamingPlatforms: true,
        mixes: { select: { id: true, plays: true, likes: true, createdAt: true } },
        reviews: { select: { rating: true, verified: true } },
        bookingsAsDj: { select: { status: true, budget: true } },
        _count: { select: { events: true } },
      },
    });

    for (const dj of batch) {
      const followerScore = calculateFollowerScore(dj, dj.streamingPlatforms);
      const ratingScore = calculateRatingScore(dj, dj.reviews);
      const mixScore = calculateMixEngagementScore(dj, dj.mixes);
      const bookingScore = calculateBookingScore(dj, dj.bookingsAsDj);

      // We need to calculate battle score per DJ, but doing a DB query per DJ
      // in a large batch is slow. We'll use the badge-based approach inline
      // since badges are already on the DJ profile.
      const badges = dj.badges || [];
      const wins = badges.filter((b) => b === 'Battle Champion').length;
      const runnerUps = badges.filter((b) => b === 'Battle Runner-Up').length;
      const thirdPlaces = badges.filter((b) => b === 'Battle Third Place').length;
      const battleScore =
        Math.min(50, wins * 10) +
        Math.min(25, runnerUps * 5) +
        Math.min(15, thirdPlaces * 3);
      // Note: entry count not included in batch mode for performance; use badge approximation

      const compositeScore =
        followerScore * WEIGHTS_V2.followers +
        ratingScore * WEIGHTS_V2.ratings +
        mixScore * WEIGHTS_V2.mixEngagement +
        bookingScore * WEIGHTS_V2.bookings +
        battleScore * WEIGHTS_V2.battles;

      allScored.push({
        id: dj.id,
        followerScore: Math.round(followerScore * 10) / 10,
        ratingScore: Math.round(ratingScore * 10) / 10,
        mixScore: Math.round(mixScore * 10) / 10,
        bookingScore: Math.round(bookingScore * 10) / 10,
        battleScore: Math.round(battleScore * 10) / 10,
        compositeScore: Math.round(compositeScore * 10) / 10,
      });
    }

    cursor = batch.length === BATCH_SIZE ? batch[batch.length - 1].id : undefined;
  } while (cursor);

  // Sort by composite score descending
  allScored.sort((a, b) => b.compositeScore - a.compositeScore);

  // Write scores in batches (transaction per batch)
  const now = new Date();
  for (let i = 0; i < allScored.length; i += BATCH_SIZE) {
    const batch = allScored.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((dj) =>
        prisma.djProfile.update({
          where: { id: dj.id },
          data: {
            rankingScore: dj.compositeScore,
            digitalScore: dj.followerScore + dj.mixScore, // legacy mapping
            industryScore: dj.bookingScore + dj.battleScore, // legacy mapping
            communityScore: dj.ratingScore, // legacy mapping
            rankingPosition: i + batch.indexOf(dj) + 1,
          },
        })
      )
    );

    await prisma.rankingHistory.createMany({
      data: batch.map((dj, idx) => ({
        djId: dj.id,
        position: i + idx + 1,
        score: dj.compositeScore,
        digitalScore: dj.followerScore + dj.mixScore,
        industryScore: dj.bookingScore + dj.battleScore,
        communityScore: dj.ratingScore,
        week: now,
      })),
      skipDuplicates: true,
    });
  }

  return allScored;
}

/**
 * Get DJs with the fastest rising scores (comparing current vs last week).
 */
async function getRisingDjs(limit = 10) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const currentRankings = await prisma.djProfile.findMany({
    where: { isPublic: true },
    orderBy: { rankingScore: 'desc' },
    take: 200, // pool to compare
    select: {
      id: true,
      stageName: true,
      avatar: true,
      rankingScore: true,
      rankingPosition: true,
    },
  });

  const djIds = currentRankings.map((d) => d.id);

  const lastWeekHistory = await prisma.rankingHistory.findMany({
    where: {
      djId: { in: djIds },
      week: { gte: oneWeekAgo },
    },
    orderBy: { week: 'desc' },
    distinct: ['djId'],
    select: { djId: true, score: true, position: true },
  });

  const historyMap = new Map(lastWeekHistory.map((h: any) => [h.djId, h]));

  const rising = currentRankings
    .map((dj) => {
      const last: any = historyMap.get(dj.id);
      const scoreChange = last ? dj.rankingScore - last.score : 0;
      const positionChange = last ? last.position - dj.rankingPosition : 0;
      return { ...dj, scoreChange, positionChange };
    })
    .sort((a, b) => b.scoreChange - a.scoreChange)
    .slice(0, limit);

  return rising;
}

/**
 * Get battle leaders — DJs with the most battle wins.
 */
async function getBattleLeaders(limit = 10) {
  const djs = await prisma.djProfile.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      stageName: true,
      avatar: true,
      badges: true,
      rankingScore: true,
    },
  });

  const leaders = djs
    .map((dj) => {
      const wins = (dj.badges || []).filter((b) => b === 'Battle Champion').length;
      return { ...dj, wins };
    })
    .filter((dj) => dj.wins > 0)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, limit);

  return leaders;
}

module.exports = {
  computeDjScoreV2,
  recalculateAllRankingsV2,
  getRisingDjs,
  getBattleLeaders,
  WEIGHTS_V2,
  calculateFollowerScore,
  calculateRatingScore,
  calculateMixEngagementScore,
  calculateBookingScore,
  calculateBattleScore,
};
