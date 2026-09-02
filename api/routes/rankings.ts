const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { withCache } = require('../utils/redis');
const {
  calculateFollowerScore,
  calculateRatingScore,
  calculateMixEngagementScore,
  calculateBookingScore,
  WEIGHTS_V2,
} = require('../utils/rankingAlgorithm');
const { ok, fail } = require('../utils/response');

const router = express.Router();

const rankingFilterSchema = z.object({
  city: z.string().optional(),
  genre: z.string().optional(),
  timeframe: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

/**
 * Compute real DJ metrics and scores from actual database records.
 * Never trusts stored fake/seeded values on djProfile.
 */
function computeRealDjMetrics(dj) {
  // Real counts computed from actual related records
  const totalFollowers = dj._count?.followers ?? 0;
  const totalMixes = dj.mixes?.length ?? 0;
  const totalEvents = dj._count?.events ?? 0;
  const totalBookings = dj.bookingsAsDj?.length ?? 0;
  const mixPlays =
    dj.mixes?.reduce((sum, m) => sum + (m.plays || 0), 0) ?? 0;
  const externalStreams =
    dj.streamingPlatforms?.reduce((sum, p) => sum + (p.streams || 0), 0) ?? 0;
  const totalStreams = Math.max(dj.totalStreams || 0, mixPlays + externalStreams);
  const averageRating =
    dj.reviews?.length > 0
      ? dj.reviews.reduce((sum, r) => sum + r.rating, 0) / dj.reviews.length
      : 0;

  // Build a DJ object with real counts so calculator functions use real data
  const djWithRealCounts = {
    ...dj,
    totalFollowers,
    totalStreams,
    totalMixes,
    totalEvents,
    totalBookings,
    averageRating,
  };

  // Compute sub-scores from real data
  const followerScore = calculateFollowerScore(
    djWithRealCounts,
    dj.streamingPlatforms || []
  );
  const ratingScore = calculateRatingScore(
    djWithRealCounts,
    dj.reviews || []
  );
  const mixScore = calculateMixEngagementScore(
    djWithRealCounts,
    dj.mixes || []
  );
  const bookingScore = calculateBookingScore(
    djWithRealCounts,
    dj.bookingsAsDj || []
  );

  // Battle score computed from badges (no extra DB query per DJ)
  const badges = dj.badges || [];
  const wins = badges.filter((b) => b === 'Battle Champion').length;
  const runnerUps = badges.filter((b) => b === 'Battle Runner-Up').length;
  const thirdPlaces = badges.filter((b) => b === 'Battle Third Place').length;
  const battleScore =
    Math.min(50, wins * 10) +
    Math.min(25, runnerUps * 5) +
    Math.min(15, thirdPlaces * 3);

  // Composite ranking score
  const compositeScore =
    followerScore * WEIGHTS_V2.followers +
    ratingScore * WEIGHTS_V2.ratings +
    mixScore * WEIGHTS_V2.mixEngagement +
    bookingScore * WEIGHTS_V2.bookings +
    battleScore * WEIGHTS_V2.battles;

  return {
    ...djWithRealCounts,
    username: dj.user?.username,
    // Override any stored fake scores with real computed values
    rankingScore: Math.round(compositeScore * 10) / 10,
    digitalScore: Math.round((followerScore + mixScore) * 10) / 10,
    industryScore: Math.round((bookingScore + battleScore) * 10) / 10,
    communityScore: Math.round(ratingScore * 10) / 10,
    followerScore: Math.round(followerScore * 10) / 10,
    ratingScore: Math.round(ratingScore * 10) / 10,
    mixScore: Math.round(mixScore * 10) / 10,
    bookingScore: Math.round(bookingScore * 10) / 10,
    battleScore: Math.round(battleScore * 10) / 10,
  };
}

// GET /api/rankings - Get ranked DJs (real computed scores only)
router.get('/', async (req, res) => {
  try {
    const parsed = rankingFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid filter parameters');
    }

    const { city, genre, page, limit } = parsed.data;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `rankings:list:${city || 'all'}:${genre || 'all'}:${pageNum}:${limitNum}`;

    const result = await withCache(cacheKey, 900, async () => {
      const where: any = { isPublic: true };
      if (city) where.city = { contains: city, mode: 'insensitive' };
      if (genre) where.genres = { has: genre };

      // Phase 2: paginate by the pre-computed rankingScore instead of loading all DJs.
      const [djs, total] = await Promise.all([
        prisma.djProfile.findMany({
          where,
          orderBy: { rankingScore: 'desc' },
          skip,
          take: limitNum,
          include: {
            user: { select: { username: true } },
            mixes: { select: { plays: true, likes: true, createdAt: true } },
            streamingPlatforms: { select: { followers: true, streams: true } },
            bookingsAsDj: { select: { status: true, budget: true } },
            reviews: { select: { rating: true, verified: true } },
            _count: {
              select: {
                followers: true,
                events: true,
              },
            },
          },
        }),
        prisma.djProfile.count({ where }),
      ]);

      // Re-compute live sub-scores for the small returned page.
      // Stored rankingScore drives pagination; live metrics provide sub-score details.
      const computedDjs = djs.map(computeRealDjMetrics);
      computedDjs.sort((a, b) => b.rankingScore - a.rankingScore);

      // Fetch last week's history to compute trend (scoreChange) for page DJs only.
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const pageDjIds = computedDjs.map((d) => d.id);
      const lastWeekHistory: any = await prisma.rankingHistory.findMany({
        where: {
          djId: { in: pageDjIds },
          week: { gte: oneWeekAgo },
        },
        orderBy: { week: 'desc' },
        distinct: ['djId'],
        select: { djId: true, score: true },
      });
      const historyMap = new Map<string, any>(lastWeekHistory.map((h: any) => [h.djId, h]));

      const ranked = computedDjs.map((dj, index) => {
        const last: any = historyMap.get(dj.id);
        const scoreChange = last ? dj.rankingScore - last.score : 0;
        return {
          ...dj,
          rankingPosition: skip + index + 1,
          trend: Math.round(scoreChange * 10) / 10,
        };
      });

      return {
        success: true,
        data: ranked,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    });

    return res.json(result);
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

// GET /api/rankings/overview - Ranking stats (all real data)
router.get('/overview', async (req, res) => {
  try {
    const result = await withCache('rankings:overview', 900, async () => {
      // Phase 2: only fetch a top pool by stored rankingScore instead of all DJs.
      const djs = await prisma.djProfile.findMany({
        where: { isPublic: true },
        orderBy: { rankingScore: 'desc' },
        take: 200,
        include: {
          user: { select: { username: true } },
          mixes: { select: { plays: true, likes: true, createdAt: true } },
          streamingPlatforms: { select: { followers: true, streams: true } },
          bookingsAsDj: { select: { status: true, budget: true } },
          reviews: { select: { rating: true, verified: true } },
          _count: {
            select: {
              followers: true,
              events: true,
            },
          },
        },
      });

      const computedDjs = djs.map(computeRealDjMetrics);

      // Top DJs by real composite ranking score
      const topDjs = [...computedDjs]
        .sort((a, b) => b.rankingScore - a.rankingScore)
        .slice(0, 3);

      // Fastest rising: real current score vs last week's history
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const djIds = computedDjs.map((d) => d.id);
      const lastWeekHistory: any = await prisma.rankingHistory.findMany({
        where: {
          djId: { in: djIds },
          week: { gte: oneWeekAgo },
        },
        orderBy: { week: 'desc' },
        distinct: ['djId'],
        select: { djId: true, score: true, position: true },
      });
      const historyMap = new Map(
        lastWeekHistory.map((h: any) => [h.djId, h])
      );
      const fastestRising = [...computedDjs]
        .map((dj) => {
          const last: any = historyMap.get(dj.id);
          const scoreChange = last ? dj.rankingScore - last.score : 0;
          const positionChange = last
            ? last.position - dj.rankingPosition
            : 0;
          return { ...dj, scoreChange, positionChange };
        })
        .sort((a, b) => b.scoreChange - a.scoreChange)
        .slice(0, 3);

      // Most booked by real booking count
      const mostBooked = [...computedDjs]
        .sort((a, b) => b.totalBookings - a.totalBookings)
        .slice(0, 3);

      // Most streamed by real stream count
      const mostStreamed = [...computedDjs]
        .sort((a, b) => b.totalStreams - a.totalStreams)
        .slice(0, 3);

      return {
        success: true,
        data: {
          topDjs,
          fastestRising,
          mostBooked,
          mostStreamed,
        },
      };
    });

    return res.json(result);
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

// GET /api/rankings/:djId/history - Ranking history for a DJ
router.get('/:djId/history', async (req, res) => {
  try {
    const history = await prisma.rankingHistory.findMany({
      where: { djId: req.params.djId },
      orderBy: { week: 'asc' },
    });

    return ok(res, history);
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

module.exports = router;
