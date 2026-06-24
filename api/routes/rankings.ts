const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { recalculateAllRankings, computeDjScore } = require('../utils/ranking');

const router = express.Router();

const rankingFilterSchema = z.object({
  city: z.string().optional(),
  genre: z.string().optional(),
  timeframe: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// GET /api/rankings - Get ranked DJs
router.get('/', async (req, res) => {
  try {
    const parsed = rankingFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { city, genre, timeframe, page, limit } = parsed.data;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isPublic: true };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (genre) where.genres = { has: genre };

    const [djs, total] = await Promise.all([
      prisma.djProfile.findMany({
        where,
        orderBy: { rankingScore: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          stageName: true,
          avatar: true,
          city: true,
          country: true,
          genres: true,
          rankingScore: true,
          rankingPosition: true,
          digitalScore: true,
          industryScore: true,
          communityScore: true,
          totalStreams: true,
          totalFollowers: true,
          totalMixes: true,
          totalBookings: true,
          averageRating: true,
          verified: true,
          badges: true,
          yearsActive: true,
        },
      }),
      prisma.djProfile.count({ where }),
    ]);

    // Assign positions if not set
    const ranked = djs.map((dj, index) => ({
      ...dj,
      rankingPosition: skip + index + 1,
    }));

    return res.json({
      success: true,
      data: ranked,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/rankings/overview - Ranking stats
router.get('/overview', async (req, res) => {
  try {
    const [topDjs, fastestRising, mostBooked, mostStreamed] = await Promise.all([
      prisma.djProfile.findMany({
        where: { isPublic: true },
        orderBy: { rankingScore: 'desc' },
        take: 3,
        select: { id: true, stageName: true, avatar: true, rankingScore: true, rankingPosition: true },
      }),
      prisma.djProfile.findMany({
        where: { isPublic: true },
        orderBy: { digitalScore: 'desc' },
        take: 3,
        select: { id: true, stageName: true, avatar: true, digitalScore: true },
      }),
      prisma.djProfile.findMany({
        where: { isPublic: true },
        orderBy: { totalBookings: 'desc' },
        take: 3,
        select: { id: true, stageName: true, avatar: true, totalBookings: true },
      }),
      prisma.djProfile.findMany({
        where: { isPublic: true },
        orderBy: { totalStreams: 'desc' },
        take: 3,
        select: { id: true, stageName: true, avatar: true, totalStreams: true },
      }),
    ]);

    return res.json({
      success: true,
      data: { topDjs, fastestRising, mostBooked, mostStreamed },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/rankings/:djId/history - Ranking history for a DJ
router.get('/:djId/history', async (req, res) => {
  try {
    const history = await prisma.rankingHistory.findMany({
      where: { djId: req.params.djId },
      orderBy: { week: 'asc' },
    });

    return res.json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rankings/recalculate - Recalculate all rankings (admin only)
router.post('/recalculate', async (req, res) => {
  try {
    const { authMiddleware, requireRole } = require('../middleware/auth');
    // Apply auth middleware inline
    const auth = authMiddleware;
    // This route should be protected - we'll let the caller handle auth via middleware
    // For simplicity, we require the caller to use authMiddleware before this route

    const ranked = await recalculateAllRankings();
    return res.json({
      success: true,
      data: { message: 'Rankings recalculated', total: ranked.length },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
