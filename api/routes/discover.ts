const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  recalculateAllRankingsV2,
  getRisingDjs,
  getBattleLeaders,
  computeDjScoreV2,
} = require('../utils/rankingAlgorithm');
const {
  discoverMixes,
  getTrendingMixes,
  getPersonalizedRecommendations,
  getHallOfFameCandidates,
} = require('../utils/mixDiscovery');
const { getActiveCampaigns, applyCampaignBoost } = require('../utils/campaignBoost');

const router = express.Router();

/* ──────────────────── Discovery filter schemas ──────────────────── */

const discoverMixesSchema = z.object({
  genre: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['discovery', 'newest', 'trending', 'plays', 'likes']).optional(),
});

const discoverDjsSchema = z.object({
  city: z.string().optional(),
  genre: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['ranking', 'followers', 'bookings', 'newest', 'mixes', 'rating']).optional(),
  minFee: z.string().optional(),
  maxFee: z.string().optional(),
});

/* ──────────────────── Mix Discovery ──────────────────── */

// GET /api/discover/mixes — Algorithmic mix discovery
router.get('/mixes', async (req, res) => {
  try {
    const parsed = discoverMixesSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { genre, category, search, page, limit, sortBy } = parsed.data;
    const result = await discoverMixes({
      genre,
      category,
      search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sortBy,
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/discover/mixes/trending — Trending mixes (last 7 days)
router.get('/mixes/trending', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const mixes = await getTrendingMixes(limitNum);
    return res.json({ success: true, data: mixes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/discover/mixes/for-you — Personalized recommendations (auth required)
router.get('/mixes/for-you', authMiddleware, async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const mixes = await getPersonalizedRecommendations(req.user.id, limitNum);
    return res.json({ success: true, data: mixes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/discover/mixes/hall-of-fame — High-quality mix candidates
router.get('/mixes/hall-of-fame', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const mixes = await getHallOfFameCandidates(limitNum);
    return res.json({ success: true, data: mixes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ──────────────────── DJ Discovery ──────────────────── */

// GET /api/discover/djs — Discover DJs with enhanced ranking + campaign boost
router.get('/djs', async (req, res) => {
  try {
    const parsed = discoverDjsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { city, genre, search, page, limit, sortBy, minFee, maxFee } = parsed.data;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isPublic: true };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (genre) where.genres = { has: genre };
    if (minFee) where.bookingFeeMin = { gte: parseFloat(minFee) };
    if (maxFee) where.bookingFeeMax = { lte: parseFloat(maxFee) };
    if (search) {
      where.OR = [
        { stageName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'followers') orderBy.followers = { _count: 'desc' };
    else if (sortBy === 'bookings') orderBy.bookingsAsDj = { _count: 'desc' };
    else if (sortBy === 'newest') orderBy.createdAt = 'desc';
    else if (sortBy === 'mixes') orderBy.mixes = { _count: 'desc' };
    else if (sortBy === 'rating') orderBy.averageRating = 'desc';
    else orderBy.createdAt = 'desc'; // Never sort by stale stored rankingScore

    // Fetch active profile promotion campaigns and apply the same filters to promoted DJs
    const [campaigns, promotedDjs] = await Promise.all([
      getActiveCampaigns('profile'),
      prisma.djProfile.findMany({
        where: { ...where, campaigns: { some: { targetType: 'profile', status: 'active' } } },
        include: {
          user: { select: { username: true } },
          streamingPlatforms: { select: { streams: true } },
          _count: { select: { mixes: true, bookingsAsDj: true, followers: true, events: true } },
        },
      }),
    ]);

    const [djs, total] = await Promise.all([
      prisma.djProfile.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          user: { select: { username: true } },
          streamingPlatforms: { select: { streams: true } },
          _count: { select: { mixes: true, bookingsAsDj: true, followers: true, events: true } },
        },
      }),
      prisma.djProfile.count({ where }),
    ]);

    const enrich = (dj: any, indexOffset = 0) => {
      const realTotalFollowers = dj._count.followers;
      const realTotalMixes = dj._count.mixes;
      const realTotalEvents = dj._count.events;
      const realTotalBookings = dj._count.bookingsAsDj;
      const realTotalStreams = dj.streamingPlatforms.reduce((sum, p) => sum + (p.streams || 0), 0);

      // Compute a real ranking score from actual data (never trust stored fake values)
      const followerScore = Math.min(20, realTotalFollowers / 50);
      const mixScore = Math.min(25, realTotalMixes * 2);
      const bookingScore = Math.min(20, realTotalBookings * 2);
      const streamScore = Math.min(15, realTotalStreams / 1000);
      const ratingScore = Math.min(20, (dj.averageRating || 0) * 4);
      const realRankingScore = Math.round((followerScore + mixScore + bookingScore + streamScore + ratingScore) * 10) / 10;

      return {
        ...dj,
        username: dj.user.username,
        totalFollowers: realTotalFollowers,
        totalMixes: realTotalMixes,
        totalEvents: realTotalEvents,
        totalBookings: realTotalBookings,
        totalStreams: realTotalStreams,
        mixCount: realTotalMixes,
        bookingCount: realTotalBookings,
        rankingScore: realRankingScore, // Override stored fake value
      };
    };

    const enriched = djs.map((dj, index) => ({
      ...enrich(dj),
      position: skip + index + 1,
    }));

    // Merge promoted DJs that may not already be in the paginated result, then apply boost sort
    const promotedEnriched = promotedDjs.map(enrich);
    const mergedMap = new Map<string, any>();
    for (const dj of promotedEnriched) mergedMap.set(dj.id, dj);
    for (const dj of enriched) if (!mergedMap.has(dj.id)) mergedMap.set(dj.id, dj);

    const boosted = applyCampaignBoost(Array.from(mergedMap.values()), campaigns, (dj) => dj.id);

    return res.json({
      success: true,
      data: boosted.slice(0, limitNum),
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/discover/djs/rising — Fastest rising DJs
router.get('/djs/rising', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const djs = await getRisingDjs(limitNum);
    return res.json({ success: true, data: djs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/discover/djs/battle-leaders — DJs with most battle wins
router.get('/djs/battle-leaders', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const djs = await getBattleLeaders(limitNum);
    return res.json({ success: true, data: djs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ──────────────────── Ranking Administration ──────────────────── */

// POST /api/discover/recalculate — Trigger full ranking recalculation (admin only)
router.post('/recalculate', authMiddleware, requireRole('ADMIN', 'MODERATOR'), async (req, res) => {
  try {
    const startedAt = Date.now();
    const result = await recalculateAllRankingsV2();
    const durationMs = Date.now() - startedAt;

    return res.json({
      success: true,
      data: {
        message: 'Rankings recalculated successfully',
        djsProcessed: result.length,
        durationMs,
        top3: result.slice(0, 3).map((dj) => ({
          id: dj.id,
          compositeScore: dj.compositeScore,
          battleScore: dj.battleScore,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/discover/rankings/:djId/score — Get detailed v2 score for a DJ
router.get('/rankings/:djId/score', async (req, res) => {
  try {
    const score = await computeDjScoreV2(req.params.djId);
    if (!score) {
      return res.status(404).json({ success: false, error: 'DJ not found' });
    }
    return res.json({ success: true, data: score });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
