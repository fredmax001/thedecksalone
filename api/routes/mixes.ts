const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { uploadMixAudio, uploadMixCover } = require('../utils/upload');

const router = express.Router();

const mixFilterSchema = z.object({
  category: z.string().optional(),
  genre: z.string().optional(),
  djId: z.string().optional(),
  search: z.string().optional(),
  featured: z.string().optional(),
  sortBy: z.enum(['plays', 'likes', 'downloads', 'newest']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const createMixSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  genre: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  tags: z.array(z.string()).optional(),
  duration: z.number().int().min(1).optional(),
  isPublic: z.boolean().optional(),
});

const updateMixSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  genre: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  tags: z.array(z.string()).optional(),
  duration: z.number().int().min(1).optional(),
  isPublic: z.boolean().optional(),
});

// GET /api/mixes - List mixes with filtering
router.get('/', async (req, res) => {
  try {
    const parsed = mixFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { category, genre, djId, search, featured, sortBy, order, page, limit } = parsed.data;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isPublic: true };
    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (genre) where.genre = { equals: genre, mode: 'insensitive' };
    if (djId) where.djId = djId;
    if (featured === 'true') where.featured = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'plays') orderBy.plays = order === 'asc' ? 'asc' : 'desc';
    else if (sortBy === 'likes') orderBy.likes = order === 'asc' ? 'asc' : 'desc';
    else if (sortBy === 'downloads') orderBy.downloads = order === 'asc' ? 'asc' : 'desc';
    else orderBy.createdAt = 'desc';

    const [mixes, total] = await Promise.all([
      prisma.mix.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          dj: { select: { id: true, stageName: true, avatar: true, city: true } },
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

// GET /api/mixes/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'salone-mix', name: 'Salone Mix', description: 'Sierra Leone vibes' },
      { id: 'throwbacks', name: 'Throwbacks', description: 'Classic hits' },
      { id: 'afrobeats', name: 'Afrobeats', description: 'Naija and African hits' },
      { id: 'amapiano', name: 'Amapiano', description: 'South African piano sound' },
      { id: 'dancehall', name: 'Dancehall', description: 'Jamaican and Caribbean vibes' },
      { id: 'club-mixes', name: 'Club Mixes', description: 'High energy club sets' },
      { id: 'wedding-mixes', name: 'Wedding Mixes', description: 'Wedding celebration sets' },
      { id: 'gospel', name: 'Gospel', description: 'Inspirational gospel mixes' },
    ];
    return res.json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/mixes/trending - Trending mixes
router.get('/trending', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));

    const mixes = await prisma.mix.findMany({
      where: { isPublic: true },
      orderBy: [{ plays: 'desc' }, { likes: 'desc' }],
      take: limitNum,
      include: {
        dj: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    return res.json({ success: true, data: mixes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/mixes/:id - Get single mix
router.get('/:id', async (req, res) => {
  try {
    const mix = await prisma.mix.findUnique({
      where: { id: req.params.id },
      include: {
        dj: { select: { id: true, stageName: true, avatar: true, city: true, country: true } },
      },
    });

    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    // Increment plays
    await prisma.mix.update({
      where: { id: req.params.id },
      data: { plays: { increment: 1 } },
    });

    return res.json({ success: true, data: { ...mix, plays: mix.plays + 1 } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/mixes - Create mix (auth required)
router.post('/', authMiddleware, uploadMixAudio.single('audio'), uploadMixCover.single('coverImage'), async (req, res) => {
  try {
    const parsed = createMixSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Must be a DJ to upload mixes' });
    }

    const djId = dj ? dj.id : req.body.djId;
    const data = parsed.data;

    const mix = await prisma.mix.create({
      data: {
        ...data,
        djId,
        audioUrl: req.file ? `/uploads/mixes/${req.file.filename}` : null,
        coverImage: req.files?.coverImage ? `/uploads/covers/${req.files.coverImage[0].filename}` : null,
      },
    });

    // Update totalMixes count
    await prisma.djProfile.update({
      where: { id: djId },
      data: { totalMixes: { increment: 1 } },
    });

    return res.status(201).json({ success: true, data: mix });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/mixes/:id - Update mix
router.put('/:id', authMiddleware, uploadMixAudio.single('audio'), uploadMixCover.single('coverImage'), async (req, res) => {
  try {
    const parsed = updateMixSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const mix = await prisma.mix.findUnique({
      where: { id: req.params.id },
      include: { dj: true },
    });
    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (mix.dj.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updateData = { ...parsed.data };
    if (req.file) {
      updateData.audioUrl = `/uploads/mixes/${req.file.filename}`;
    }
    if (req.files?.coverImage) {
      updateData.coverImage = `/uploads/covers/${req.files.coverImage[0].filename}`;
    }

    const updated = await prisma.mix.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/mixes/:id - Delete mix
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const mix = await prisma.mix.findUnique({
      where: { id: req.params.id },
      include: { dj: true },
    });
    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }
    if (mix.dj.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.mix.delete({ where: { id: req.params.id } });

    await prisma.djProfile.update({
      where: { id: mix.djId },
      data: { totalMixes: { decrement: 1 } },
    });

    return res.json({ success: true, data: { message: 'Mix deleted' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/mixes/:id/like - Like a mix
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    await prisma.mix.update({
      where: { id: req.params.id },
      data: { likes: { increment: 1 } },
    });
    return res.json({ success: true, data: { message: 'Mix liked' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/mixes/:id/download - Download a mix (increment counter)
router.post('/:id/download', authMiddleware, async (req, res) => {
  try {
    await prisma.mix.update({
      where: { id: req.params.id },
      data: { downloads: { increment: 1 } },
    });
    return res.json({ success: true, data: { message: 'Download counted' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
