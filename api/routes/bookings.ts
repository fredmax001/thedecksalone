const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { bookingLimiter } = require('../utils/rateLimiter');

const router = express.Router();

const bookingFilterSchema = z.object({
  status: z.string().optional(),
  asDj: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const createBookingSchema = z.object({
  djId: z.string(),
  eventType: z.string().min(1),
  eventDate: z.string().datetime(),
  eventLocation: z.string().min(1),
  duration: z.number().int().min(1),
  budget: z.number().min(0),
  notes: z.string().optional(),
  requirements: z.string().optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'NEGOTIATING', 'CONFIRMED', 'DEPOSIT_PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED']),
  finalPrice: z.number().min(0).optional(),
  deposit: z.number().min(0).optional(),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
});

// GET /api/bookings - List bookings (for logged in user)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const parsed = bookingFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { status, asDj, page, limit } = parsed.data;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    let where: any = {};

    if (asDj === 'true') {
      const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
      if (!dj) {
        return res.status(403).json({ success: false, error: 'You are not a DJ' });
      }
      where.djId = dj.id;
    } else {
      where.clientId = req.user.id;
    }

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
          payments: { select: { id: true, amount: true, status: true, type: true } },
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

// GET /api/bookings/:id - Get single booking
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, email: true } },
        dj: { select: { id: true, stageName: true, avatar: true, bookingFeeMin: true, bookingFeeMax: true } },
        payments: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    const isClient = booking.clientId === req.user.id;
    const isDj = dj && booking.djId === dj.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isClient && !isDj && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    return res.json({ success: true, data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/bookings - Create booking
router.post('/', authMiddleware, bookingLimiter, async (req, res) => {
  try {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Verify DJ exists
    const dj = await prisma.djProfile.findUnique({ where: { id: data.djId } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ not found' });
    }

    // Prevent booking yourself
    if (dj.userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot book yourself' });
    }

    const booking = await prisma.booking.create({
      data: {
        ...data,
        clientId: req.user.id,
        eventDate: new Date(data.eventDate),
      },
      include: {
        client: { select: { id: true, email: true } },
        dj: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    // Increment DJ totalBookings
    await prisma.djProfile.update({
      where: { id: data.djId },
      data: { totalBookings: { increment: 1 } },
    });

    return res.status(201).json({ success: true, data: booking });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/bookings/:id/status - Update booking status
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const parsed = statusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { status, finalPrice, deposit } = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { dj: true },
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    const isClient = booking.clientId === req.user.id;
    const isDj = dj && booking.djId === dj.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isClient && !isDj && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Status transition validation
    const validTransitions = {
      PENDING: ['NEGOTIATING', 'CONFIRMED', 'CANCELLED'],
      NEGOTIATING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['DEPOSIT_PAID', 'CANCELLED'],
      DEPOSIT_PAID: ['COMPLETED', 'REFUNDED'],
      COMPLETED: [],
      CANCELLED: [],
      REFUNDED: [],
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({ success: false, error: `Cannot transition from ${booking.status} to ${status}` });
    }

    // Only DJ can set finalPrice; only client can confirm when DJ proposes
    if (finalPrice !== undefined && !isDj && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Only the DJ can set the final price' });
    }

    const updateData: any = { status };
    if (finalPrice !== undefined) updateData.finalPrice = finalPrice;
    if (deposit !== undefined) updateData.deposit = deposit;

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        client: { select: { id: true, email: true } },
        dj: { select: { id: true, stageName: true, avatar: true } },
        payments: true,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/bookings/:id/review - Add review to completed booking
router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { rating, review } = parsed.data;

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (booking.clientId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Can only review completed bookings' });
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { rating, review },
    });

    // Update DJ average rating
    const bookings = await prisma.booking.findMany({
      where: { djId: booking.djId, rating: { not: null } },
      select: { rating: true },
    });
    const avg = bookings.reduce((sum, b) => sum + b.rating, 0) / bookings.length;

    await prisma.djProfile.update({
      where: { id: booking.djId },
      data: { averageRating: avg },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
