const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const reviewFilterSchema = z.object({
  djId: z.string().optional(),
  userId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const createReviewSchema = z.object({
  djId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  eventType: z.string().optional(),
});

// GET /api/reviews - List reviews for a DJ
router.get('/', async (req, res) => {
  try {
    const parsed = reviewFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { djId, userId, page, limit } = parsed.data;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (djId) where.djId = djId;
    if (userId) where.userId = userId;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, email: true } },
          dj: { select: { id: true, stageName: true, avatar: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return res.json({
      success: true,
      data: reviews,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reviews - Create review
router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { djId, rating, comment, eventType } = parsed.data;

    // Check if user already reviewed this DJ
    const existing = await prisma.review.findUnique({
      where: { userId_djId: { userId: req.user.id, djId } },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'You already reviewed this DJ' });
    }

    // Verify user has a completed booking with this DJ (optional but recommended)
    const hasBooking = await prisma.booking.findFirst({
      where: {
        clientId: req.user.id,
        djId,
        status: 'COMPLETED',
      },
    });

    const review = await prisma.review.create({
      data: {
        userId: req.user.id,
        djId,
        rating,
        comment,
        eventType,
        verified: !!hasBooking, // Mark as verified if they have a completed booking
      },
      include: {
        user: { select: { id: true, email: true } },
        dj: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    // Update DJ average rating
    const reviews = await prisma.review.findMany({
      where: { djId },
      select: { rating: true },
    });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.djProfile.update({
      where: { id: djId },
      data: {
        averageRating: avg,
        communityScore: { increment: rating * 2 },
      },
    });

    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/reviews/:id - Delete review
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }
    if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.review.delete({ where: { id: req.params.id } });

    // Recalculate DJ average rating
    const reviews = await prisma.review.findMany({
      where: { djId: review.djId },
      select: { rating: true },
    });
    const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    await prisma.djProfile.update({
      where: { id: review.djId },
      data: { averageRating: avg },
    });

    return res.json({ success: true, data: { message: 'Review deleted' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
