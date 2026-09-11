const express = require('express');
const { z } = require('zod');
const { prisma, DJ_PUBLIC_SELECT } = require('../utils/prisma');
const { requireRole, invalidateUserAuthCache } = require('../middleware/auth');
const { recalculateAllRankings, calculateBattleBaseScore } = require('../utils/ranking');
const { activateSubscriptionFeatures, resetSubscriptionFeatures } = require('../middleware/permissions');
const { sendEmail } = require('../utils/email');
const { getFrontendUrl } = require('../utils/url');
const { withCache, clearCache } = require('../utils/cache');
const { getSubscriptionConfig, setSubscriptionConfig } = require('../utils/subscriptionConfig');
const { uploadBuffer, deleteFile } = require('../utils/storage');
const { uploadAdminMedia } = require('../utils/upload');
const { processEventImage } = require('../utils/imageProcessor');
const { calculateProfileCompletion, sendProfileNudgeEmail } = require('../utils/profileCompletion');
const { parsePagination } = require('../utils/pagination');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

const BATTLE_METRIC_TYPES = ['COMPOSITE', 'PLAYS', 'STREAMS', 'FOLLOWERS', 'LIKES'];

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

// All routes require admin role (MODERATOR role uses /api/moderator routes; /reports is shared with moderators)
router.use((req: any, res: any, next: any) => {
  if (req.path === '/reports' || req.path.startsWith('/reports/')) {
    return requireRole('ADMIN', 'SUPER_ADMIN', 'MODERATOR')(req, res, next);
  }
  return requireRole('ADMIN', 'SUPER_ADMIN', 'VERIFICATION_ADMIN', 'FINANCE_ADMIN')(req, res, next);
});

const userFilterSchema = z.object({
  role: z.string().optional(),
  search: z.string().optional(),
  verificationStatus: z.enum(['all', 'pending', 'info_requested', 'rejected', 'approved', 'verified', 'unverified']).optional(),
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

const suspendEventSchema = z.object({
  reason: z.string().optional(),
});

const activatePromoSchema = z.object({
  months: z.number().int().min(0).max(12).default(1), // 0 = lifetime
  reason: z.string().optional(),
});

const grantPlanSchema = z.object({
  djId: z.string().min(1),
  plan: z.enum(['pro', 'legend']),
  months: z.number().int().min(0).max(24).default(1), // 0 = lifetime
  reason: z.string().optional(),
});

const customEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
  recipientName: z.string().optional(),
});

const birthdayWishSchema = z.object({
  userId: z.string().min(1),
});

const bookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'NEGOTIATING', 'CONFIRMED', 'DEPOSIT_PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED']),
});

const createAdSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  status: z.enum(['active', 'paused', 'draft', 'pending_payment', 'rejected', 'completed']).default('draft'),
  budget: z.number().min(0).default(0),
  description: z.string().optional().nullable(),
  creativeImageUrl: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

const updateAdSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'paused', 'draft', 'pending_payment', 'rejected', 'completed']).optional(),
  budget: z.number().min(0).optional(),
  description: z.string().optional().nullable(),
  creativeImageUrl: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

const campaignStatusSchema = z.object({
  status: z.enum(['pending_payment', 'active', 'paused', 'rejected', 'completed']),
  notes: z.string().optional(),
});

const verifyDjSchema = z.object({
  notes: z.string().optional(),
  badgeType: z.enum(['grey', 'gold']).nullable().optional(),
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
router.get('/stats', asyncHandler(async (req, res) => {
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
      totalPlaylists,
      totalFeedPosts,
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
      prisma.officialPlaylist.count(),
      prisma.mix.count({ where: { isPublic: true } }),
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
      totalPlaylists,
      totalFeedPosts,
      estimatedRevenue: bookingRevenue._sum.finalPrice || 0,
      totalPayments: totalPayments._sum.amount || 0,
      activeBattles,
      totalVisitsToday,
      totalVisitsMonth,
      uniqueVisitorsToday,
    };
  });

  return ok(res, data);
}));

// GET /api/admin/users - List all users
router.get('/users', asyncHandler(async (req, res) => {
  const parsed = userFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid filter parameters');
  }

  const { role, search, verificationStatus, page, limit } = parsed.data;
  const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

  const where: any = {};
  if (role) where.role = role.toUpperCase();
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { djProfile: { stageName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (verificationStatus && verificationStatus !== 'all') {
    if (verificationStatus === 'verified') {
      where.djProfile = { ...where.djProfile, verified: true };
    } else if (verificationStatus === 'unverified') {
      where.djProfile = { ...where.djProfile, verified: false };
    } else {
      where.djProfile = { ...where.djProfile, verificationStatus };
    }
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
        name: true,
        avatar: true,
        role: true,
        status: true,
        phone: true,
        phoneVerified: true,
        createdAt: true,
        updatedAt: true,
        djProfile: {
          select: {
            id: true,
            stageName: true,
            verified: true,
            isPublic: true,
            verificationStatus: true,
            verificationBadgeType: true,
            verificationReason: true,
            verificationNotes: true,
            idDocumentType: true,
            idDocumentUrl: true,
            nationality: true,
            legalName: true,
            socialProof: true,
            verifiedAt: true,
            updatedAt: true,
            subscriptionTier: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return res.json({
    success: true,
    data: users,
    meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
}));

// PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/role', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const { role } = parsed.data;
  const targetId = req.params.id;

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, username: true, name: true, role: true },
  });
  if (!targetUser) {
    return fail(res, 404, 'User not found');
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

  invalidateUserAuthCache(targetId);

  return ok(res, updatedUser);
}));

// PUT /api/admin/users/:id/status - Update user account status
router.put('/users/:id/status', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const parsed = updateUserStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
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

  invalidateUserAuthCache(targetId);

  return ok(res, user);
}));

// GET /api/admin/djs/pending - Get DJs pending verification (legacy flag)
router.get('/djs/pending', requireRole('ADMIN', 'VERIFICATION_ADMIN'), asyncHandler(async (req, res) => {
  const djs = await prisma.djProfile.findMany({
    where: { verificationStatus: 'pending' },
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, createdAt: true } },
      streamingPlatforms: true,
    },
  });

  return ok(res, djs);
}));

// GET /api/admin/djs/verification-requests - Get passport verification requests
router.get('/djs/verification-requests', requireRole('ADMIN', 'VERIFICATION_ADMIN'), asyncHandler(async (req, res) => {
  const djs = await prisma.djProfile.findMany({
    where: {
      OR: [
        { verificationStatus: { in: ['pending', 'info_requested', 'rejected', 'approved'] } },
        { verified: true },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, createdAt: true } },
      streamingPlatforms: true,
    },
  });

  return ok(res, djs);
}));

// PUT /api/admin/djs/:id/verify - Approve verification
router.put('/djs/:id/verify', requireRole('ADMIN', 'VERIFICATION_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = verifyDjSchema.safeParse(req.body);
  const notes = parsed.success ? parsed.data.notes : undefined;
  const badgeType = parsed.success && parsed.data.badgeType ? parsed.data.badgeType : 'grey';
  const targetId = req.params.id;

  const dj = await prisma.djProfile.update({
    where: { id: targetId },
    data: {
      verified: true,
      verificationStatus: 'approved',
      verificationBadgeType: badgeType,
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

  return ok(res, dj);
}));

// PUT /api/admin/djs/:id/badge-type - Update DJ verification badge type
router.put('/djs/:id/badge-type', requireRole('ADMIN', 'VERIFICATION_ADMIN'), asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const { badgeType } = req.body;
  
  if (badgeType !== 'grey' && badgeType !== 'gold' && badgeType !== null) {
    return fail(res, 400, 'Invalid badge type');
  }

  const dj = await prisma.djProfile.update({
    where: { id: targetId },
    data: {
      verificationBadgeType: badgeType,
    },
  });

  await createAuditLog({
    actorId: req.user.id,
    targetId: dj.userId,
    action: 'DJ_BADGE_UPDATE',
    entity: 'DJ_PROFILE',
    entityId: targetId,
    metadata: { badgeType, stageName: dj.stageName },
    req,
  });

  return ok(res, dj);
}));

// PUT /api/admin/djs/:id/reject - Reject verification
router.put('/djs/:id/reject', requireRole('ADMIN', 'VERIFICATION_ADMIN'), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    return fail(res, 400, 'Rejection reason is required');
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

  return ok(res, dj);
}));

// PUT /api/admin/djs/:id/request-info - Request more information
router.put('/djs/:id/request-info', requireRole('ADMIN', 'VERIFICATION_ADMIN'), asyncHandler(async (req, res) => {
  const { notes } = req.body;
  if (!notes) {
    return fail(res, 400, 'Request notes are required');
  }

  const dj = await prisma.djProfile.update({
    where: { id: req.params.id },
    data: {
      verificationStatus: 'info_requested',
      verificationNotes: notes,
    },
  });

  return ok(res, dj);
}));

// GET /api/admin/bookings - List all bookings
router.get('/bookings', asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

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
        dj: { select: DJ_PUBLIC_SELECT },
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
}));

// PUT /api/admin/bookings/:id/status - Override booking status
router.put('/bookings/:id/status', asyncHandler(async (req, res) => {
  const parsed = bookingStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input');
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

  return ok(res, booking);
}));

// PUT /api/admin/mixes/:id/feature - Feature/unfeature a mix
router.put('/mixes/:id/feature', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = featureMixSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input');
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

  return ok(res, mix);
}));

// PUT /api/admin/djs/:id/hall-of-fame - Toggle DJ Hall of Fame status
router.put('/djs/:id/hall-of-fame', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const dj = await prisma.djProfile.findUnique({ where: { id: req.params.id } });
  if (!dj) return fail(res, 404, 'DJ not found');

  const updated = await prisma.djProfile.update({
    where: { id: req.params.id },
    data: { hallOfFame: !dj.hallOfFame },
  });

  return ok(res, { id: updated.id, hallOfFame: updated.hallOfFame, stageName: updated.stageName });
}));

// PUT /api/admin/mixes/:id/hall-of-fame - Toggle Mix Hall of Fame status
router.put('/mixes/:id/hall-of-fame', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const mix = await prisma.mix.findUnique({ where: { id: req.params.id } });
  if (!mix) return fail(res, 404, 'Mix not found');

  const updated = await prisma.mix.update({
    where: { id: req.params.id },
    data: { hallOfFame: !mix.hallOfFame },
  });

  return ok(res, { id: updated.id, hallOfFame: updated.hallOfFame, title: updated.title });
}));

// DELETE /api/admin/mixes/:id - Delete a mix
router.delete('/mixes/:id', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const mixId = req.params.id;
  const mix = await prisma.mix.findUnique({ where: { id: mixId } });
  if (!mix) return fail(res, 404, 'Mix not found');

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

  return ok(res, { id: mixId, message: 'Mix deleted' });
}));

// PUT /api/admin/djs/:id/ranking - Manually update DJ ranking
router.put('/djs/:id/ranking', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const parsed = rankingUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input');
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

  return ok(res, dj);
}));

// POST /api/admin/rankings/recalculate - Trigger full ranking recalculation
router.post('/rankings/recalculate', asyncHandler(async (req, res) => {
  const ranked = await recalculateAllRankings();
  return ok(res, { message: 'Rankings recalculated successfully', totalDjs: ranked.length });
}));

// GET /api/admin/analytics - Platform analytics with full breakdown, demographics, geography, age, gender & month filtering
router.get('/analytics', asyncHandler(async (req, res) => {
  const range = (req.query.range as string) || '6m';
  const month = (req.query.month as string) || '';
  const cacheKey = `admin:analytics:${range}:${month}`;

  const data = await withCache(cacheKey, 30000, async () => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date();
    let isDaily = false;
    const timeline: any[] = [];

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yearStr, monthStr] = month.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 1);
      isDaily = true;
    } else if (range === '1m') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      isDaily = true;
    } else {
      let numMonths = 6;
      if (range === '3m') numMonths = 3;
      else if (range === '6m') numMonths = 6;
      else if (range === '12m') numMonths = 12;
      else if (range === 'all') numMonths = 24;
      start = new Date(now.getFullYear(), now.getMonth() - numMonths + 1, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    if (isDaily) {
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dStart = new Date(start.getFullYear(), start.getMonth(), d);
        const dEnd = new Date(start.getFullYear(), start.getMonth(), d + 1);
        if (dStart > now) break;

        const [users, djs, mixes, bookings, revenue, visits] = await Promise.all([
          prisma.user.count({ where: { createdAt: { gte: dStart, lt: dEnd } } }),
          prisma.djProfile.count({ where: { createdAt: { gte: dStart, lt: dEnd } } }),
          prisma.mix.count({ where: { createdAt: { gte: dStart, lt: dEnd } } }),
          prisma.booking.count({ where: { createdAt: { gte: dStart, lt: dEnd } } }),
          prisma.booking.aggregate({
            where: { createdAt: { gte: dStart, lt: dEnd }, status: { in: ['COMPLETED', 'DEPOSIT_PAID'] } },
            _sum: { finalPrice: true },
          }),
          prisma.siteVisit.count({ where: { createdAt: { gte: dStart, lt: dEnd } } }),
        ]);

        timeline.push({
          month: `${start.toLocaleString('en-US', { month: 'short' })} ${d}`,
          date: dStart.toISOString().split('T')[0],
          users,
          djs,
          mixes,
          bookings,
          revenue: Math.round(revenue._sum.finalPrice || 0),
          visits,
        });
      }
    } else {
      const curStart = new Date(start);
      while (curStart < end) {
        const mStart = new Date(curStart.getFullYear(), curStart.getMonth(), 1);
        const mEnd = new Date(curStart.getFullYear(), curStart.getMonth() + 1, 1);
        const label = mStart.toLocaleString('en-US', { month: 'short', year: '2-digit' });

        const [users, djs, mixes, bookings, revenue, visits] = await Promise.all([
          prisma.user.count({ where: { createdAt: { gte: mStart, lt: mEnd } } }),
          prisma.djProfile.count({ where: { createdAt: { gte: mStart, lt: mEnd } } }),
          prisma.mix.count({ where: { createdAt: { gte: mStart, lt: mEnd } } }),
          prisma.booking.count({ where: { createdAt: { gte: mStart, lt: mEnd } } }),
          prisma.booking.aggregate({
            where: { createdAt: { gte: mStart, lt: mEnd }, status: { in: ['COMPLETED', 'DEPOSIT_PAID'] } },
            _sum: { finalPrice: true },
          }),
          prisma.siteVisit.count({ where: { createdAt: { gte: mStart, lt: mEnd } } }),
        ]);

        timeline.push({
          month: label,
          date: mStart.toISOString().slice(0, 7),
          users,
          djs,
          mixes,
          bookings,
          revenue: Math.round(revenue._sum.finalPrice || 0),
          visits,
        });

        curStart.setMonth(curStart.getMonth() + 1);
      }
    }

    const [totalUsers, totalDjs, totalMixes, totalBookings, totalRevenueAgg, totalVisits] = await Promise.all([
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

    const genderGroups = await prisma.user.groupBy({
      by: ['gender'],
      where: { createdAt: { gte: start, lt: end } },
      _count: { id: true },
    });
    const genderMap: Record<string, number> = { MALE: 0, FEMALE: 0, OTHER: 0, UNSPECIFIED: 0 };
    genderGroups.forEach((g: any) => {
      if (g.gender === 'MALE') genderMap.MALE = g._count.id;
      else if (g.gender === 'FEMALE') genderMap.FEMALE = g._count.id;
      else if (g.gender === 'OTHER') genderMap.OTHER = g._count.id;
      else genderMap.UNSPECIFIED += g._count.id;
    });

    const usersWithDob = await prisma.user.findMany({
      where: { createdAt: { gte: start, lt: end }, dateOfBirth: { not: null } },
      select: { dateOfBirth: true },
    });
    const ageBrackets: Record<string, number> = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0, 'Unknown': 0 };
    usersWithDob.forEach((u: any) => {
      if (!u.dateOfBirth) {
        ageBrackets['Unknown']++;
        return;
      }
      const age = Math.floor((now.getTime() - new Date(u.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));
      if (age >= 18 && age <= 24) ageBrackets['18-24']++;
      else if (age >= 25 && age <= 34) ageBrackets['25-34']++;
      else if (age >= 35 && age <= 44) ageBrackets['35-44']++;
      else if (age >= 45 && age <= 54) ageBrackets['45-54']++;
      else if (age >= 55) ageBrackets['55+']++;
      else ageBrackets['18-24']++;
    });

    const recentVisits = await prisma.siteVisit.findMany({
      where: { createdAt: { gte: start, lt: end }, userAgent: { not: null } },
      select: { userAgent: true },
      take: 500,
    });
    let mobileCount = 0;
    let desktopCount = 0;
    let tabletCount = 0;
    recentVisits.forEach((v: any) => {
      const ua = (v.userAgent || '').toLowerCase();
      if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) tabletCount++;
      else if (/mobile|iphone|ipod|android/i.test(ua)) mobileCount++;
      else desktopCount++;
    });

    const [topCountries, topCities] = await Promise.all([
      prisma.siteVisit.groupBy({
        by: ['country'],
        where: { createdAt: { gte: start, lt: end }, country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 8,
      }),
      prisma.siteVisit.groupBy({
        by: ['city'],
        where: { createdAt: { gte: start, lt: end }, city: { not: null } },
        _count: { city: true },
        orderBy: { _count: { city: 'desc' } },
        take: 8,
      }),
    ]);

    const availableMonths: { key: string; label: string; shortLabel: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      availableMonths.push({ key, label, shortLabel: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }) });
    }

    return {
      timeline,
      summary: {
        totalUsers,
        totalDjs,
        totalMixes,
        totalBookings,
        totalRevenue: Math.round(totalRevenueAgg._sum.finalPrice || 0),
        totalVisits,
      },
      demographics: {
        gender: genderMap,
        age: ageBrackets,
        devices: {
          mobile: mobileCount,
          desktop: desktopCount,
          tablet: tabletCount,
        },
      },
      geography: {
        countries: topCountries.map((r: any) => ({ name: r.country, visits: r._count.country })),
        cities: topCities.map((r: any) => ({ name: r.city, visits: r._count.city })),
      },
      availableMonths,
      filteredRange: range,
      filteredMonth: month || null,
      isDaily,
    };
  });

  return ok(res, data);
}));


// GET /api/admin/geography - Top visitor countries & cities
router.get('/geography', asyncHandler(async (req, res) => {
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

  return ok(res, {
      countries: topCountries.map((r) => ({ name: r.country, visits: r._count.country })),
      cities: topCities.map((r) => ({ name: r.city, visits: r._count.city })),
    });
}));

// GET /api/admin/payments - All payments with pagination
router.get('/payments', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination({ page: req.query.page, limit: req.query.limit });

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
}));

// GET /api/admin/pro-subscription-requests - Manual Orange Money Pro requests
router.get('/pro-subscription-requests', requireRole('ADMIN', 'FINANCE_ADMIN'), asyncHandler(async (req, res) => {
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
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          email: true,
          phone: true,
          subscriptionTier: true,
        },
      },
    },
  });

  return ok(res, requests);
}));

// POST /api/admin/pro-subscription-requests/:id/approve - Activate Pro
router.post('/pro-subscription-requests/:id/approve', requireRole('ADMIN', 'FINANCE_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = subscriptionReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input');
  }

  const request = await prisma.proSubscriptionRequest.findUnique({
    where: { id: req.params.id },
    include: { dj: true, user: true },
  });

  if (!request) {
    return fail(res, 404, 'Subscription request not found');
  }

  const targetUserId = request.userId || request.dj?.userId;
  if (targetUserId) {
    await activateSubscriptionFeatures(targetUserId, request.plan);
  }

  const updated = await prisma.proSubscriptionRequest.update({
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
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          email: true,
          phone: true,
          subscriptionTier: true,
        },
      },
    },
  });

  if (targetUserId) {
    await createAuditLog({
      actorId: req.user.id,
      targetId: targetUserId,
      action: 'PRO_APPROVE',
      entity: 'PRO_SUBSCRIPTION_REQUEST',
      entityId: request.id,
      metadata: { plan: request.plan, note: parsed.data.note || null, stageName: request.dj?.stageName || request.user?.username || 'Fan' },
      req,
    });
  }

  return ok(res, updated);
}));

// POST /api/admin/pro-subscription-requests/:id/reject - Reject proof
router.post('/pro-subscription-requests/:id/reject', requireRole('ADMIN', 'FINANCE_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = subscriptionReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input');
  }

  const request = await prisma.proSubscriptionRequest.findUnique({
    where: { id: req.params.id },
    include: { dj: true, user: true },
  });
  if (!request) {
    return fail(res, 404, 'Subscription request not found');
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
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          email: true,
          phone: true,
          subscriptionTier: true,
        },
      },
    },
  });

  const targetUserId = request.userId || request.dj?.userId;
  if (targetUserId) {
    await createAuditLog({
      actorId: req.user.id,
      targetId: targetUserId,
      action: 'PRO_REJECT',
      entity: 'PRO_SUBSCRIPTION_REQUEST',
      entityId: request.id,
      metadata: { note: parsed.data.note || null, stageName: request.dj?.stageName || request.user?.username || 'Fan' },
      req,
    });
  }

  return ok(res, updated);
}));

// GET /api/admin/messages - Recent message threads overview
router.get('/messages', asyncHandler(async (req, res) => {
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

  return ok(res, Array.from(threadMap.values()));
}));

// GET /api/admin/staff - Users with elevated roles
router.get('/staff', asyncHandler(async (req, res) => {
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
  return ok(res, staff);
}));

// GET /api/admin/platforms - Aggregated streaming platform data
router.get('/platforms', asyncHandler(async (req, res) => {
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

  return ok(res, data);
}));

// GET /api/admin/system - System health
router.get('/system', asyncHandler(async (req, res) => {
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

  return ok(res, {
      dbStatus,
      uptime,
      counts: { users: userCount, djs: djCount, mixes: mixCount, bookings: bookingCount, events: eventCount, reviews: reviewCount },
      memory: process.memoryUsage(),
    });
}));

// GET /api/admin/djs - All DJs with full stats
router.get('/djs', asyncHandler(async (req, res) => {
  const { search, verified, status, page, limit } = req.query;
  const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

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
}));

// PUT /api/admin/djs/:id/suspend - Toggle DJ visibility (suspend)
router.put('/djs/:id/suspend', requireRole('ADMIN', 'MODERATOR'), asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const dj = await prisma.djProfile.findUnique({ where: { id: targetId } });
  if (!dj) return fail(res, 404, 'DJ not found');

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

  return ok(res, { isPublic: updated.isPublic, suspended: !updated.isPublic });
}));

// DELETE /api/admin/djs/:id - Delete DJ and associated data
router.delete('/djs/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
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
}));

// GET /api/admin/mixes - All mixes on platform (public & private)
router.get('/mixes', async (req, res) => {
  try {
    const { featured, isPublic, hallOfFame, search, page, limit } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit }, { defaultLimit: 50, maxLimit: 200 });

    const where: any = {};
    if (featured !== undefined && featured !== '') where.featured = featured === 'true';
    if (isPublic !== undefined && isPublic !== '') where.isPublic = isPublic === 'true';
    if (hallOfFame !== undefined && hallOfFame !== '') where.hallOfFame = hallOfFame === 'true';

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { genre: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { dj: { stageName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [mixes, total] = await Promise.all([
      prisma.mix.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          dj: { select: { id: true, stageName: true, avatar: true, subscriptionTier: true } },
        },
      }),
      prisma.mix.count({ where }),
    ]);

    return res.json({
      success: true,
      data: mixes,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    console.error('[Admin Mixes] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// PUT /api/admin/mixes/:id/visibility - Toggle Mix public/private status
router.put('/mixes/:id/visibility', requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const mix = await prisma.mix.findUnique({ where: { id: req.params.id } });
    if (!mix) return fail(res, 404, 'Mix not found');

    const newVisibility = req.body.isPublic !== undefined ? Boolean(req.body.isPublic) : !mix.isPublic;
    const updated = await prisma.mix.update({
      where: { id: req.params.id },
      data: { isPublic: newVisibility },
    });

    return ok(res, { id: updated.id, isPublic: updated.isPublic, title: updated.title });
  } catch (error: any) {
    console.error('[admin.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/admin/events - All events
router.get('/events', asyncHandler(async (req, res) => {
  const { status, city, page, limit } = req.query;
  const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

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
}));

// GET /api/admin/rankings - Top 100 DJs with scores
router.get('/rankings', asyncHandler(async (req, res) => {
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

  return ok(res, data);
}));

// GET /api/admin/rankings/history - Ranking history for a DJ
router.get('/rankings/history', asyncHandler(async (req, res) => {
  const { djId } = req.query;
  if (!djId) return fail(res, 400, 'djId required');

  const history = await prisma.rankingHistory.findMany({
    where: { djId: djId as string },
    orderBy: { week: 'desc' },
    take: 12,
  });

  return ok(res, history);
}));

// GET /api/admin/notifications - Recent system notifications (derived from DB activity)
router.get('/notifications', asyncHandler(async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const userId = req.user?.id;

  // Load admin notification preferences from user record
  let readAt: Date | null = null;
  let clearedIds: string[] = [];
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });
    const prefs = user?.notificationPreferences as Record<string, any> | null;
    if (prefs?.adminNotificationReadAt) {
      readAt = new Date(prefs.adminNotificationReadAt);
    }
    if (Array.isArray(prefs?.clearedAdminNotificationIds)) {
      clearedIds = prefs.clearedAdminNotificationIds;
    }
  }

  const [latestUsers, pendingDjs, latestBookings, latestMixes, latestEvents] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, email: true, role: true, createdAt: true } }),
    prisma.djProfile.findMany({ where: { verified: false }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, stageName: true, createdAt: true } }),
    prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { client: { select: { email: true } }, dj: { select: { stageName: true } } } }),
    prisma.mix.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { dj: { select: { stageName: true } } } }),
    prisma.event.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, title: true, createdAt: true } }),
  ]);

  let notifications = [
    ...latestUsers.map((u) => ({ id: `user-${u.id}`, type: 'user', title: 'New User Registration', message: `${u.email} joined as ${u.role.toLowerCase()}`, createdAt: u.createdAt })),
    ...pendingDjs.map((d) => ({ id: `verify-${d.id}`, type: 'verification', title: 'DJ Verification Request', message: `${d.stageName} is awaiting verification`, createdAt: d.createdAt })),
    ...latestBookings.map((b) => ({ id: `booking-${b.id}`, type: 'booking', title: `New Booking — ${b.status}`, message: `${b.client?.email || 'A client'} booked ${b.dj?.stageName || 'a DJ'}`, createdAt: b.createdAt })),
    ...latestMixes.map((m) => ({ id: `mix-${m.id}`, type: 'mix', title: 'New Mix Uploaded', message: `${m.title} by ${m.dj?.stageName || 'Unknown'}`, createdAt: m.createdAt })),
    ...latestEvents.map((e) => ({ id: `event-${e.id}`, type: 'event', title: 'New Event Created', message: e.title, createdAt: e.createdAt })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter out cleared notifications
  notifications = notifications.filter((n) => !clearedIds.includes(n.id));

  // Compute read status based on adminNotificationReadAt timestamp
  notifications = notifications.slice(0, limit).map((n) => ({
    ...n,
    read: readAt ? new Date(n.createdAt).getTime() <= readAt.getTime() : false,
  }));

  return ok(res, notifications);
}));

// POST /api/admin/notifications/mark-read - Mark all admin notifications as read
router.post('/notifications/mark-read', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return fail(res, 401, 'Unauthorized');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  });

  const prefs = (user?.notificationPreferences as Record<string, any> | null) || {};
  await prisma.user.update({
    where: { id: userId },
    data: {
      notificationPreferences: {
        ...prefs,
        adminNotificationReadAt: new Date().toISOString(),
      },
    },
  });

  return res.json({ success: true });
}));

// POST /api/admin/notifications/clear - Clear all current admin notifications
router.post('/notifications/clear', asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return fail(res, 401, 'Unauthorized');

  const limit = Math.min(50, parseInt(req.query.limit) || 20);

  // Rebuild the same synthetic list to capture current IDs
  const [latestUsers, pendingDjs, latestBookings, latestMixes, latestEvents] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, createdAt: true } }),
    prisma.djProfile.findMany({ where: { verified: false }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, createdAt: true } }),
    prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, createdAt: true } }),
    prisma.mix.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, createdAt: true } }),
    prisma.event.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, createdAt: true } }),
  ]);

  const currentIds = [
    ...latestUsers.map((u) => `user-${u.id}`),
    ...pendingDjs.map((d) => `verify-${d.id}`),
    ...latestBookings.map((b) => `booking-${b.id}`),
    ...latestMixes.map((m) => `mix-${m.id}`),
    ...latestEvents.map((e) => `event-${e.id}`),
  ].sort((a, b) => b.localeCompare(a)).slice(0, limit);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  });

  const prefs = (user?.notificationPreferences as Record<string, any> | null) || {};
  const existingCleared = Array.isArray(prefs?.clearedAdminNotificationIds) ? prefs.clearedAdminNotificationIds : [];
  const merged = Array.from(new Set([...existingCleared, ...currentIds]));
  // Cap at 200 to prevent unbounded growth
  const capped = merged.slice(-200);

  await prisma.user.update({
    where: { id: userId },
    data: {
      notificationPreferences: {
        ...prefs,
        clearedAdminNotificationIds: capped,
      },
    },
  });

  return res.json({ success: true });
}));

// GET /api/admin/battles - Admin battles list with full details
router.get('/battles', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

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
            dj: { select: DJ_PUBLIC_SELECT },
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
}));

// POST /api/admin/battles - Create battle (admin endpoint)
router.post('/battles', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { title, weekStart, weekEnd, theme, metricType } = req.body;
  if (!title || !weekStart || !weekEnd) {
    return fail(res, 400, 'title, weekStart, and weekEnd are required');
  }
  if (metricType && !BATTLE_METRIC_TYPES.includes(metricType)) {
    return fail(res, 400, `metricType must be one of ${BATTLE_METRIC_TYPES.join(', ')}`);
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
}));

// POST /api/admin/battles/:id/close - Close battle (admin endpoint)
router.post('/battles/:id/close', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
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
    return fail(res, 404, 'Battle not found');
  }
  if (battle.status !== 'ACTIVE') {
    return fail(res, 400, 'Battle is already closed');
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

  return ok(res, {
      battle: updated,
      winners: sortedEntries.slice(0, 3).map((e, i) => ({
        position: i + 1,
        dj: e.dj,
        score: e.finalScore,
        votes: e.votesCast.length,
      })),
    });
}));

// PUT /api/admin/battles/:id - Update battle details
router.put('/battles/:id', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, weekStart, weekEnd, theme, metricType } = req.body;

  const existing = await prisma.battle.findUnique({ where: { id } });
  if (!existing) {
    return fail(res, 404, 'Battle not found');
  }

  if (metricType && !BATTLE_METRIC_TYPES.includes(metricType)) {
    return fail(res, 400, `metricType must be one of ${BATTLE_METRIC_TYPES.join(', ')}`);
  }

  const data: any = {};
  if (title !== undefined) data.title = title;
  if (weekStart !== undefined) data.weekStart = new Date(weekStart);
  if (weekEnd !== undefined) data.weekEnd = new Date(weekEnd);
  if (theme !== undefined) data.theme = theme || null;
  if (metricType !== undefined) data.metricType = metricType;

  const updated = await prisma.battle.update({
    where: { id },
    data,
    include: {
      entries: {
        include: {
          dj: { select: DJ_PUBLIC_SELECT },
          votesCast: { select: { id: true } },
        },
      },
    },
  });

  await createAuditLog({
    actorId: req.user.id,
    targetId: null,
    action: 'BATTLE_UPDATE',
    entity: 'BATTLE',
    entityId: id,
    metadata: { title: updated.title, theme: updated.theme, metricType: updated.metricType },
    req,
  });

  return ok(res, updated);
}));

// POST /api/admin/battles/:id/entries - Add a DJ to a battle
router.post('/battles/:id/entries', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { djId, mixId } = req.body;
  if (!djId) {
    return fail(res, 400, 'djId is required');
  }

  const battle = await prisma.battle.findUnique({ where: { id } });
  if (!battle) {
    return fail(res, 404, 'Battle not found');
  }
  if (battle.status !== 'ACTIVE') {
    return fail(res, 400, 'Can only add DJs to active battles');
  }

  const dj = await prisma.djProfile.findUnique({ where: { id: djId } });
  if (!dj) {
    return fail(res, 404, 'DJ not found');
  }

  const existingEntry = await prisma.battleEntry.findFirst({
    where: { battleId: id, djId },
  });
  if (existingEntry) {
    return fail(res, 409, 'DJ is already in this battle');
  }

  const baseScore = await calculateBattleBaseScore(dj.id, battle.metricType);

  const entry = await prisma.battleEntry.create({
    data: {
      battleId: id,
      djId,
      mixId: mixId || null,
      baseScore,
      finalScore: baseScore,
    },
    include: {
      dj: { select: DJ_PUBLIC_SELECT },
      votesCast: { select: { id: true } },
    },
  });

  await createAuditLog({
    actorId: req.user.id,
    targetId: djId,
    action: 'BATTLE_ADD_ENTRY',
    entity: 'BATTLE_ENTRY',
    entityId: entry.id,
    metadata: { battleId: id, battleTitle: battle.title, djName: dj.stageName },
    req,
  });

  return res.status(201).json({ success: true, data: entry });
}));

// DELETE /api/admin/battles/:id/entries/:entryId - Remove a DJ from a battle
router.delete('/battles/:id/entries/:entryId', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id, entryId } = req.params;

  const battle = await prisma.battle.findUnique({ where: { id } });
  if (!battle) {
    return fail(res, 404, 'Battle not found');
  }

  const entry = await prisma.battleEntry.findUnique({
    where: { id: entryId },
    include: { dj: { select: { id: true, stageName: true } } },
  });
  if (!entry || entry.battleId !== id) {
    return fail(res, 404, 'Entry not found');
  }

  await prisma.battleEntry.delete({ where: { id: entryId } });

  await createAuditLog({
    actorId: req.user.id,
    targetId: entry.djId,
    action: 'BATTLE_REMOVE_ENTRY',
    entity: 'BATTLE_ENTRY',
    entityId: entryId,
    metadata: { battleId: id, battleTitle: battle.title, djName: entry.dj.stageName },
    req,
  });

  return ok(res, { message: 'Entry removed' });
}));

// POST /api/admin/notifications - Send a notification (in-memory only for now)
router.post('/notifications', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { type, target, title, message, scheduled, mediaUrl, mediaType } = req.body;
  if (!type || !title || !message) {
    return fail(res, 400, 'type, title, and message are required');
  }

  const wantsEmail = type === 'Email' || type === 'Both';
  const wantsWhatsApp = type === 'WhatsApp' || type === 'Both';
  let emailsSent = 0;
  let emailsFailed = 0;
  const emailErrors: string[] = [];
  let whatsappTargets: any[] = [];

  if (wantsWhatsApp) {
    const where: any = { status: { not: 'SUSPENDED' } };
    if (target === 'DJs Only') {
      where.djProfile = { isNot: null };
    } else if (target === 'Users Only') {
      where.djProfile = { is: null };
    }

    const phoneUsers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        phone: true,
        djProfile: { select: { stageName: true, whatsappNumber: true } },
      },
    });

    const formattedText = `${title}\n\n${message}`;
    whatsappTargets = phoneUsers
      .map((u: any) => {
        const rawPhone = u.djProfile?.whatsappNumber || u.phone;
        if (!rawPhone) return null;
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.length < 7) return null;
        return {
          id: u.id,
          name: u.djProfile?.stageName || u.username,
          phone: cleanPhone,
          whatsappUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(formattedText)}`,
        };
      })
      .filter(Boolean);
  }

  if (wantsEmail) {
    // Build recipient query based on target audience
    const where: any = { status: { not: 'SUSPENDED' } };
    if (target === 'DJs Only') {
      where.djProfile = { isNot: null };
    } else if (target === 'Users Only') {
      where.djProfile = { is: null };
    } else if (target === 'Admins Only') {
      where.role = { in: ['ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN'] };
    }
    // "All Users" gets no extra filter — all non-suspended users receive the email

    const recipients = await prisma.user.findMany({
      where,
      select: { email: true, username: true },
    });

    if (recipients.length === 0) {
      return ok(res, {
          id: `notif-${Date.now()}`,
          type, target, title, message,
          scheduled: scheduled || null,
          sentAt: new Date().toISOString(),
          emailsSent: 0,
          emailsFailed: 0,
          totalRecipients: 0,
          whatsappTargets,
          info: 'No email users match the target criteria',
        });
    }

    const frontendUrl = getFrontendUrl();
    // Email clients need an absolute URL — uploads are stored as
    // "/uploads/..." (relative) when S3 is not configured.
    const absoluteMediaUrl = mediaUrl
      ? (/^https?:\/\//.test(mediaUrl) ? mediaUrl : `${getFrontendUrl()}${mediaUrl}`)
      : null;
    const mediaHtml = absoluteMediaUrl
      ? mediaType === 'video'
        ? `<div style="text-align:center;margin:20px 0"><video src="${absoluteMediaUrl}" controls style="max-width:100%;border-radius:12px"></video></div>`
        : `<div style="text-align:center;margin:20px 0"><img src="${absoluteMediaUrl}" alt="Notification media" style="max-width:100%;border-radius:12px;object-fit:cover" /></div>`
      : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center">
  <table width="580" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;padding:36px;border:1px solid #222;max-width:580px">
    <tr><td style="text-align:center;padding-bottom:24px;border-bottom:1px solid #222">
      <h1 style="color:#f4e059;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px">DECK SALONE</h1>
      <p style="color:#666;font-size:12px;margin:4px 0 0">Sierra Leone's Premier DJ Platform</p>
    </td></tr>
    <tr><td style="padding:24px 0">
      <h2 style="color:#fff;margin:0 0 16px;font-size:20px">${String(title).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</h2>
      ${mediaHtml}
      <div style="color:#ccc;font-size:15px;line-height:1.75">${String(message).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>')}</div>
    </td></tr>
    <tr><td style="text-align:center;padding-top:24px;border-top:1px solid #222">
      <a href="${frontendUrl}" style="display:inline-block;background:#f4e059;color:#000;font-weight:700;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px">Visit Deck Salone</a>
      <p style="color:#444;font-size:11px;margin:16px 0 0">If you no longer wish to receive these emails, contact <a href="mailto:support@decksalone.com" style="color:#f4e059">support@decksalone.com</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

    // Send in batches of 50 to avoid overwhelming SMTP
    const BATCH_SIZE = 50;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((user) =>
          sendEmail({ to: user.email, subject: title, text: message, html })
        )
      );
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value?.success) {
          emailsSent++;
        } else {
          emailsFailed++;
          const errMsg = result.status === 'rejected' ? result.reason?.message : (result.value as any)?.error;
          emailErrors.push(`${batch[idx].email}: ${errMsg}`);
        }
      });
    }
  }

  return ok(res, {
      id: `notif-${Date.now()}`,
      type,
      target,
      title,
      message,
      scheduled: scheduled || null,
      sentAt: new Date().toISOString(),
      emailsSent,
      emailsFailed,
      totalRecipients: emailsSent + emailsFailed,
      whatsappCount: whatsappTargets.length,
      whatsappTargets,
      errors: emailErrors.slice(0, 5),
    });
}));

// GET /api/admin/security-logs - Security events from DB activity
router.get('/security-logs', asyncHandler(async (req, res) => {
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

  return ok(res, logs);
}));

// GET /api/admin/subscriptions - Subscription overview (derived from DJ tiers)
router.get('/subscriptions', asyncHandler(async (req, res) => {
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

  return ok(res, {
      plans,
      totalRevenue: Math.round(approvedRevenue._sum.amount || 0),
      activeBookings,
      pendingRequests,
      mrr: Math.round((proDjCount * config.proPrice) + (legendDjCount * config.legendPrice)),
      arr: Math.round(((proDjCount * config.proPrice) + (legendDjCount * config.legendPrice)) * 12),
    });
}));

// GET /api/admin/subscription-config - Current manual-payment config
router.get('/subscription-config', asyncHandler(async (req, res) => {
  const config = await getSubscriptionConfig();
  return ok(res, config);
}));

const subscriptionConfigSchema = z.object({
  paymentNumber: z.string().min(1),
  whatsappNumber: z.string().min(1).optional(),
  proPrice: z.number().min(0),
  legendPrice: z.number().min(0),
  currency: z.string().min(1).optional(),
});

// PUT /api/admin/subscription-config - Update manual-payment config
router.put('/subscription-config', requireRole('ADMIN', 'FINANCE_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = subscriptionConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const config = await setSubscriptionConfig(parsed.data, req.user.id);

  await createAuditLog({
    actorId: req.user.id,
    action: 'SUBSCRIPTION_CONFIG_UPDATE',
    entity: 'SYSTEM_CONFIG',
    metadata: parsed.data,
    req,
  });

  return ok(res, config);
}));

// GET /api/admin/ads - Ad campaign overview (alias for campaigns)
router.get('/ads', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const campaigns = await prisma.adCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      advertiser: { select: DJ_PUBLIC_SELECT },
    },
  });

  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);

  return ok(res, {
      campaigns: campaigns.map((c) => ({
        ...c,
        ctr: `${(c.ctr || 0).toFixed(2)}%`,
      })),
      totalBudget,
      totalSpent,
    });
}));

// POST /api/admin/ads - Create a new ad campaign
router.post('/ads', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = createAdSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const data = parsed.data;
  let creativeImageUrl = data.creativeImageUrl || null;
  if (creativeImageUrl && creativeImageUrl.startsWith('data:image/')) {
    try {
      const matches = creativeImageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        creativeImageUrl = await uploadBuffer(buffer, 'campaigns', { contentType: `image/${ext}`, ext });
      }
    } catch (imgErr) {
      console.error('Failed to convert base64 creativeImageUrl:', imgErr);
    }
  }

  const campaign = await prisma.adCampaign.create({
    data: {
      name: data.name,
      status: data.status,
      budget: data.budget,
      description: data.description || null,
      creativeImageUrl,
      ctaUrl: data.ctaUrl || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });

  await createAuditLog({
    actorId: req.user.id,
    action: 'CAMPAIGN_CREATE',
    entity: 'AD_CAMPAIGN',
    entityId: campaign.id,
    metadata: { name: campaign.name, status: campaign.status, budget: campaign.budget },
    req,
  });

  return res.status(201).json({ success: true, data: campaign });
}));

// PUT /api/admin/ads/:id - Update an existing ad campaign
router.put('/ads/:id', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = updateAdSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const { id } = req.params;
  const data = parsed.data;

  const existing = await prisma.adCampaign.findUnique({ where: { id } });
  if (!existing) {
    return fail(res, 404, 'Ad campaign not found');
  }

  let creativeImageUrl = data.creativeImageUrl;
  if (creativeImageUrl && creativeImageUrl.startsWith('data:image/')) {
    try {
      const matches = creativeImageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        creativeImageUrl = await uploadBuffer(buffer, 'campaigns', { contentType: `image/${ext}`, ext });
        if (existing.creativeImageUrl) {
          await deleteFile(existing.creativeImageUrl).catch(() => {});
        }
      }
    } catch (imgErr) {
      console.error('Failed to convert base64 creativeImageUrl:', imgErr);
    }
  }

  const updated = await prisma.adCampaign.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.budget !== undefined && { budget: data.budget }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(creativeImageUrl !== undefined && { creativeImageUrl: creativeImageUrl || null }),
      ...(data.ctaUrl !== undefined && { ctaUrl: data.ctaUrl || null }),
      ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
      ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
    },
    include: {
      advertiser: { select: DJ_PUBLIC_SELECT },
    },
  });

  await createAuditLog({
    actorId: req.user.id,
    targetId: updated.advertiserId || null,
    action: 'CAMPAIGN_UPDATE',
    entity: 'AD_CAMPAIGN',
    entityId: id,
    metadata: { name: updated.name, status: updated.status, budget: updated.budget },
    req,
  });

  return ok(res, updated);
}));

// DELETE /api/admin/ads/:id - Delete an ad campaign
router.delete('/ads/:id', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.adCampaign.findUnique({ where: { id } });
  if (!existing) {
    return fail(res, 404, 'Ad campaign not found');
  }

  await prisma.adCampaign.delete({ where: { id } });

  await createAuditLog({
    actorId: req.user.id,
    targetId: existing.advertiserId || null,
    action: 'CAMPAIGN_DELETE',
    entity: 'AD_CAMPAIGN',
    entityId: id,
    metadata: { name: existing.name },
    req,
  });

  return res.json({ success: true, message: 'Campaign deleted successfully' });
}));

// PUT /api/admin/campaigns/:id - Alias for updating campaign
router.put('/campaigns/:id', asyncHandler(async (req, res) => {
  const parsed = updateAdSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const { id } = req.params;
  const data = parsed.data;

  const existing = await prisma.adCampaign.findUnique({ where: { id } });
  if (!existing) {
    return fail(res, 404, 'Ad campaign not found');
  }

  const updated = await prisma.adCampaign.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.budget !== undefined && { budget: data.budget }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.creativeImageUrl !== undefined && { creativeImageUrl: data.creativeImageUrl || null }),
      ...(data.ctaUrl !== undefined && { ctaUrl: data.ctaUrl || null }),
      ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
      ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
    },
    include: {
      advertiser: { select: DJ_PUBLIC_SELECT },
    },
  });

  return ok(res, updated);
}));

// PUT /api/admin/campaigns/:id/status - Update campaign status (approve/reject/pause)
router.put('/campaigns/:id/status', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = campaignStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const { status, notes } = parsed.data;
  const campaignId = req.params.id;
  const campaign = await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status },
    include: {
      advertiser: { select: DJ_PUBLIC_SELECT },
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

  return ok(res, campaign);
}));

// POST /api/admin/broadcast-email - Send email to all users or specific role
const broadcastEmailSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  targetRole: z.enum(['ALL', 'USER', 'DJ', 'ADMIN']).optional().default('ALL'),
});

router.post('/broadcast-email', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const parsed = broadcastEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
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
    return ok(res, { sent: 0, message: 'No users match the target criteria' });
  }

  const frontendUrl = getFrontendUrl();
  const logoUrl = `${frontendUrl}/assets/logo.jpg`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#111;background:#fff">
    <div style="text-align:center;margin-bottom:24px">
      <img src="${logoUrl}" alt="Deck Salone" width="80" height="80" style="border-radius:50%;object-fit:cover;margin-bottom:12px" />
      <h1 style="color:#f4e059;margin:0;font-size:24px">Deck Salone</h1>
    </div>
    <div style="line-height:1.6;color:#333">
      ${message.replace(/\n/g, '<br>')}
    </div>
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center;color:#666;font-size:12px">
      <p>Deck Salone — The Premier DJ Platform</p>
      <p><a href="${frontendUrl}" style="color:#f4e059">${frontendUrl}</a></p>
      <p style="margin-top:8px">If you no longer wish to receive these emails, please contact <a href="mailto:support@decksalone.com" style="color:#f4e059">support@decksalone.com</a></p>
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

  return ok(res, {
      sent: sentCount,
      failed: failedCount,
      total: users.length,
      targetRole,
      errors: errors.slice(0, 10), // Limit error details
    });
}));

// ───────────────────────────────────────────────────────────────────
// Live Sets (DJ Sets) Admin Routes
// ───────────────────────────────────────────────────────────────────

// GET /api/admin/sets - List all DJ sets with pagination and filters
router.get('/sets', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { search, djId, isPublic, page, limit } = req.query;
  const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

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
        dj: { select: DJ_PUBLIC_SELECT },
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
}));

// GET /api/admin/sets/:id - Get a single set with full details
router.get('/sets/:id', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const set = await prisma.djSet.findUnique({
    where: { id: req.params.id },
    include: {
      dj: { select: { id: true, stageName: true, avatar: true, user: { select: { email: true } } } },
      items: {
        orderBy: { sortOrder: 'asc' },
        include: {
          mix: {
            include: {
              dj: { select: DJ_PUBLIC_SELECT },
            },
          },
        },
      },
    },
  });

  if (!set) return fail(res, 404, 'Set not found');

  return ok(res, { ...set, mixCount: set.items.length });
}));

// PUT /api/admin/sets/:id - Update any set (admin override)
router.put('/sets/:id', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = updateSetSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
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

  return ok(res, { ...set, mixCount: set.items.length });
}));

// DELETE /api/admin/sets/:id - Delete any set (admin override)
router.delete('/sets/:id', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const set = await prisma.djSet.findUnique({
    where: { id: req.params.id },
    include: { dj: { select: { id: true, stageName: true } } },
  });
  if (!set) return fail(res, 404, 'Set not found');

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

  return ok(res, { id: req.params.id, message: 'Set deleted' });
}));

// POST /api/admin/sets/:id/mixes - Add a mix to a set (admin override)
router.post('/sets/:id/mixes', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const parsed = setItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const set = await prisma.djSet.findUnique({
    where: { id: req.params.id },
    include: { dj: { select: { id: true, stageName: true } } },
  });
  if (!set) return fail(res, 404, 'Set not found');

  const mix = await prisma.mix.findUnique({ where: { id: parsed.data.mixId } });
  if (!mix) return fail(res, 404, 'Mix not found');

  const item = await prisma.djSetItem.create({
    data: { setId: req.params.id, mixId: parsed.data.mixId, sortOrder: parsed.data.sortOrder || 0 },
    include: {
      mix: {
        include: {
          dj: { select: DJ_PUBLIC_SELECT },
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
}));

// DELETE /api/admin/sets/:id/mixes/:mixId - Remove a mix from a set (admin override)
router.delete('/sets/:id/mixes/:mixId', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const set = await prisma.djSet.findUnique({
    where: { id: req.params.id },
    include: { dj: { select: { id: true, stageName: true } } },
  });
  if (!set) return fail(res, 404, 'Set not found');

  const item = await prisma.djSetItem.findUnique({
    where: { setId_mixId: { setId: req.params.id, mixId: req.params.mixId } },
  });
  if (!item) return fail(res, 404, 'Mix not found in this set');

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

  return ok(res, { removed: true });
}));

// PUT /api/admin/sets/:id/reorder - Reorder items in a set (admin override)
router.put('/sets/:id/reorder', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const set = await prisma.djSet.findUnique({
    where: { id: req.params.id },
    include: { dj: { select: { id: true, stageName: true } } },
  });
  if (!set) return fail(res, 404, 'Set not found');

  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return fail(res, 400, 'items array is required');
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
              dj: { select: DJ_PUBLIC_SELECT },
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

  return ok(res, updated);
}));

// GET /api/admin/sets/stats - Set statistics
router.get('/sets/stats', requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req, res) => {
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
    select: DJ_PUBLIC_SELECT,
  });

  const djMap = new Map(djs.map((d: any) => [d.id, d]));

  return ok(res, {
      totalSets,
      publicSets,
      privateSets,
      totalItems,
      topDjs: topDjs.map((d: any) => ({
        ...(djMap.get(d.djId) as Record<string, any> || {}),
        setCount: d._count.djId,
      })),
    });
}));

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/test-email - Send instant SMTP test email
// ───────────────────────────────────────────────────────────────────
router.post('/test-email', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { to } = req.body;
    if (!to || !to.includes('@')) {
      return fail(res, 400, 'Valid recipient email required');
    }
    const result = await sendEmail({
      to,
      subject: '✅ Deck Salone — Hostinger SMTP Test Email',
      text: `This is an instant test email from Deck Salone Admin Dashboard sent to ${to}. Your Hostinger SMTP configuration (support@decksalone.com) is active and delivering correctly!`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;color:#fff;"><table width="100%" style="padding:40px 20px;"><tr><td align="center"><table width="560" style="background:#111;border-radius:16px;padding:32px;border:1px solid #333;text-align:center;"><tr><td><h1 style="color:#f4e059;margin:0;">DECK SALONE</h1><p style="color:#22c55e;font-size:18px;font-weight:bold;margin:16px 0 8px;">✅ Hostinger SMTP is Working!</p><p style="color:#aaa;font-size:14px;">This test email was successfully dispatched via support@decksalone.com to <strong>${to}</strong> at ${new Date().toUTCString()}.</p></td></tr></table></td></tr></table></body></html>`
    });
    if (!result.success) {
      return fail(res, 500, result.error || 'Failed to send test email');
    }
    return ok(res, { sentTo: to, message: `Test email sent to ${to}` });
  } catch (error: any) {
    console.error('[admin.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/send-email - Send custom branded HTML email
// ───────────────────────────────────────────────────────────────────
router.post('/send-email', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !to.includes('@')) {
      return fail(res, 400, 'Valid target email is required');
    }
    if (!subject || !body) {
      return fail(res, 400, 'Subject and body message are required');
    }
    const result = await sendEmail({
      to,
      subject,
      text: body,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;color:#fff;"><table width="100%" style="padding:40px 20px;"><tr><td align="center"><table width="580" style="background:#111;border-radius:16px;padding:36px;border:1px solid #333;"><tr style="text-align:center;"><td><h1 style="color:#f4e059;margin:0 0 16px;">DECK SALONE</h1></td></tr><tr><td style="color:#ddd;font-size:15px;line-height:1.7;">${String(body).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</td></tr><tr style="text-align:center;"><td><hr style="border:0;border-top:1px solid #222;margin:24px 0;"/><p style="color:#666;font-size:12px;margin:0;">Deck Salone — Sierra Leone's #1 Official DJ Platform</p></td></tr></table></td></tr></table></body></html>`
    });
    if (!result.success) {
      return fail(res, 500, result.error || 'Failed to send custom email');
    }
    return ok(res, { sentTo: to, message: `Custom email delivered to ${to}` });
  } catch (error: any) {
    console.error('[admin.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/dispatch-bug-report - Dispatch bug summary email
// ───────────────────────────────────────────────────────────────────
router.post('/dispatch-bug-report', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { sendDailyBugSummary } = require('../utils/bugReport');
    const result = await sendDailyBugSummary();
    return ok(res, result);
  } catch (error: any) {
    console.error('[admin.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/nudge-incomplete-profiles - Send 5-step profile nudges
// ───────────────────────────────────────────────────────────────────
router.post('/nudge-incomplete-profiles', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { nudgeIncompleteProfiles } = require('../utils/profileCompletion');
    const { userId } = req.body;
    const result = await nudgeIncompleteProfiles(userId);
    return ok(res, result);
  } catch (error: any) {
    console.error('[admin.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/trigger-birthday-emails - Trigger DJ birthday emails
// ───────────────────────────────────────────────────────────────────
router.post('/trigger-birthday-emails', async (req: any, res: any) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const birthdayUsers = await prisma.user.findMany({
      where: {
        dateOfBirth: { not: null },
      },
      select: { id: true, email: true, username: true, dateOfBirth: true, djProfile: { select: { stageName: true } } }
    });

    const matching = birthdayUsers.filter((u: any) => {
      if (!u.dateOfBirth) return false;
      const dob = new Date(u.dateOfBirth);
      return dob.getMonth() + 1 === month && dob.getDate() === day;
    });

    let sent = 0;
    for (const u of matching) {
      const name = u.djProfile?.stageName || u.username || 'Friend';
      await sendEmail({
        to: u.email,
        subject: `🎉 Happy Birthday from Deck Salone, ${name}!`,
        text: `Happy Birthday ${name}! Wishing you maximum success and great vibes from the entire Deck Salone team!`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;color:#fff;"><table width="100%" style="padding:40px 20px;"><tr><td align="center"><table width="560" style="background:#111;border-radius:16px;padding:36px;border:1px solid #333;text-align:center;"><tr><td><h1 style="color:#f4e059;margin:0 0 16px;">DECK SALONE</h1><div style="font-size:48px;">🎂🎉</div><h2 style="color:#fff;margin:16px 0 8px;">Happy Birthday, ${name}!</h2><p style="color:#aaa;font-size:14px;line-height:1.6;">Wishing you an incredible birthday filled with music, joy, and success!</p></td></tr></table></td></tr></table></body></html>`
      }).catch(() => {});
      sent++;
    }

    return ok(res, { totalMatched: matching.length, emailsSent: sent, message: `${sent} birthday emails dispatched!` });
  } catch (error: any) {
    console.error('[admin.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// ═══════════════════════════════════════════════════════════════════════
// ADMIN HELPER ENDPOINTS (mirroring useAdmin.ts hooks)
// ═══════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// GET /api/admin/events/ticketing/stats - Global event ticketing stats
// ───────────────────────────────────────────────────────────────────
router.get('/events/ticketing/stats', async (req: any, res: any) => {
  try {
    const [eventsAgg, ticketsAgg] = await Promise.all([
      prisma.event.aggregate({
        _count: { id: true },
        _sum: { totalRevenue: true, ticketsSold: true, ticketsCheckedIn: true },
        where: { isTicketed: true },
      }),
      prisma.eventTicket.aggregate({
        _count: { id: true },
        _sum: { amount: true, quantity: true },
      }),
    ]);

    const pendingApproval = await prisma.eventTicket.count({
      where: { status: 'pending', paymentStatus: 'paid' },
    });

    const data = {
      totalEvents: eventsAgg._count.id || 0,
      totalTicketsSold: ticketsAgg._sum.quantity || eventsAgg._sum.ticketsSold || 0,
      totalRevenue: eventsAgg._sum.totalRevenue || ticketsAgg._sum.amount || 0,
      totalCheckedIn: eventsAgg._sum.ticketsCheckedIn || 0,
      pendingApproval,
    };

    return ok(res, data);
  } catch (error: any) {
    console.error('[Admin Ticketing Stats] Error:', error.message);
    return fail(res, 500, 'Failed to load ticketing stats');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/events/:id/suspend - Suspend an event
// ───────────────────────────────────────────────────────────────────
router.post('/events/:id/suspend', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const parsed = suspendEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input');
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { publishStatus: 'suspended', status: 'cancelled' },
      include: { dj: { select: { id: true, stageName: true, userId: true } } },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: event.dj?.userId || null,
      action: 'EVENT_SUSPEND',
      entity: 'EVENT',
      entityId: event.id,
      metadata: { title: event.title, reason: parsed.data.reason || null },
      req,
    });

    return ok(res, event, 'Event suspended');
  } catch (error: any) {
    console.error('[Admin Suspend Event] Error:', error.message);
    return fail(res, 500, 'Failed to suspend event');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/events/:id/restore - Restore a suspended event
// ───────────────────────────────────────────────────────────────────
router.post('/events/:id/restore', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { publishStatus: 'published', status: 'upcoming' },
      include: { dj: { select: { id: true, stageName: true, userId: true } } },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: event.dj?.userId || null,
      action: 'EVENT_RESTORE',
      entity: 'EVENT',
      entityId: event.id,
      metadata: { title: event.title },
      req,
    });

    return ok(res, event, 'Event restored');
  } catch (error: any) {
    console.error('[Admin Restore Event] Error:', error.message);
    return fail(res, 500, 'Failed to restore event');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/upload-media - Generic admin media upload
// ───────────────────────────────────────────────────────────────────
router.post('/upload-media', uploadAdminMedia.single('media'), async (req: any, res: any) => {
  try {
    const file = req.file;
    if (!file) {
      return fail(res, 400, 'No media file provided');
    }

    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (!isImage && !isVideo) {
      return fail(res, 400, 'Only images and videos are allowed');
    }

    let buffer = file.buffer;
    let ext = file.originalname?.split('.').pop() || 'bin';

    if (isImage) {
      const processed = await processEventImage(buffer);
      buffer = processed.buffer;
      ext = processed.ext || 'webp';
    }

    const folder = isImage ? 'admin-media/images' : 'admin-media/videos';
    const url = await uploadBuffer(buffer, folder, { contentType: file.mimetype, ext });

    return res.json({
      success: true,
      url,
      type: isImage ? 'image' : 'video',
      mime: file.mimetype,
    });
  } catch (error: any) {
    console.error('[Admin Upload Media] Error:', error.message);
    return fail(res, 500, 'Internal server error');
  }
});

// ───────────────────────────────────────────────────────────────────
// GET /api/admin/promo - DJs eligible for promotional subscription
// ───────────────────────────────────────────────────────────────────
router.get('/promo', async (req: any, res: any) => {
  try {
    const eligible = req.query.eligible === 'true';

    const djs = await prisma.djProfile.findMany({
      where: eligible
        ? {
            OR: [
              { user: { subscriptionTier: 'free' } },
              { subscriptionTier: 'free' },
            ],
          }
        : undefined,
      orderBy: { rankingPosition: 'asc' },
      take: 200,
      include: {
        user: {
          select: { id: true, email: true, subscriptionTier: true, createdAt: true },
        },
      },
    });

    const data = djs.map((dj: any) => ({
      id: dj.id,
      userId: dj.userId,
      stageName: dj.stageName,
      email: dj.user?.email,
      city: dj.city,
      verified: dj.verified,
      rankingPosition: dj.rankingPosition,
      totalStreams: dj.totalStreams,
      totalMixes: dj.totalMixes,
      subscriptionTier: dj.user?.subscriptionTier || dj.subscriptionTier || 'free',
      eligible: (dj.user?.subscriptionTier || dj.subscriptionTier || 'free') === 'free',
    }));

    return ok(res, eligible ? data.filter((d: any) => d.eligible) : data);
  } catch (error: any) {
    console.error('[Admin Promo] Error:', error.message);
    return fail(res, 500, 'Failed to load promo list');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/promo/:djId/activate - Activate promo subscription
// ───────────────────────────────────────────────────────────────────
router.post('/promo/:djId/activate', requireRole('ADMIN', 'FINANCE_ADMIN'), async (req: any, res: any) => {
  try {
    const parsed = activatePromoSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input');
    }

    const dj = await prisma.djProfile.findUnique({
      where: { id: req.params.djId },
      include: { user: { select: { id: true, email: true, subscriptionTier: true } } },
    });
    if (!dj) {
      return fail(res, 404, 'DJ not found');
    }

    await activateSubscriptionFeatures(dj.userId, 'pro', { months: parsed.data.months });

    const updatedUser = await prisma.user.update({
      where: { id: dj.userId },
      data: { subscriptionTier: 'pro', subscriptionActivatedAt: new Date() },
      select: { id: true, email: true, subscriptionTier: true, subscriptionActivatedAt: true },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: dj.userId,
      action: 'PROMO_ACTIVATE',
      entity: 'DJ',
      entityId: dj.id,
      metadata: { months: parsed.data.months, reason: parsed.data.reason || null, stageName: dj.stageName },
      req,
    });

    return ok(res, updatedUser, 'Promo subscription activated');
  } catch (error: any) {
    console.error('[Admin Promo Activate] Error:', error.message);
    return fail(res, 500, 'Failed to activate promo');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/grant-plan - Directly grant Pro / Legend plan
// ───────────────────────────────────────────────────────────────────
router.post('/grant-plan', requireRole('ADMIN', 'FINANCE_ADMIN'), async (req: any, res: any) => {
  try {
    const parsed = grantPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
    }

    const { djId, plan, months, reason } = parsed.data;

    const dj = await prisma.djProfile.findUnique({
      where: { id: djId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!dj) {
      return fail(res, 404, 'DJ not found');
    }

    await activateSubscriptionFeatures(dj.userId, plan, { months });

    const updatedUser = await prisma.user.update({
      where: { id: dj.userId },
      data: { subscriptionTier: plan, subscriptionActivatedAt: new Date() },
      select: { id: true, email: true, subscriptionTier: true, subscriptionActivatedAt: true },
    });

    await createAuditLog({
      actorId: req.user.id,
      targetId: dj.userId,
      action: 'PLAN_GRANT',
      entity: 'DJ',
      entityId: dj.id,
      metadata: { plan, months, reason: reason || null, stageName: dj.stageName },
      req,
    });

    return ok(res, updatedUser, `${plan} plan granted for ${months} month(s)`);
  } catch (error: any) {
    console.error('[Admin Grant Plan] Error:', error.message);
    return fail(res, 500, 'Failed to grant plan');
  }
});

// ───────────────────────────────────────────────────────────────────
// GET /api/admin/birthdays - Upcoming DJ/user birthdays
// ───────────────────────────────────────────────────────────────────
router.get('/birthdays', async (req: any, res: any) => {
  try {
    const today = new Date();
    const users = await prisma.user.findMany({
      where: { dateOfBirth: { not: null } },
      select: {
        id: true,
        email: true,
        username: true,
        dateOfBirth: true,
        lastBirthdayEmailSentAt: true,
        djProfile: { select: { id: true, stageName: true } },
      },
    });

    const data = users
      .filter((u: any) => u.dateOfBirth)
      .map((u: any) => {
        const dob = new Date(u.dateOfBirth);
        const thisYear = today.getFullYear();
        let nextBirthday = new Date(thisYear, dob.getMonth(), dob.getDate());
        if (nextBirthday < today) {
          nextBirthday = new Date(thisYear + 1, dob.getMonth(), dob.getDate());
        }
        const diffDays = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: u.id,
          email: u.email,
          username: u.username,
          stageName: u.djProfile?.stageName,
          dateOfBirth: u.dateOfBirth,
          nextBirthday,
          daysUntil: diffDays,
          lastWishSentAt: u.lastBirthdayEmailSentAt,
        };
      })
      .sort((a: any, b: any) => a.daysUntil - b.daysUntil);

    return ok(res, data);
  } catch (error: any) {
    console.error('[Admin Birthdays] Error:', error.message);
    return fail(res, 500, 'Failed to load birthdays');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/birthdays/send-wish - Send birthday email/notification
// ───────────────────────────────────────────────────────────────────
router.post('/birthdays/send-wish', async (req: any, res: any) => {
  try {
    const parsed = birthdayWishSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input');
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      include: { djProfile: { select: { stageName: true } } },
    });
    if (!user) {
      return fail(res, 404, 'User not found');
    }

    const name = user.djProfile?.stageName || user.username || 'Friend';
    const result = await sendEmail({
      to: user.email,
      subject: `🎉 Happy Birthday from Deck Salone, ${name}!`,
      text: `Happy Birthday ${name}! Wishing you maximum success and great vibes from the entire Deck Salone team!`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;color:#fff;"><table width="100%" style="padding:40px 20px;"><tr><td align="center"><table width="560" style="background:#111;border-radius:16px;padding:36px;border:1px solid #333;text-align:center;"><tr><td><h1 style="color:#f4e059;margin:0 0 16px;">DECK SALONE</h1><div style="font-size:48px;">🎂🎉</div><h2 style="color:#fff;margin:16px 0 8px;">Happy Birthday, ${name}!</h2><p style="color:#aaa;font-size:14px;line-height:1.6;">Wishing you an incredible birthday filled with music, joy, and success!</p></td></tr></table></td></tr></table></body></html>`,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastBirthdayEmailSentAt: new Date() },
    });

    return res.json({ success: result.success, data: { sentTo: user.email } });
  } catch (error: any) {
    console.error('[Admin Birthday Wish] Error:', error.message);
    return fail(res, 500, 'Failed to send birthday wish');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/birthdays/trigger-cron - Manual trigger birthday emails
// ───────────────────────────────────────────────────────────────────
router.post('/birthdays/trigger-cron', async (req: any, res: any) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const birthdayUsers = await prisma.user.findMany({
      where: { dateOfBirth: { not: null } },
      select: { id: true, email: true, username: true, dateOfBirth: true, djProfile: { select: { stageName: true } } },
    });

    const matching = birthdayUsers.filter((u: any) => {
      if (!u.dateOfBirth) return false;
      const dob = new Date(u.dateOfBirth);
      return dob.getMonth() + 1 === month && dob.getDate() === day;
    });

    let sent = 0;
    for (const u of matching) {
      const name = u.djProfile?.stageName || u.username || 'Friend';
      await sendEmail({
        to: u.email,
        subject: `🎉 Happy Birthday from Deck Salone, ${name}!`,
        text: `Happy Birthday ${name}! Wishing you maximum success and great vibes from the entire Deck Salone team!`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;color:#fff;"><table width="100%" style="padding:40px 20px;"><tr><td align="center"><table width="560" style="background:#111;border-radius:16px;padding:36px;border:1px solid #333;text-align:center;"><tr><td><h1 style="color:#f4e059;margin:0 0 16px;">DECK SALONE</h1><div style="font-size:48px;">🎂🎉</div><h2 style="color:#fff;margin:16px 0 8px;">Happy Birthday, ${name}!</h2><p style="color:#aaa;font-size:14px;line-height:1.6;">Wishing you an incredible birthday filled with music, joy, and success!</p></td></tr></table></td></tr></table></body></html>`,
      }).catch(() => {});
      await prisma.user.update({ where: { id: u.id }, data: { lastBirthdayEmailSentAt: new Date() } }).catch(() => {});
      sent++;
    }

    return ok(res, { totalMatched: matching.length, emailsSent: sent });
  } catch (error: any) {
    console.error('[Admin Trigger Birthdays] Error:', error.message);
    return fail(res, 500, 'Failed to trigger birthday emails');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/rankings/notify-top3 - Notify top 3 ranked DJs
// ───────────────────────────────────────────────────────────────────
router.post('/rankings/notify-top3', async (req: any, res: any) => {
  try {
    const top3 = await prisma.djProfile.findMany({
      where: { rankingPosition: { gt: 0 } },
      orderBy: { rankingPosition: 'asc' },
      take: 3,
      include: { user: { select: { id: true, email: true } } },
    });

    const results = [];
    for (const dj of top3) {
      const name = dj.stageName;
      const email = dj.user?.email;
      if (email) {
        const result = await sendEmail({
          to: email,
          subject: `🏆 You're #${dj.rankingPosition} on Deck Salone Rankings!`,
          text: `Congratulations ${name}! You are currently ranked #${dj.rankingPosition} on Deck Salone. Keep the momentum going!`,
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;color:#fff;"><table width="100%" style="padding:40px 20px;"><tr><td align="center"><table width="560" style="background:#111;border-radius:16px;padding:36px;border:1px solid #333;text-align:center;"><tr><td><h1 style="color:#f4e059;margin:0 0 16px;">DECK SALONE</h1><div style="font-size:48px;">🏆</div><h2 style="color:#fff;margin:16px 0 8px;">Congratulations, ${name}!</h2><p style="color:#aaa;font-size:14px;line-height:1.6;">You are currently ranked <strong style="color:#f4e059;">#${dj.rankingPosition}</strong> on Deck Salone. Keep the momentum going and continue sharing your mixes!</p></td></tr></table></td></tr></table></body></html>`,
        });
        results.push({ djId: dj.id, stageName: name, email, sent: result.success });
      }

      await prisma.notification.create({
        data: {
          userId: dj.userId,
          type: 'SYSTEM',
          title: `🏆 Rank #${dj.rankingPosition}`,
          body: `Congratulations ${name}! You are ranked #${dj.rankingPosition} on Deck Salone.`,
          actionUrl: '/rankings',
        },
      }).catch(() => {});
    }

    return ok(res, results);
  } catch (error: any) {
    console.error('[Admin Notify Top 3] Error:', error.message);
    return fail(res, 500, 'Failed to notify top DJs');
  }
});

// ───────────────────────────────────────────────────────────────────
// GET /api/admin/system-errors - System error log reader
// ───────────────────────────────────────────────────────────────────
router.get('/system-errors', async (req: any, res: any) => {
  try {
    const { page, limit, skip } = parsePagination({ page: req.query.page, limit: req.query.limit }, { defaultLimit: 30, maxLimit: 100 });
    const level = req.query.level || 'ALL';
    const source = req.query.source || 'ALL';

    const where: any = {};
    if (level !== 'ALL') where.level = level;
    if (source !== 'ALL') where.source = source;

    const [errors, total] = await Promise.all([
      prisma.systemErrorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.systemErrorLog.count({ where }),
    ]);

    return res.json({
      success: true,
      data: errors,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('[Admin System Errors] Error:', error.message);
    return fail(res, 500, 'Failed to load system errors');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/system-errors/digest - Send system error summary digest
// ───────────────────────────────────────────────────────────────────
router.post('/system-errors/digest', async (req: any, res: any) => {
  try {
    const { checkAndSendDailyBugReport } = require('../utils/bugReport');
    const result = await checkAndSendDailyBugReport();
    return res.json(result);
  } catch (error: any) {
    console.error('[Admin System Errors Digest] Error:', error.message);
    return fail(res, 500, 'Failed to send error digest');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/send-custom-email - Send custom email to user/DJ
// ───────────────────────────────────────────────────────────────────
router.post('/send-custom-email', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const parsed = customEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
    }

    const { to, subject, message, recipientName } = parsed.data;
    const name = recipientName || to;

    const result = await sendEmail({
      to,
      subject,
      text: message,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;color:#fff;"><table width="100%" style="padding:40px 20px;"><tr><td align="center"><table width="580" style="background:#111;border-radius:16px;padding:36px;border:1px solid #333;"><tr style="text-align:center;"><td><h1 style="color:#f4e059;margin:0 0 16px;">DECK SALONE</h1></td></tr><tr><td style="color:#ddd;font-size:15px;line-height:1.7;white-space:pre-line;">${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td></tr><tr style="text-align:center;"><td><hr style="border:0;border-top:1px solid #222;margin:24px 0;"/><p style="color:#666;font-size:12px;margin:0;">Deck Salone — Sierra Leone's #1 Official DJ Platform</p></td></tr></table></td></tr></table></body></html>`,
    });

    if (!result.success) {
      return fail(res, 500, result.error || 'Failed to send email');
    }

    return ok(res, { sentTo: to }, 'Custom email sent');
  } catch (error: any) {
    console.error('[Admin Send Custom Email] Error:', error.message);
    return fail(res, 500, 'Failed to send custom email');
  }
});

// ───────────────────────────────────────────────────────────────────
// GET /api/admin/incomplete-profiles - DJs with incomplete profiles
// ───────────────────────────────────────────────────────────────────
router.get('/incomplete-profiles', async (req: any, res: any) => {
  try {
    const djs = await prisma.djProfile.findMany({
      include: {
        user: { select: { id: true, email: true, username: true, avatar: true, lastProfileNudgeSentAt: true } },
        _count: { select: { mixes: true } },
      },
    });

    const data = djs
      .map((dj: any) => {
        const completion = calculateProfileCompletion(dj.user, dj, dj._count.mixes);
        return {
          id: dj.id,
          userId: dj.userId,
          email: dj.user?.email,
          username: dj.user?.username,
          stageName: dj.stageName,
          avatar: dj.avatar || dj.user?.avatar,
          completion,
          lastNudgeSentAt: dj.user?.lastProfileNudgeSentAt,
        };
      })
      .filter((item: any) => !item.completion.isComplete)
      .sort((a: any, b: any) => a.completion.percentage - b.completion.percentage);

    return ok(res, data);
  } catch (error: any) {
    console.error('[Admin Incomplete Profiles] Error:', error.message);
    return fail(res, 500, 'Failed to load incomplete profiles');
  }
});

// ───────────────────────────────────────────────────────────────────
// POST /api/admin/profiles/nudge - Send nudge email to incomplete profiles
// ───────────────────────────────────────────────────────────────────
router.post('/profiles/nudge', requireRole('ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
  try {
    const { userId, allIncomplete } = req.body || {};

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { djProfile: true, _count: { select: { mixes: true } } },
      });
      if (!user) {
        return fail(res, 404, 'User not found');
      }
      const result = await sendProfileNudgeEmail(user, user.djProfile, user._count.mixes);
      return res.json({ success: result.success, data: { userId, email: user.email } });
    }

    if (allIncomplete) {
      const djs = await prisma.djProfile.findMany({
        include: {
          user: true,
          _count: { select: { mixes: true } },
        },
      });

      let sent = 0;
      for (const dj of djs) {
        const completion = calculateProfileCompletion(dj.user, dj, dj._count.mixes);
        if (!completion.isComplete) {
          await sendProfileNudgeEmail(dj.user, dj, dj._count.mixes).catch(() => {});
          sent++;
        }
      }
      return ok(res, { emailsSent: sent });
    }

    return fail(res, 400, 'Provide userId or set allIncomplete to true');
  } catch (error: any) {
    console.error('[Admin Profile Nudge] Error:', error.message);
    return fail(res, 500, 'Failed to send profile nudge');
  }
});

/* ─────────────────────────────────────────────────────────────
   VIOLATION REPORTS & EVENT SCAN LOGS
   GET /api/admin/reports
   PATCH /api/admin/reports/:id
   GET /api/admin/events/:id/scan-logs
   ───────────────────────────────────────────────────────────── */

const updateReportSchema = z.object({
  status: z.enum(['PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']).optional(),
  actionTaken: z.string().max(200).optional(),
});

// GET /api/admin/reports - Paginated violation reports (newest first)
router.get('/reports', requireRole('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), asyncHandler(async (req, res) => {
  const status = req.query.status as string;
  const { page, limit, skip } = parsePagination({ page: req.query.page as string, limit: req.query.limit as string });

  const where: any = {};
  if (status && status !== 'ALL') where.status = status;

  const [reports, total] = await Promise.all([
    prisma.violationReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        reporter: { select: { id: true, username: true, email: true, avatar: true } },
        targetUser: { select: { id: true, username: true, email: true, avatar: true, status: true } },
        mix: { select: { id: true, title: true, coverImage: true, isPublic: true } },
        event: { select: { id: true, title: true } },
        comment: { select: { id: true, content: true } },
      },
    }),
    prisma.violationReport.count({ where }),
  ]);

  return res.json({
    success: true,
    data: reports,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}));

// PATCH /api/admin/reports/:id - Update report status/action and audit-log it
router.patch('/reports/:id', requireRole('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), asyncHandler(async (req, res) => {
  const parsed = updateReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const report = await prisma.violationReport.findUnique({ where: { id: req.params.id } });
  if (!report) return fail(res, 404, 'Report not found');

  const updateData: any = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.actionTaken !== undefined) updateData.actionTaken = parsed.data.actionTaken;
  if (updateData.status === 'RESOLVED' || updateData.status === 'DISMISSED') {
    updateData.resolvedBy = req.user.id;
    updateData.resolvedAt = new Date();
  }

  const updated = await prisma.violationReport.update({
    where: { id: report.id },
    data: updateData,
  });

  await prisma.moderatorAuditLog.create({
    data: {
      moderatorId: req.user.id,
      moderatorName: req.user.username || req.user.email,
      action: `REPORT_UPDATE_${updateData.status || 'ACTION'}`,
      targetType: 'REPORT',
      targetId: report.id,
      targetName: report.reason,
      previousData: { status: report.status, actionTaken: report.actionTaken },
      newData: updateData,
    },
  }).catch((err: any) => console.error('ModeratorAuditLog write failed:', err.message));

  return ok(res, updated);
}));

// GET /api/admin/events/:id/scan-logs - Recent scan activity for an event
router.get('/events/:id/scan-logs', asyncHandler(async (req, res) => {
  const logs = await prisma.eventScanLog.findMany({
    where: { eventId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      ticket: {
        select: {
          id: true,
          ticketNumber: true,
          buyerName: true,
          buyerEmail: true,
          user: { select: { id: true, name: true, username: true } },
        },
      },
    },
  });

  return ok(res, logs);
}));

module.exports = router;

