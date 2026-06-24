const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { requireRole } = require('../middleware/auth');
const { recalculateAllRankings } = require('../utils/ranking');

const router = express.Router();

// All routes require admin or moderator role
router.use(requireRole('ADMIN', 'MODERATOR', 'VERIFICATION_ADMIN', 'FINANCE_ADMIN'));

const userFilterSchema = z.object({
  role: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['USER', 'DJ', 'ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN']),
});

const rankingUpdateSchema = z.object({
  rankingScore: z.number().optional(),
  rankingPosition: z.number().int().optional(),
  digitalScore: z.number().optional(),
  industryScore: z.number().optional(),
  communityScore: z.number().optional(),
});

const featureMixSchema = z.object({
  featured: z.boolean(),
});

const bookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'NEGOTIATING', 'CONFIRMED', 'DEPOSIT_PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED']),
});

// GET /api/admin/stats - Platform-wide stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalDjs,
      totalMixes,
      totalStreams,
      totalBookings,
      totalEvents,
      totalReviews,
      pendingBookings,
      pendingVerifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.djProfile.count(),
      prisma.mix.count(),
      prisma.mix.aggregate({ _sum: { plays: true } }),
      prisma.booking.count(),
      prisma.event.count(),
      prisma.review.count(),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.djProfile.count({ where: { verified: false } }),
    ]);

    const bookingRevenue = await prisma.booking.aggregate({
      where: { status: { in: ['COMPLETED', 'DEPOSIT_PAID'] } },
      _sum: { finalPrice: true },
    });

    const totalPayments = await prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });

    const activeBattles = await prisma.battle.count({ where: { status: 'ACTIVE' } });

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalDjs,
        totalMixes,
        totalStreams: totalStreams._sum.plays || 0,
        totalBookings,
        totalEvents,
        totalReviews,
        pendingBookings,
        pendingVerifications,
        estimatedRevenue: bookingRevenue._sum.finalPrice || 0,
        totalPayments: totalPayments._sum.amount || 0,
        activeBattles,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
  try {
    const parsed = userFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { role, search, page, limit } = parsed.data;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          role: true,
          phone: true,
          phoneVerified: true,
          createdAt: true,
          djProfile: { select: { id: true, stageName: true, verified: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: users,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { role } = parsed.data;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/djs/pending - Get DJs pending verification
router.get('/djs/pending', async (req, res) => {
  try {
    const djs = await prisma.djProfile.findMany({
      where: { verified: false },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, createdAt: true } },
        streamingPlatforms: true,
      },
    });

    return res.json({ success: true, data: djs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/djs/:id/verify - Verify a DJ
router.put('/djs/:id/verify', async (req, res) => {
  try {
    const dj = await prisma.djProfile.update({
      where: { id: req.params.id },
      data: {
        verified: true,
        badges: { push: 'Verified DJ' },
      },
    });

    return res.json({ success: true, data: dj });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/bookings - List all bookings
router.get('/bookings', async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          client: { select: { id: true, email: true } },
          dj: { select: { id: true, stageName: true, avatar: true } },
          payments: true,
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return res.json({
      success: true,
      data: bookings,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/bookings/:id/status - Override booking status
router.put('/bookings/:id/status', async (req, res) => {
  try {
    const parsed = bookingStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { status } = parsed.data;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        client: { select: { id: true, email: true } },
        dj: { select: { id: true, stageName: true } },
        payments: true,
      },
    });

    return res.json({ success: true, data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/mixes/:id/feature - Feature/unfeature a mix
router.put('/mixes/:id/feature', async (req, res) => {
  try {
    const parsed = featureMixSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { featured } = parsed.data;
    const mix = await prisma.mix.update({
      where: { id: req.params.id },
      data: { featured },
    });

    return res.json({ success: true, data: mix });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/djs/:id/ranking - Manually update DJ ranking
router.put('/djs/:id/ranking', async (req, res) => {
  try {
    const parsed = rankingUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { rankingScore, rankingPosition, digitalScore, industryScore, communityScore } = parsed.data;

    const dj = await prisma.djProfile.update({
      where: { id: req.params.id },
      data: {
        ...(rankingScore !== undefined && { rankingScore: parseFloat(rankingScore) }),
        ...(rankingPosition !== undefined && { rankingPosition: parseInt(rankingPosition) }),
        ...(digitalScore !== undefined && { digitalScore: parseFloat(digitalScore) }),
        ...(industryScore !== undefined && { industryScore: parseFloat(industryScore) }),
        ...(communityScore !== undefined && { communityScore: parseFloat(communityScore) }),
      },
    });

    return res.json({ success: true, data: dj });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/rankings/recalculate - Trigger full ranking recalculation
router.post('/rankings/recalculate', async (req, res) => {
  try {
    const ranked = await recalculateAllRankings();
    return res.json({
      success: true,
      data: { message: 'Rankings recalculated successfully', totalDjs: ranked.length },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
