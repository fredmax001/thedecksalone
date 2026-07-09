const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { requireRole } = require('../middleware/auth');
const { recalculateAllRankings } = require('../utils/ranking');
const { activateSubscriptionFeatures, resetSubscriptionFeatures } = require('../middleware/permissions');

const router = express.Router();

const configuredProPrice = Number(process.env.PRO_SUBSCRIPTION_PRICE);
const PRO_SUBSCRIPTION_PRICE = Number.isFinite(configuredProPrice) && configuredProPrice > 0 ? configuredProPrice : 250;
const configuredLegendPrice = Number(process.env.LEGEND_SUBSCRIPTION_PRICE);
const LEGEND_SUBSCRIPTION_PRICE = Number.isFinite(configuredLegendPrice) && configuredLegendPrice > 0 ? configuredLegendPrice : 750;

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

const createAdSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  status: z.enum(['active', 'paused', 'draft']).default('draft'),
  budget: z.number().min(0).default(0),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

const campaignStatusSchema = z.object({
  status: z.enum(['pending_payment', 'active', 'paused', 'rejected', 'completed']),
  notes: z.string().optional(),
});

const verifyDjSchema = z.object({
  notes: z.string().optional(),
});

const subscriptionReviewSchema = z.object({
  note: z.string().max(500).optional(),
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
      totalFollowers,
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
      prisma.follow.count(),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.djProfile.count({ where: { verificationStatus: 'pending' } }),
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
        totalFollowers,
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

// GET /api/admin/djs/pending - Get DJs pending verification (legacy flag)
router.get('/djs/pending', async (req, res) => {
  try {
    const djs = await prisma.djProfile.findMany({
      where: { verificationStatus: 'pending' },
      orderBy: { updatedAt: 'desc' },
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

// GET /api/admin/djs/verification-requests - Get passport verification requests
router.get('/djs/verification-requests', async (req, res) => {
  try {
    const djs = await prisma.djProfile.findMany({
      where: { verificationStatus: { in: ['pending', 'info_requested', 'rejected'] } },
      orderBy: { updatedAt: 'desc' },
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

// PUT /api/admin/djs/:id/verify - Approve verification
router.put('/djs/:id/verify', async (req, res) => {
  try {
    const parsed = verifyDjSchema.safeParse(req.body);
    const notes = parsed.success ? parsed.data.notes : undefined;

    const dj = await prisma.djProfile.update({
      where: { id: req.params.id },
      data: {
        verified: true,
        verificationStatus: 'approved',
        isPublic: true,
        verifiedAt: new Date(),
        badges: { push: 'Verified DJ' },
        ...(notes && { verificationNotes: notes }),
      },
    });

    return res.json({ success: true, data: dj });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/djs/:id/reject - Reject verification
router.put('/djs/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }

    const dj = await prisma.djProfile.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: 'rejected',
        verificationNotes: reason,
      },
    });

    return res.json({ success: true, data: dj });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/djs/:id/request-info - Request more information
router.put('/djs/:id/request-info', async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes) {
      return res.status(400).json({ success: false, error: 'Request notes are required' });
    }

    const dj = await prisma.djProfile.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: 'info_requested',
        verificationNotes: notes,
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

// PUT /api/admin/djs/:id/hall-of-fame - Toggle DJ Hall of Fame status
router.put('/djs/:id/hall-of-fame', async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { id: req.params.id } });
    if (!dj) return res.status(404).json({ success: false, error: 'DJ not found' });

    const updated = await prisma.djProfile.update({
      where: { id: req.params.id },
      data: { hallOfFame: !dj.hallOfFame },
    });

    return res.json({ success: true, data: { id: updated.id, hallOfFame: updated.hallOfFame, stageName: updated.stageName } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/mixes/:id/hall-of-fame - Toggle Mix Hall of Fame status
router.put('/mixes/:id/hall-of-fame', async (req, res) => {
  try {
    const mix = await prisma.mix.findUnique({ where: { id: req.params.id } });
    if (!mix) return res.status(404).json({ success: false, error: 'Mix not found' });

    const updated = await prisma.mix.update({
      where: { id: req.params.id },
      data: { hallOfFame: !mix.hallOfFame },
    });

    return res.json({ success: true, data: { id: updated.id, hallOfFame: updated.hallOfFame, title: updated.title } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/mixes/:id - Delete a mix
router.delete('/mixes/:id', async (req, res) => {
  try {
    const mix = await prisma.mix.findUnique({ where: { id: req.params.id } });
    if (!mix) return res.status(404).json({ success: false, error: 'Mix not found' });

    await prisma.mix.delete({ where: { id: req.params.id } });

    return res.json({ success: true, data: { id: req.params.id, message: 'Mix deleted' } });
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

// GET /api/admin/analytics - Monthly platform analytics
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = start.toLocaleString('en-US', { month: 'short' });
      const [users, djs, mixes, bookings, revenue] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.djProfile.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.mix.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.booking.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.booking.aggregate({
          where: { createdAt: { gte: start, lt: end }, status: { in: ['COMPLETED', 'DEPOSIT_PAID'] } },
          _sum: { finalPrice: true },
        }),
      ]);
      months.push({
        month: label,
        users,
        djs,
        mixes,
        bookings,
        revenue: Math.round(revenue._sum.finalPrice || 0),
      });
    }
    return res.json({ success: true, data: months });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/payments - All payments with pagination
router.get('/payments', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          booking: { select: { id: true, eventType: true } },
          client: { select: { id: true, email: true } },
        },
      }),
      prisma.payment.count(),
    ]);

    return res.json({
      success: true,
      data: payments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/pro-subscription-requests - Manual Orange Money Pro requests
router.get('/pro-subscription-requests', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where = status && status !== 'all' ? { status } : {};

    const requests = await prisma.proSubscriptionRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        dj: {
          select: {
            id: true,
            stageName: true,
            avatar: true,
            isPro: true,
            subscriptionTier: true,
            user: { select: { id: true, email: true, phone: true } },
          },
        },
      },
    });

    return res.json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/pro-subscription-requests/:id/approve - Activate Pro
router.post('/pro-subscription-requests/:id/approve', async (req, res) => {
  try {
    const parsed = subscriptionReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const request = await prisma.proSubscriptionRequest.findUnique({
      where: { id: req.params.id },
      include: { dj: true },
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Subscription request not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Activate all subscription features based on tier
      await activateSubscriptionFeatures(request.dj.userId, request.plan);

      return tx.proSubscriptionRequest.update({
        where: { id: request.id },
        data: {
          status: 'approved',
          reviewedById: req.user.id,
          adminNote: parsed.data.note || null,
          reviewedAt: new Date(),
        },
        include: {
          dj: {
            select: {
              id: true,
              stageName: true,
              avatar: true,
              isPro: true,
              subscriptionTier: true,
              canReceivePayments: true,
              canViewAnalytics: true,
              isVerifiedEligible: true,
              isLegendFeatured: true,
              user: { select: { id: true, email: true, phone: true } },
            },
          },
        },
      });
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/pro-subscription-requests/:id/reject - Reject proof
router.post('/pro-subscription-requests/:id/reject', async (req, res) => {
  try {
    const parsed = subscriptionReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const request = await prisma.proSubscriptionRequest.findUnique({ where: { id: req.params.id } });
    if (!request) {
      return res.status(404).json({ success: false, error: 'Subscription request not found' });
    }

    const updated = await prisma.proSubscriptionRequest.update({
      where: { id: request.id },
      data: {
        status: 'rejected',
        reviewedById: req.user.id,
        adminNote: parsed.data.note || null,
        reviewedAt: new Date(),
      },
      include: {
        dj: {
          select: {
            id: true,
            stageName: true,
            avatar: true,
            isPro: true,
            subscriptionTier: true,
            user: { select: { id: true, email: true, phone: true } },
          },
        },
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/messages - Recent message threads overview
router.get('/messages', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: { id: true, email: true } },
        receiver: { select: { id: true, email: true } },
      },
    });

    const threadMap = new Map();
    messages.forEach((m) => {
      const pair = [m.senderId, m.receiverId].sort().join('_');
      if (!threadMap.has(pair)) {
        threadMap.set(pair, {
          pair,
          sender: m.sender.email,
          receiver: m.receiver.email,
          latestMessage: m.content.slice(0, 80),
          latestAt: m.createdAt,
          unread: !m.readAt ? 1 : 0,
          count: 1,
        });
      } else {
        const t = threadMap.get(pair);
        t.count++;
        if (!m.readAt) t.unread++;
      }
    });

    return res.json({ success: true, data: Array.from(threadMap.values()) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/staff - Users with elevated roles
router.get('/staff', async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });
    return res.json({ success: true, data: staff });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/platforms - Aggregated streaming platform data
router.get('/platforms', async (req, res) => {
  try {
    const platforms = await prisma.streamingPlatform.groupBy({
      by: ['platform'],
      _sum: { followers: true, streams: true, uploads: true },
      _count: { platform: true },
    });

    const data = platforms.map((p) => ({
      name: p.platform,
      followers: p._sum.followers || 0,
      streams: p._sum.streams || 0,
      uploads: p._sum.uploads || 0,
      djs: p._count.platform,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/system - System health
router.get('/system', async (req, res) => {
  try {
    const [userCount, djCount, mixCount, bookingCount, eventCount, reviewCount] = await Promise.all([
      prisma.user.count(),
      prisma.djProfile.count(),
      prisma.mix.count(),
      prisma.booking.count(),
      prisma.event.count(),
      prisma.review.count(),
    ]);

    const dbStatus = 'connected';
    const uptime = Math.floor(process.uptime());

    return res.json({
      success: true,
      data: {
        dbStatus,
        uptime,
        counts: { users: userCount, djs: djCount, mixes: mixCount, bookings: bookingCount, events: eventCount, reviews: reviewCount },
        memory: process.memoryUsage(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/djs - All DJs with full stats
router.get('/djs', async (req, res) => {
  try {
    const { search, verified, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (verified !== undefined) where.verified = verified === 'true';
    if (search) {
      where.OR = [
        { stageName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [djs, total] = await Promise.all([
      prisma.djProfile.findMany({
        where,
        orderBy: { rankingPosition: 'asc' },
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, email: true, createdAt: true } },
          mixes: { select: { id: true } },
          bookingsAsDj: { select: { id: true, status: true } },
          streamingPlatforms: true,
          followers: { select: { id: true } },
        },
      }),
      prisma.djProfile.count({ where }),
    ]);

    const data = djs.map((dj) => ({
      id: dj.id,
      userId: dj.userId,
      email: dj.user.email,
      stageName: dj.stageName,
      city: dj.city,
      verified: dj.verified,
      isPublic: dj.isPublic,
      hallOfFame: dj.hallOfFame,
      rankingPosition: dj.rankingPosition,
      rankingScore: dj.rankingScore,
      totalStreams: dj.streamingPlatforms.reduce((sum: number, p: any) => sum + (p.streams || 0), 0),
      totalFollowers: dj.followers.length,
      totalMixes: dj.mixes.length,
      totalBookings: dj.bookingsAsDj.length,
      completedBookings: dj.bookingsAsDj.filter((b: any) => b.status === 'COMPLETED').length,
      avatar: dj.avatar,
      genres: dj.genres,
      createdAt: dj.user.createdAt,
    }));

    return res.json({
      success: true,
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/djs/:id/suspend - Toggle DJ visibility (suspend)
router.put('/djs/:id/suspend', async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { id: req.params.id } });
    if (!dj) return res.status(404).json({ success: false, error: 'DJ not found' });

    const updated = await prisma.djProfile.update({
      where: { id: req.params.id },
      data: { isPublic: !dj.isPublic },
    });

    return res.json({ success: true, data: { isPublic: updated.isPublic, suspended: !updated.isPublic } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/djs/:id - Delete DJ and associated data
router.delete('/djs/:id', async (req, res) => {
  try {
    await prisma.djProfile.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'DJ deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/mixes - All mixes with full details
router.get('/mixes', async (req, res) => {
  try {
    const { featured, search, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (featured !== undefined) where.featured = featured === 'true';
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [mixes, total] = await Promise.all([
      prisma.mix.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          dj: { select: { id: true, stageName: true } },
        },
      }),
      prisma.mix.count({ where }),
    ]);

    return res.json({
      success: true,
      data: mixes,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/events - All events
router.get('/events', async (req, res) => {
  try {
    const { status, city, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (city) where.city = { contains: city, mode: 'insensitive' };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
        include: {
          dj: { select: { id: true, stageName: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return res.json({
      success: true,
      data: events,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/rankings - Top 100 DJs with scores
router.get('/rankings', async (req, res) => {
  try {
    const djs = await prisma.djProfile.findMany({
      where: { rankingPosition: { gt: 0 } },
      orderBy: { rankingPosition: 'asc' },
      take: 100,
      include: {
        streamingPlatforms: { select: { streams: true } },
        followers: { select: { id: true } },
      },
    });

    const data = djs.map((dj: any) => ({
      id: dj.id,
      stageName: dj.stageName,
      avatar: dj.avatar,
      city: dj.city,
      rankingPosition: dj.rankingPosition,
      rankingScore: dj.rankingScore,
      digitalScore: dj.digitalScore,
      industryScore: dj.industryScore,
      communityScore: dj.communityScore,
      totalStreams: dj.streamingPlatforms.reduce((sum: number, p: any) => sum + (p.streams || 0), 0),
      totalFollowers: dj.followers.length,
      verified: dj.verified,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/rankings/history - Ranking history for a DJ
router.get('/rankings/history', async (req, res) => {
  try {
    const { djId } = req.query;
    if (!djId) return res.status(400).json({ success: false, error: 'djId required' });

    const history = await prisma.rankingHistory.findMany({
      where: { djId: djId as string },
      orderBy: { week: 'desc' },
      take: 12,
    });

    return res.json({ success: true, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/notifications - Recent system notifications (derived from DB activity)
router.get('/notifications', async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 20);

    const [latestUsers, pendingDjs, latestBookings, latestMixes, latestEvents] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, email: true, role: true, createdAt: true } }),
      prisma.djProfile.findMany({ where: { verified: false }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, stageName: true, createdAt: true } }),
      prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { client: { select: { email: true } }, dj: { select: { stageName: true } } } }),
      prisma.mix.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { dj: { select: { stageName: true } } } }),
      prisma.event.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, title: true, createdAt: true } }),
    ]);

    const notifications = [
      ...latestUsers.map((u) => ({ id: `user-${u.id}`, type: 'user', title: 'New User Registration', message: `${u.email} joined as ${u.role.toLowerCase()}`, createdAt: u.createdAt, read: false })),
      ...pendingDjs.map((d) => ({ id: `verify-${d.id}`, type: 'verification', title: 'DJ Verification Request', message: `${d.stageName} is awaiting verification`, createdAt: d.createdAt, read: false })),
      ...latestBookings.map((b) => ({ id: `booking-${b.id}`, type: 'booking', title: `New Booking — ${b.status}`, message: `${b.client?.email || 'A client'} booked ${b.dj?.stageName || 'a DJ'}`, createdAt: b.createdAt, read: false })),
      ...latestMixes.map((m) => ({ id: `mix-${m.id}`, type: 'mix', title: 'New Mix Uploaded', message: `${m.title} by ${m.dj?.stageName || 'Unknown'}`, createdAt: m.createdAt, read: false })),
      ...latestEvents.map((e) => ({ id: `event-${e.id}`, type: 'event', title: 'New Event Created', message: e.title, createdAt: e.createdAt, read: false })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);

    return res.json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/notifications - Send a notification (in-memory only for now)
router.post('/notifications', async (req, res) => {
  try {
    const { type, target, title, message, scheduled } = req.body;
    if (!type || !title || !message) {
      return res.status(400).json({ success: false, error: 'type, title, and message are required' });
    }
    return res.json({ success: true, data: { id: `notif-${Date.now()}`, type, target, title, message, scheduled: scheduled || null, sentAt: new Date().toISOString() } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/security-logs - Security events from DB activity
router.get('/security-logs', async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 20);

    const [recentUsers, roleChanges, failedBookings, suspendedDjs] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, email: true, role: true, createdAt: true } }),
      prisma.user.findMany({ where: { role: { in: ['ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN'] } }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, email: true, role: true, createdAt: true } }),
      prisma.booking.findMany({ where: { status: 'CANCELLED' }, orderBy: { createdAt: 'desc' }, take: 5, include: { client: { select: { email: true } } } }),
      prisma.djProfile.findMany({ where: { isPublic: false }, orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, stageName: true, updatedAt: true } }),
    ]);

    const logs = [
      ...recentUsers.map((u) => ({ id: `login-${u.id}`, event: 'User Registration', user: u.email, details: `Role: ${u.role}`, severity: 'info', createdAt: u.createdAt })),
      ...roleChanges.map((u) => ({ id: `role-${u.id}`, event: 'Role Assignment', user: u.email, details: `Assigned ${u.role} role`, severity: 'warning', createdAt: u.createdAt })),
      ...failedBookings.map((b) => ({ id: `cancel-${b.id}`, event: 'Booking Cancelled', user: b.client?.email || 'Unknown', details: `Booking ${b.id.slice(0, 8)} cancelled`, severity: 'warning', createdAt: b.createdAt })),
      ...suspendedDjs.map((d) => ({ id: `suspend-${d.id}`, event: 'DJ Suspended', user: d.stageName, details: 'Profile set to not public', severity: 'critical', createdAt: d.updatedAt })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);

    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/subscriptions - Subscription overview (derived from DJ tiers)
router.get('/subscriptions', async (req, res) => {
  try {
    const [djCount, proDjCount, legendDjCount, pendingRequests, approvedRevenue, activeBookings] = await Promise.all([
      prisma.djProfile.count(),
      prisma.djProfile.count({ where: { subscriptionTier: 'pro' } }),
      prisma.djProfile.count({ where: { subscriptionTier: 'legend' } }),
      prisma.proSubscriptionRequest.count({ where: { status: 'pending' } }),
      prisma.proSubscriptionRequest.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
      prisma.booking.count({ where: { status: { in: ['PENDING', 'NEGOTIATING', 'CONFIRMED'] } } }),
    ]);

    const plans = [
      { id: 'free', name: 'Free Tier', price: 0, users: djCount - proDjCount - legendDjCount, features: ['Basic profile', 'Limited uploads'] },
      { id: 'pro', name: 'Pro DJ', price: PRO_SUBSCRIPTION_PRICE, users: proDjCount, features: ['Unlimited uploads', 'Priority discovery', 'Advanced analytics'] },
      { id: 'legend', name: 'Legend DJ', price: LEGEND_SUBSCRIPTION_PRICE, users: legendDjCount, features: ['Everything in Pro', 'Featured placement', 'Dedicated support'] },
    ];

    return res.json({
      success: true,
      data: {
        plans,
        totalRevenue: Math.round(approvedRevenue._sum.amount || 0),
        activeBookings,
        pendingRequests,
        mrr: Math.round((proDjCount * PRO_SUBSCRIPTION_PRICE) + (legendDjCount * LEGEND_SUBSCRIPTION_PRICE)),
        arr: Math.round(((proDjCount * PRO_SUBSCRIPTION_PRICE) + (legendDjCount * LEGEND_SUBSCRIPTION_PRICE)) * 12),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/ads - Ad campaign overview (alias for campaigns)
router.get('/ads', async (req, res) => {
  try {
    const campaigns = await prisma.adCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        advertiser: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);

    return res.json({
      success: true,
      data: {
        campaigns: campaigns.map((c) => ({
          ...c,
          ctr: `${(c.ctr || 0).toFixed(2)}%`,
        })),
        totalBudget,
        totalSpent,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/ads - Create a new ad campaign
router.post('/ads', async (req, res) => {
  try {
    const data = createAdSchema.parse(req.body);

    const campaign = await prisma.adCampaign.create({
      data: {
        name: data.name,
        status: data.status,
        budget: data.budget,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    return res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: error.errors });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/campaigns/:id/status - Update campaign status (approve/reject/pause)
router.put('/campaigns/:id/status', async (req, res) => {
  try {
    const parsed = campaignStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { status, notes } = parsed.data;
    const campaign = await prisma.adCampaign.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        advertiser: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    return res.json({ success: true, data: campaign });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
