const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { requireRole } = require('../middleware/auth');
const { recalculateAllRankings } = require('../utils/ranking');
const { activateSubscriptionFeatures, resetSubscriptionFeatures } = require('../middleware/permissions');
const { sendEmail } = require('../utils/email');
const { withCache, clearCache } = require('../utils/cache');
const { getSubscriptionConfig, setSubscriptionConfig } = require('../utils/subscriptionConfig');

const router = express.Router();

// ─── AuditLog helper ──────────────────────────────────────────────

async function createAuditLog(params: {
  actorId: string;
  targetId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
  req?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        targetId: params.targetId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        metadata: params.metadata || null,
        ipAddress: params.req?.ip || params.req?.socket?.remoteAddress || null,
        userAgent: params.req?.headers?.['user-agent'] || null,
      },
    });
  } catch (err: any) {
    console.error('AuditLog write failed:', err.message);
  }
}

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

const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
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

const updateSetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  genre: z.string().max(100).optional(),
  coverImage: z.string().optional(),
  isPublic: z.boolean().optional(),
});

const setItemSchema = z.object({
  mixId: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
  note: z.string().max(500).optional(),
});

// GET /api/admin/stats - Platform-wide stats (cached 30s)
router.get('/stats', async (req, res) => {
  try {
    const data = await withCache('admin:stats', 30000, async () => {
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

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalVisitsToday, totalVisitsMonth, uniqueVisitorsToday] = await Promise.all([
        prisma.siteVisit.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.siteVisit.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.siteVisit.groupBy({
          by: ['ipHash'],
          where: { createdAt: { gte: startOfDay }, ipHash: { not: null } },
          _count: { ipHash: true },
        }).then((rows) => rows.length),
      ]);

      return {
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
        totalVisitsToday,
        totalVisitsMonth,
        uniqueVisitorsToday,
      };
    });

    return res.json({ success: true, data });
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
    if (role) where.role = role.toUpperCase();
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
          username: true,
          role: true,
          status: true,
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
    const targetId = req.params.id;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, email: true, username: true, name: true, role: true },
    });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        djProfile: { select: { id: true, stageName: true, verified: true, isPublic: true } },
      },
    });

    if (role === 'DJ' && !user.djProfile) {
      await prisma.djProfile.create({
        data: {
          userId: targetId,
          stageName: targetUser.username || targetUser.email.split('@')[0],
          fullName: targetUser.name || targetUser.username || '',
          isPublic: true,
        },
      });
    } else if (role !== 'DJ' && user.djProfile?.isPublic) {
      await prisma.djProfile.update({
        where: { userId: targetId },
        data: { isPublic: false },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        djProfile: { select: { id: true, stageName: true, verified: true, isPublic: true } },
      },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId,
      action: 'USER_ROLE_CHANGE',
      entity: 'USER',
      entityId: targetId,
      metadata: { newRole: role, previousRole: targetUser.role },
      req,
    });

    return res.json({ success: true, data: updatedUser });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/users/:id/status - Update user account status
router.put('/users/:id/status', async (req, res) => {
  try {
    const parsed = updateUserStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { status } = parsed.data;
    const targetId = req.params.id;

    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: targetId },
        data: { status },
        select: { id: true, email: true, status: true },
      }),
      prisma.djProfile.updateMany({
        where: { userId: targetId },
        data: { isPublic: status === 'ACTIVE' },
      }),
    ]);

    await createAuditLog({
      actorId: req.user.id,
      targetId,
      action: 'USER_STATUS_CHANGE',
      entity: 'USER',
      entityId: targetId,
      metadata: { newStatus: status },
      req,
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
    const targetId = req.params.id;

    const dj = await prisma.djProfile.update({
      where: { id: targetId },
      data: {
        verified: true,
        verificationStatus: 'approved',
        isPublic: true,
        verifiedAt: new Date(),
        badges: { push: 'Verified DJ' },
        ...(notes && { verificationNotes: notes }),
      },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: dj.userId,
      action: 'DJ_VERIFY',
      entity: 'DJ_PROFILE',
      entityId: targetId,
      metadata: { notes: notes || null, stageName: dj.stageName },
      req,
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

    const targetId = req.params.id;
    const dj = await prisma.djProfile.update({
      where: { id: targetId },
      data: {
        verificationStatus: 'rejected',
        verificationNotes: reason,
      },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: dj.userId,
      action: 'DJ_VERIFY_REJECT',
      entity: 'DJ_PROFILE',
      entityId: targetId,
      metadata: { reason, stageName: dj.stageName },
      req,
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
    const bookingId = req.params.id;
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        client: { select: { id: true, email: true } },
        dj: { select: { id: true, stageName: true } },
        payments: true,
      },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: booking.clientId || booking.djId,
      action: 'BOOKING_STATUS_CHANGE',
      entity: 'BOOKING',
      entityId: bookingId,
      metadata: { newStatus: status, clientEmail: booking.client?.email, djStageName: booking.dj?.stageName },
      req,
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
    const mixId = req.params.id;
    const mix = await prisma.mix.update({
      where: { id: mixId },
      data: { featured },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: mix.djId,
      action: featured ? 'MIX_FEATURE' : 'MIX_UNFEATURE',
      entity: 'MIX',
      entityId: mixId,
      metadata: { title: mix.title, featured },
      req,
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
    const mixId = req.params.id;
    const mix = await prisma.mix.findUnique({ where: { id: mixId } });
    if (!mix) return res.status(404).json({ success: false, error: 'Mix not found' });

    await prisma.mix.delete({ where: { id: mixId } });

    await prisma.djProfile.update({
      where: { id: mix.djId },
      data: { totalMixes: { decrement: 1 } },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: mix.djId,
      action: 'MIX_DELETE',
      entity: 'MIX',
      entityId: mixId,
      metadata: { title: mix.title },
      req,
    });

    return res.json({ success: true, data: { id: mixId, message: 'Mix deleted' } });
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

// GET /api/admin/analytics - Monthly platform analytics (cached 60s)
router.get('/analytics', async (req, res) => {
  try {
    const data = await withCache('admin:analytics', 60000, async () => {
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const label = start.toLocaleString('en-US', { month: 'short' });
        const [users, djs, mixes, bookings, revenue, visits] = await Promise.all([
          prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
          prisma.djProfile.count({ where: { createdAt: { gte: start, lt: end } } }),
          prisma.mix.count({ where: { createdAt: { gte: start, lt: end } } }),
          prisma.booking.count({ where: { createdAt: { gte: start, lt: end } } }),
          prisma.booking.aggregate({
            where: { createdAt: { gte: start, lt: end }, status: { in: ['COMPLETED', 'DEPOSIT_PAID'] } },
            _sum: { finalPrice: true },
          }),
          prisma.siteVisit.count({ where: { createdAt: { gte: start, lt: end } } }),
        ]);
        months.push({
          month: label,
          users,
          djs,
          mixes,
          bookings,
          revenue: Math.round(revenue._sum.finalPrice || 0),
          visits,
        });
      }
      return months;
    });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/geography - Top visitor countries & cities
router.get('/geography', async (req, res) => {
  try {
    const [topCountries, topCities] = await Promise.all([
      prisma.siteVisit.groupBy({
        by: ['country'],
        where: { country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),
      prisma.siteVisit.groupBy({
        by: ['city'],
        where: { city: { not: null } },
        _count: { city: true },
        orderBy: { _count: { city: 'desc' } },
        take: 10,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        countries: topCountries.map((r) => ({ name: r.country, visits: r._count.country })),
        cities: topCities.map((r) => ({ name: r.city, visits: r._count.city })),
      },
    });
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

    await createAuditLog({
      actorId: req.user.id,
      targetId: request.dj.userId,
      action: 'PRO_APPROVE',
      entity: 'PRO_SUBSCRIPTION_REQUEST',
      entityId: request.id,
      metadata: { plan: request.plan, note: parsed.data.note || null, stageName: request.dj.stageName },
      req,
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

    await createAuditLog({
      actorId: req.user.id,
      targetId: updated.dj.user?.id || null,
      action: 'PRO_REJECT',
      entity: 'PRO_SUBSCRIPTION_REQUEST',
      entityId: request.id,
      metadata: { plan: request.plan, note: parsed.data.note || null, stageName: updated.dj.stageName },
      req,
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
    const { search, verified, status, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (verified !== undefined) where.verified = verified === 'true';
    if (status) where.user = { status: status.toUpperCase() };
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
          user: { select: { id: true, email: true, status: true, createdAt: true } },
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
      status: dj.user.status,
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
    const targetId = req.params.id;
    const dj = await prisma.djProfile.findUnique({ where: { id: targetId } });
    if (!dj) return res.status(404).json({ success: false, error: 'DJ not found' });

    const newIsPublic = !dj.isPublic;
    const newUserStatus = newIsPublic ? 'ACTIVE' : 'SUSPENDED';

    const [updated] = await prisma.$transaction([
      prisma.djProfile.update({
        where: { id: targetId },
        data: { isPublic: newIsPublic },
      }),
      prisma.user.update({
        where: { id: dj.userId },
        data: { status: newUserStatus },
      }),
    ]);

    await createAuditLog({
      actorId: req.user.id,
      targetId: dj.userId,
      action: updated.isPublic ? 'DJ_REINSTATE' : 'DJ_SUSPEND',
      entity: 'DJ_PROFILE',
      entityId: targetId,
      metadata: { stageName: dj.stageName, isPublic: updated.isPublic, userStatus: newUserStatus },
      req,
    });

    return res.json({ success: true, data: { isPublic: updated.isPublic, suspended: !updated.isPublic } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/djs/:id - Delete DJ and associated data
router.delete('/djs/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    const dj = await prisma.djProfile.findUnique({ where: { id: targetId }, select: { userId: true, stageName: true } });
    await prisma.djProfile.delete({ where: { id: targetId } });

    await createAuditLog({
      actorId: req.user.id,
      targetId: dj?.userId || null,
      action: 'DJ_DELETE',
      entity: 'DJ_PROFILE',
      entityId: targetId,
      metadata: { stageName: dj?.stageName || null },
      req,
    });

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

// GET /api/admin/battles - Admin battles list with full details
router.get('/battles', async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;

    const [battles, total] = await Promise.all([
      prisma.battle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          entries: {
            include: {
              dj: { select: { id: true, stageName: true, avatar: true } },
              votesCast: { select: { id: true } },
            },
          },
        },
      }),
      prisma.battle.count({ where }),
    ]);

    const data = battles.map((b) => ({
      ...b,
      entries: b.entries.map((e) => ({
        ...e,
        voteCount: e.votesCast.length,
      })),
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

// POST /api/admin/battles - Create battle (admin endpoint)
router.post('/battles', async (req, res) => {
  try {
    const { title, weekStart, weekEnd, theme, metricType } = req.body;
    if (!title || !weekStart || !weekEnd) {
      return res.status(400).json({ success: false, error: 'title, weekStart, and weekEnd are required' });
    }

    const battle = await prisma.battle.create({
      data: {
        title,
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        theme: theme || null,
        metricType: metricType || 'COMPOSITE',
      },
      include: { entries: true },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: null,
      action: 'BATTLE_CREATE',
      entity: 'BATTLE',
      entityId: battle.id,
      metadata: { title, theme, metricType },
      req,
    });

    return res.status(201).json({ success: true, data: battle });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/battles/:id/close - Close battle (admin endpoint)
router.post('/battles/:id/close', async (req, res) => {
  try {
    const battleId = req.params.id;
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        entries: {
          include: {
            dj: { select: { id: true, stageName: true } },
            votesCast: { select: { id: true } },
          },
        },
      },
    });

    if (!battle) {
      return res.status(404).json({ success: false, error: 'Battle not found' });
    }
    if (battle.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Battle is already closed' });
    }

    const sortedEntries = [...battle.entries].sort((a, b) => b.finalScore - a.finalScore);

    for (let i = 0; i < Math.min(3, sortedEntries.length); i++) {
      const entry = sortedEntries[i];
      const badge = i === 0 ? 'Battle Champion' : i === 1 ? 'Battle Runner-Up' : 'Battle Third Place';
      await prisma.djProfile.update({
        where: { id: entry.djId },
        data: {
          badges: { push: badge },
          rankingScore: { increment: i === 0 ? 2 : i === 1 ? 1 : 0.5 },
        },
      });
    }

    const updated = await prisma.battle.update({
      where: { id: battleId },
      data: { status: 'CLOSED' },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: null,
      action: 'BATTLE_CLOSE',
      entity: 'BATTLE',
      entityId: battleId,
      metadata: { title: battle.title, winnerCount: Math.min(3, sortedEntries.length) },
      req,
    });

    return res.json({
      success: true,
      data: {
        battle: updated,
        winners: sortedEntries.slice(0, 3).map((e, i) => ({
          position: i + 1,
          dj: e.dj,
          score: e.finalScore,
          votes: e.votesCast.length,
        })),
      },
    });
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
    const [config, djCount, proDjCount, legendDjCount, pendingRequests, approvedRevenue, activeBookings] = await Promise.all([
      getSubscriptionConfig(),
      prisma.djProfile.count(),
      prisma.djProfile.count({ where: { subscriptionTier: 'pro' } }),
      prisma.djProfile.count({ where: { subscriptionTier: 'legend' } }),
      prisma.proSubscriptionRequest.count({ where: { status: 'pending' } }),
      prisma.proSubscriptionRequest.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
      prisma.booking.count({ where: { status: { in: ['PENDING', 'NEGOTIATING', 'CONFIRMED'] } } }),
    ]);

    const plans = [
      { id: 'free', name: 'Free Tier', price: 0, users: djCount - proDjCount - legendDjCount, features: ['Basic profile', 'Limited uploads'] },
      { id: 'pro', name: 'Pro DJ', price: config.proPrice, users: proDjCount, features: ['Unlimited uploads', 'Priority discovery', 'Advanced analytics'] },
      { id: 'legend', name: 'Pro+ DJ', price: config.legendPrice, users: legendDjCount, features: ['Everything in Pro', 'Featured placement', 'Dedicated support'] },
    ];

    return res.json({
      success: true,
      data: {
        plans,
        totalRevenue: Math.round(approvedRevenue._sum.amount || 0),
        activeBookings,
        pendingRequests,
        mrr: Math.round((proDjCount * config.proPrice) + (legendDjCount * config.legendPrice)),
        arr: Math.round(((proDjCount * config.proPrice) + (legendDjCount * config.legendPrice)) * 12),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/subscription-config - Current manual-payment config
router.get('/subscription-config', async (req, res) => {
  try {
    const config = await getSubscriptionConfig();
    return res.json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const subscriptionConfigSchema = z.object({
  paymentNumber: z.string().min(1),
  whatsappNumber: z.string().min(1).optional(),
  proPrice: z.number().min(0),
  legendPrice: z.number().min(0),
  currency: z.string().min(1).optional(),
});

// PUT /api/admin/subscription-config - Update manual-payment config
router.put('/subscription-config', async (req, res) => {
  try {
    const parsed = subscriptionConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const config = await setSubscriptionConfig(parsed.data, req.user.id);

    await createAuditLog({
      actorId: req.user.id,
      action: 'SUBSCRIPTION_CONFIG_UPDATE',
      entity: 'SYSTEM_CONFIG',
      metadata: parsed.data,
      req,
    });

    return res.json({ success: true, data: config });
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
    const parsed = createAdSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const data = parsed.data;

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
    const campaignId = req.params.id;
    const campaign = await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status },
      include: {
        advertiser: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: campaign.advertiserId || null,
      action: 'CAMPAIGN_STATUS_CHANGE',
      entity: 'AD_CAMPAIGN',
      entityId: campaignId,
      metadata: { newStatus: status, notes: notes || null, name: campaign.name },
      req,
    });

    return res.json({ success: true, data: campaign });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/broadcast-email - Send email to all users or specific role
const broadcastEmailSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  targetRole: z.enum(['ALL', 'USER', 'DJ', 'ADMIN']).optional().default('ALL'),
});

router.post('/broadcast-email', async (req, res) => {
  try {
    const parsed = broadcastEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { subject, message, targetRole } = parsed.data;

    // Build recipient query
    const where: any = {};
    if (targetRole !== 'ALL') {
      where.role = targetRole;
    }

    const users = await prisma.user.findMany({
      where,
      select: { email: true, username: true },
    });

    if (users.length === 0) {
      return res.json({ success: true, data: { sent: 0, message: 'No users match the target criteria' } });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://decksalone.com';
    const logoUrl = `${frontendUrl}/assets/logo.jpg`;
    const html = `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#111;background:#fff">
      <div style="text-align:center;margin-bottom:24px">
        <img src="${logoUrl}" alt="Deck Salone" width="80" height="80" style="border-radius:50%;object-fit:cover;margin-bottom:12px" />
        <h1 style="color:#d4a24a;margin:0;font-size:24px">Deck Salone</h1>
      </div>
      <div style="line-height:1.6;color:#333">
        ${message.replace(/\n/g, '<br>')}
      </div>
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center;color:#666;font-size:12px">
        <p>Deck Salone — The Premier DJ Platform</p>
        <p><a href="${frontendUrl}" style="color:#d4a24a">${frontendUrl}</a></p>
        <p style="margin-top:8px">If you no longer wish to receive these emails, please contact <a href="mailto:support@decksalone.com" style="color:#d4a24a">support@decksalone.com</a></p>
      </div>
    </div>`;

    // Send emails in batches to avoid overwhelming the SMTP server
    const BATCH_SIZE = 50;
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((user) =>
          sendEmail({
            to: user.email,
            subject,
            text: message,
            html,
          })
        )
      );

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++;
        } else {
          failedCount++;
          const errorMsg = result.status === 'rejected' ? result.reason?.message : result.value?.error;
          errors.push(`Failed to send to ${batch[idx].email}: ${errorMsg}`);
        }
      });
    }

    return res.json({
      success: true,
      data: {
        sent: sentCount,
        failed: failedCount,
        total: users.length,
        targetRole,
        errors: errors.slice(0, 10), // Limit error details
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ───────────────────────────────────────────────────────────────────
// Live Sets (DJ Sets) Admin Routes
// ───────────────────────────────────────────────────────────────────

// GET /api/admin/sets - List all DJ sets with pagination and filters
router.get('/sets', async (req, res) => {
  try {
    const { search, djId, isPublic, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (djId) where.djId = djId;
    if (isPublic !== undefined) where.isPublic = isPublic === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [sets, total] = await Promise.all([
      prisma.djSet.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          dj: { select: { id: true, stageName: true, avatar: true } },
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              mix: { select: { id: true, title: true, coverImage: true, genre: true, duration: true } },
            },
          },
        },
      }),
      prisma.djSet.count({ where }),
    ]);

    const data = sets.map((s: any) => ({
      ...s,
      mixCount: s.items.length,
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

// GET /api/admin/sets/:id - Get a single set with full details
router.get('/sets/:id', async (req, res) => {
  try {
    const set = await prisma.djSet.findUnique({
      where: { id: req.params.id },
      include: {
        dj: { select: { id: true, stageName: true, avatar: true, user: { select: { email: true } } } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            mix: {
              include: {
                dj: { select: { id: true, stageName: true, avatar: true } },
              },
            },
          },
        },
      },
    });

    if (!set) return res.status(404).json({ success: false, error: 'Set not found' });

    return res.json({ success: true, data: { ...set, mixCount: set.items.length } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/sets/:id - Update any set (admin override)
router.put('/sets/:id', async (req, res) => {
  try {
    const parsed = updateSetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const set = await prisma.djSet.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: {
        dj: { select: { id: true, stageName: true } },
        items: { select: { id: true } },
      },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: set.djId,
      action: 'SET_UPDATE',
      entity: 'DJ_SET',
      entityId: set.id,
      metadata: { title: set.title, changes: parsed.data },
      req,
    });

    return res.json({ success: true, data: { ...set, mixCount: set.items.length } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/sets/:id - Delete any set (admin override)
router.delete('/sets/:id', async (req, res) => {
  try {
    const set = await prisma.djSet.findUnique({
      where: { id: req.params.id },
      include: { dj: { select: { id: true, stageName: true } } },
    });
    if (!set) return res.status(404).json({ success: false, error: 'Set not found' });

    await prisma.djSet.delete({ where: { id: req.params.id } });

    await createAuditLog({
      actorId: req.user.id,
      targetId: set.djId,
      action: 'SET_DELETE',
      entity: 'DJ_SET',
      entityId: req.params.id,
      metadata: { title: set.title, stageName: set.dj.stageName },
      req,
    });

    return res.json({ success: true, data: { id: req.params.id, message: 'Set deleted' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/sets/:id/mixes - Add a mix to a set (admin override)
router.post('/sets/:id/mixes', async (req, res) => {
  try {
    const parsed = setItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const set = await prisma.djSet.findUnique({
      where: { id: req.params.id },
      include: { dj: { select: { id: true, stageName: true } } },
    });
    if (!set) return res.status(404).json({ success: false, error: 'Set not found' });

    const mix = await prisma.mix.findUnique({ where: { id: parsed.data.mixId } });
    if (!mix) return res.status(404).json({ success: false, error: 'Mix not found' });

    const item = await prisma.djSetItem.create({
      data: { setId: req.params.id, mixId: parsed.data.mixId, sortOrder: parsed.data.sortOrder || 0 },
      include: {
        mix: {
          include: {
            dj: { select: { id: true, stageName: true, avatar: true } },
          },
        },
      },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: set.djId,
      action: 'SET_ADD_MIX',
      entity: 'DJ_SET',
      entityId: set.id,
      metadata: { title: set.title, mixTitle: mix.title, mixId: mix.id },
      req,
    });

    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/sets/:id/mixes/:mixId - Remove a mix from a set (admin override)
router.delete('/sets/:id/mixes/:mixId', async (req, res) => {
  try {
    const set = await prisma.djSet.findUnique({
      where: { id: req.params.id },
      include: { dj: { select: { id: true, stageName: true } } },
    });
    if (!set) return res.status(404).json({ success: false, error: 'Set not found' });

    const item = await prisma.djSetItem.findUnique({
      where: { setId_mixId: { setId: req.params.id, mixId: req.params.mixId } },
    });
    if (!item) return res.status(404).json({ success: false, error: 'Mix not found in this set' });

    await prisma.djSetItem.delete({
      where: { setId_mixId: { setId: req.params.id, mixId: req.params.mixId } },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: set.djId,
      action: 'SET_REMOVE_MIX',
      entity: 'DJ_SET',
      entityId: set.id,
      metadata: { title: set.title, mixId: req.params.mixId },
      req,
    });

    return res.json({ success: true, data: { removed: true } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/sets/:id/reorder - Reorder items in a set (admin override)
router.put('/sets/:id/reorder', async (req, res) => {
  try {
    const set = await prisma.djSet.findUnique({
      where: { id: req.params.id },
      include: { dj: { select: { id: true, stageName: true } } },
    });
    if (!set) return res.status(404).json({ success: false, error: 'Set not found' });

    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    await prisma.$transaction(
      items.map((item: any) =>
        prisma.djSetItem.updateMany({
          where: { setId: req.params.id, mixId: item.mixId },
          data: { sortOrder: Number(item.sortOrder) || 0 },
        })
      )
    );

    const updated = await prisma.djSet.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            mix: {
              include: {
                dj: { select: { id: true, stageName: true, avatar: true } },
              },
            },
          },
        },
      },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: set.djId,
      action: 'SET_REORDER',
      entity: 'DJ_SET',
      entityId: set.id,
      metadata: { title: set.title, itemCount: items.length },
      req,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/sets/stats - Set statistics
router.get('/sets/stats', async (req, res) => {
  try {
    const [totalSets, publicSets, privateSets, totalItems, topDjs] = await Promise.all([
      prisma.djSet.count(),
      prisma.djSet.count({ where: { isPublic: true } }),
      prisma.djSet.count({ where: { isPublic: false } }),
      prisma.djSetItem.count(),
      prisma.djSet.groupBy({
        by: ['djId'],
        _count: { djId: true },
        orderBy: { _count: { djId: 'desc' } },
        take: 5,
      }),
    ]);

    const djIds = topDjs.map((d: any) => d.djId);
    const djs = await prisma.djProfile.findMany({
      where: { id: { in: djIds } },
      select: { id: true, stageName: true, avatar: true },
    });

    const djMap = new Map(djs.map((d: any) => [d.id, d]));

    return res.json({
      success: true,
      data: {
        totalSets,
        publicSets,
        privateSets,
        totalItems,
        topDjs: topDjs.map((d: any) => ({
          ...(djMap.get(d.djId) as Record<string, any> || {}),
          setCount: d._count.djId,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
