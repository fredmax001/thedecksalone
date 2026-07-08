const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

const createGigSchema = z.object({
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  eventType: z.string().min(1),
  eventDate: z.string().min(1),
  startTime: z.string().optional(),
  durationHours: z.coerce.number().int().min(1).optional(),
  location: z.string().min(1),
  city: z.string().optional(),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
  musicStyles: z.array(z.string()).default([]),
  equipmentNeeded: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const applySchema = z.object({
  proposedPrice: z.coerce.number().min(0).optional(),
  message: z.string().max(1000).optional(),
});

const updateApplicationSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN']),
});

const gigListFilterSchema = z.object({
  status: z.string().optional(),
  city: z.string().optional(),
  eventType: z.string().optional(),
  sortBy: z.enum(['newest', 'budget', 'closing']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// POST /api/gigs - Public: create a DJ request/opportunity
router.post('/', async (req, res) => {
  try {
    const parsed = createGigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const eventDate = new Date(data.eventDate);
    if (Number.isNaN(eventDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid event date' });
    }

    const gig = await prisma.gig.create({
      data: {
        ...data,
        eventDate,
      },
    });

    return res.status(201).json({ success: true, data: gig });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/gigs - List opportunities (DJ only)
router.get('/', authMiddleware, requireRole('DJ', 'ADMIN'), async (req, res) => {
  try {
    const parsed = gigListFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filters' });
    }

    const { status = 'OPEN', city, eventType, sortBy, page, limit } = parsed.data;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (eventType) where.eventType = { equals: eventType, mode: 'insensitive' };

    const orderBy: any = {};
    if (sortBy === 'budget') orderBy.budgetMax = 'desc';
    else if (sortBy === 'closing') orderBy.eventDate = 'asc';
    else orderBy.createdAt = 'desc';

    const [gigs, total] = await Promise.all([
      prisma.gig.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          _count: { select: { applications: true } },
          applications: req.user.role === 'DJ' ? { where: { djId: req.user.id }, select: { id: true, status: true } } : false,
        },
      }),
      prisma.gig.count({ where }),
    ]);

    return res.json({
      success: true,
      data: gigs,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/gigs/:id - Get opportunity details
router.get('/:id', authMiddleware, requireRole('DJ', 'ADMIN'), async (req, res) => {
  try {
    const gig = await prisma.gig.findUnique({
      where: { id: req.params.id },
      include: {
        applications: req.user.role === 'ADMIN'
          ? { include: { dj: { select: { id: true, stageName: true, avatar: true, city: true, isPro: true } } } }
          : { where: { djId: req.user.id } },
      },
    });

    if (!gig) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    return res.json({ success: true, data: gig });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/gigs/:id/matches - Smart matching engine
router.get('/:id/matches', authMiddleware, requireRole('DJ', 'ADMIN'), async (req, res) => {
  try {
    const gig = await prisma.gig.findUnique({ where: { id: req.params.id } });
    if (!gig) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    const djs = await prisma.djProfile.findMany({
      where: { isPublic: true },
      include: { user: { select: { id: true, email: true } } },
    });

    const scored = djs
      .map((dj) => {
        let score = 0;
        const reasons: string[] = [];

        if (gig.city && dj.city && gig.city.toLowerCase() === dj.city.toLowerCase()) {
          score += 30;
          reasons.push('Same city');
        } else if (dj.willTravel) {
          score += 10;
          reasons.push('Willing to travel');
        }

        const genreOverlap = (gig.musicStyles || []).filter((g: string) => (dj.genres || []).includes(g)).length;
        if (genreOverlap > 0) {
          score += genreOverlap * 15;
          reasons.push(`${genreOverlap} music style match${genreOverlap > 1 ? 'es' : ''}`);
        }

        if (gig.eventType && (dj.eventTypes || []).includes(gig.eventType)) {
          score += 20;
          reasons.push('Event type match');
        }

        const equipOverlap = (gig.equipmentNeeded || []).filter((e: string) => (dj.equipment || []).includes(e)).length;
        if (equipOverlap > 0) {
          score += equipOverlap * 10;
          reasons.push(`${equipOverlap} equipment match${equipOverlap > 1 ? 'es' : ''}`);
        }

        if (gig.budgetMax && dj.bookingFeeMax && gig.budgetMax >= (dj.bookingFeeMin || 0) && gig.budgetMax <= dj.bookingFeeMax) {
          score += 20;
          reasons.push('Budget fit');
        }

        if (dj.isPro) {
          score += 5;
          reasons.push('Pro DJ');
        }

        return {
          id: dj.id,
          stageName: dj.stageName,
          avatar: dj.avatar,
          city: dj.city,
          isPro: dj.isPro,
          score: Math.min(100, score),
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return res.json({ success: true, data: scored });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/gigs/:id/apply - DJ applies to a gig
router.post('/:id/apply', authMiddleware, requireRole('DJ'), async (req, res) => {
  try {
    const gig = await prisma.gig.findUnique({ where: { id: req.params.id } });
    if (!gig) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }
    if (gig.status !== 'OPEN') {
      return res.status(400).json({ success: false, error: 'This opportunity is no longer open' });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }
    if (!dj.isPro) {
      return res.status(403).json({ success: false, error: 'Pro membership required to apply' });
    }

    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const existing = await prisma.gigApplication.findUnique({
      where: { gigId_djId: { gigId: gig.id, djId: dj.id } },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already applied to this opportunity' });
    }

    const application = await prisma.gigApplication.create({
      data: {
        gigId: gig.id,
        djId: dj.id,
        proposedPrice: parsed.data.proposedPrice,
        message: parsed.data.message,
      },
    });

    return res.status(201).json({ success: true, data: application });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/gigs/:id/applications/:appId/status - Accept/decline/withdraw
router.patch('/:id/applications/:appId/status', authMiddleware, async (req, res) => {
  try {
    const parsed = updateApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const application = await prisma.gigApplication.findUnique({
      where: { id: req.params.appId },
      include: { gig: true, dj: { include: { user: { select: { id: true } } } } },
    });

    if (!application || application.gigId !== req.params.id) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const { status } = parsed.data;
    const isAdmin = ['ADMIN', 'MODERATOR'].includes(req.user?.role);
    const isDj = req.user?.role === 'DJ' && application.dj.userId === req.user.id;

    if (status === 'WITHDRAWN') {
      if (!isDj && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    } else {
      // ACCEPTED / DECLINED only by admin for now (client token flow can be added later)
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    const updated = await prisma.gigApplication.update({
      where: { id: application.id },
      data: { status },
    });

    if (status === 'ACCEPTED') {
      await prisma.gig.update({
        where: { id: application.gigId },
        data: { status: 'ASSIGNED' },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
