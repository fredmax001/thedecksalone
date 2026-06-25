const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { uploadAvatar, uploadDjProfileImages } = require('../utils/upload');
const { processAvatar, processCover } = require('../utils/imageProcessor');
const { uploadBuffer, deleteFile } = require('../utils/storage');
const { computeDjScore, recalculateAllRankings } = require('../utils/ranking');

const router = express.Router();

const djFilterSchema = z.object({
  city: z.string().optional(),
  genre: z.string().optional(),
  verified: z.string().optional(),
  minFee: z.string().optional(),
  maxFee: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['ranking', 'streams', 'followers', 'name', 'mixes', 'rating']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const createDjSchema = z.object({
  stageName: z.string().min(1).max(100),
  fullName: z.string().min(1).max(200),
  bio: z.string().max(2000).optional(),
  yearsActive: z.number().int().min(0).max(50).optional(),
  city: z.string().max(100).optional(),
  genres: z.array(z.string()).max(5).optional(),
  awards: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  bookingFeeMin: z.number().min(0).optional(),
  bookingFeeMax: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  availability: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  whatsappNumber: z.string().max(20).optional(),
  socialLinks: z.object({
    instagram: z.string().url().optional().or(z.literal('')),
    twitter: z.string().url().optional().or(z.literal('')),
    tiktok: z.string().url().optional().or(z.literal('')),
    youtube: z.string().url().optional().or(z.literal('')),
    facebook: z.string().url().optional().or(z.literal('')),
  }).optional(),
  streamingLinks: z.object({
    audiomack: z.string().url().optional().or(z.literal('')),
    mixcloud: z.string().url().optional().or(z.literal('')),
    soundcloud: z.string().url().optional().or(z.literal('')),
    youtube: z.string().url().optional().or(z.literal('')),
    hearthis: z.string().url().optional().or(z.literal('')),
    appleMusic: z.string().url().optional().or(z.literal('')),
    spotify: z.string().url().optional().or(z.literal('')),
  }).optional(),
});

const updateDjSchema = z.object({
  stageName: z.string().min(1).max(100).optional(),
  fullName: z.string().min(1).max(200).optional(),
  bio: z.string().max(2000).optional(),
  yearsActive: z.number().int().min(0).max(50).optional(),
  city: z.string().max(100).optional(),
  genres: z.array(z.string()).max(5).optional(),
  awards: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  bookingFeeMin: z.number().min(0).optional(),
  bookingFeeMax: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  availability: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  whatsappNumber: z.string().max(20).optional(),
  isPublic: z.boolean().optional(),
  socialLinks: z.object({
    instagram: z.string().url().optional().or(z.literal('')),
    twitter: z.string().url().optional().or(z.literal('')),
    tiktok: z.string().url().optional().or(z.literal('')),
    youtube: z.string().url().optional().or(z.literal('')),
    facebook: z.string().url().optional().or(z.literal('')),
  }).optional(),
  streamingLinks: z.object({
    audiomack: z.string().url().optional().or(z.literal('')),
    mixcloud: z.string().url().optional().or(z.literal('')),
    soundcloud: z.string().url().optional().or(z.literal('')),
    youtube: z.string().url().optional().or(z.literal('')),
    hearthis: z.string().url().optional().or(z.literal('')),
    appleMusic: z.string().url().optional().or(z.literal('')),
    spotify: z.string().url().optional().or(z.literal('')),
  }).optional(),
});

// Helper to parse JSON fields from FormData (multer stores them as strings)
function parseFormFields(body) {
  const parsed = { ...body };

  // Parse JSON fields
  ['socialLinks', 'streamingLinks'].forEach((key) => {
    if (typeof parsed[key] === 'string') {
      try {
        parsed[key] = JSON.parse(parsed[key]);
      } catch {
        // leave as-is if invalid JSON
      }
    }
  });

  // Coerce number fields from FormData strings
  if (parsed.yearsActive !== undefined && parsed.yearsActive !== '') {
    const n = parseInt(parsed.yearsActive, 10);
    if (!isNaN(n)) parsed.yearsActive = n;
  }
  if (parsed.bookingFeeMin !== undefined && parsed.bookingFeeMin !== '') {
    const n = parseFloat(parsed.bookingFeeMin);
    if (!isNaN(n)) parsed.bookingFeeMin = n;
  }
  if (parsed.bookingFeeMax !== undefined && parsed.bookingFeeMax !== '') {
    const n = parseFloat(parsed.bookingFeeMax);
    if (!isNaN(n)) parsed.bookingFeeMax = n;
  }

  // Ensure array fields are arrays (multer may send single string for one item)
  ['genres', 'awards', 'equipment', 'languages'].forEach((key) => {
    if (parsed[key] !== undefined && !Array.isArray(parsed[key])) {
      parsed[key] = [parsed[key]].filter(Boolean);
    }
  });

  return parsed;
}

// GET /api/djs - List DJs with filtering
router.get('/', async (req, res) => {
  try {
    const parsed = djFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { city, genre, verified, minFee, maxFee, search, sortBy, order, page, limit } = parsed.data;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isPublic: true };

    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (genre) where.genres = { has: genre };
    if (verified === 'true') where.verified = true;
    if (minFee) where.bookingFeeMin = { gte: parseFloat(minFee) };
    if (maxFee) where.bookingFeeMax = { lte: parseFloat(maxFee) };
    if (search) {
      where.OR = [
        { stageName: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'ranking') orderBy.rankingScore = order === 'asc' ? 'asc' : 'desc';
    else if (sortBy === 'streams') orderBy.totalStreams = order === 'asc' ? 'asc' : 'desc';
    else if (sortBy === 'followers') orderBy.totalFollowers = order === 'asc' ? 'asc' : 'desc';
    else if (sortBy === 'name') orderBy.stageName = order === 'desc' ? 'desc' : 'asc';
    else if (sortBy === 'mixes') orderBy.totalMixes = order === 'asc' ? 'asc' : 'desc';
    else if (sortBy === 'rating') orderBy.averageRating = order === 'asc' ? 'asc' : 'desc';
    else orderBy.rankingScore = 'desc';

    const [djs, total] = await Promise.all([
      prisma.djProfile.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          user: { select: { username: true } },
          streamingPlatforms: { select: { platform: true, followers: true, streams: true } },
          _count: { select: { mixes: true, reviews: true } },
        },
      }),
      prisma.djProfile.count({ where }),
    ]);

    return res.json({
      success: true,
      data: djs.map((dj) => ({ ...dj, username: dj.user.username })),
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/cities - Get all cities
router.get('/cities', async (req, res) => {
  try {
    const cities = await prisma.djProfile.findMany({
      where: { isPublic: true },
      select: { city: true },
      distinct: ['city'],
    });
    return res.json({ success: true, data: cities.map((c) => c.city).filter(Boolean) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/genres - Get all genres
router.get('/genres', async (req, res) => {
  try {
    const djs = await prisma.djProfile.findMany({
      where: { isPublic: true },
      select: { genres: true },
    });
    const genreSet = new Set();
    djs.forEach((dj) => dj.genres.forEach((g) => genreSet.add(g)));
    return res.json({ success: true, data: Array.from(genreSet) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/:identifier - Get single DJ by id or username
router.get('/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;

    const commonInclude = {
      user: { select: { username: true } },
      mixes: { where: { isPublic: true }, orderBy: { createdAt: 'desc' } },
      streamingPlatforms: true,
      reviews: {
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      events: { where: { status: 'upcoming' }, orderBy: { date: 'asc' } },
      _count: { select: { mixes: true, reviews: true, bookingsAsDj: true } },
    };

    let dj = await prisma.djProfile.findUnique({
      where: { id: identifier },
      include: commonInclude,
    });

    if (!dj) {
      dj = await prisma.djProfile.findFirst({
        where: { user: { username: { equals: identifier, mode: 'insensitive' } } },
        include: commonInclude,
      });
    }

    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ not found' });
    }

    return res.json({ success: true, data: { ...dj, username: dj.user.username } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/djs - Create DJ profile (auth required)
router.post('/', authMiddleware, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const existing = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'DJ profile already exists' });
    }

    const parsed = createDjSchema.safeParse(parseFormFields(req.body));
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Enforce genre limit
    if (data.genres && data.genres.length > 5) {
      return res.status(400).json({ success: false, error: 'Maximum 5 genres allowed' });
    }

    let avatarUrl = null;
    if (req.file) {
      const { buffer, contentType } = await processAvatar(req.file.buffer);
      avatarUrl = await uploadBuffer(buffer, 'avatars', { contentType });
    }

    const dj = await prisma.djProfile.create({
      data: {
        ...data,
        userId: req.user.id,
        avatar: avatarUrl,
      },
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: 'DJ' },
    });

    return res.status(201).json({ success: true, data: dj });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/djs/:id - Update DJ profile
router.put('/:id', authMiddleware, uploadDjProfileImages, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { id: req.params.id } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ not found' });
    }
    if (dj.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const parsed = updateDjSchema.safeParse(parseFormFields(req.body));
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const updateData = { ...parsed.data };

    // Handle avatar upload with processing pipeline
    if (req.files && req.files['avatar'] && req.files['avatar'][0]) {
      const file = req.files['avatar'][0];
      const { buffer, contentType } = await processAvatar(file.buffer);
      const avatarUrl = await uploadBuffer(buffer, 'avatars', { contentType });
      updateData.avatar = avatarUrl;
      // Delete old avatar if exists
      if (dj.avatar) {
        await deleteFile(dj.avatar).catch(() => {});
      }
    }

    // Handle cover banner upload with processing pipeline
    if (req.files && req.files['coverBanner'] && req.files['coverBanner'][0]) {
      const file = req.files['coverBanner'][0];
      const { buffer, contentType } = await processCover(file.buffer);
      const coverUrl = await uploadBuffer(buffer, 'covers', { contentType });
      updateData.coverBanner = coverUrl;
      // Delete old cover if exists
      if (dj.coverBanner) {
        await deleteFile(dj.coverBanner).catch(() => {});
      }
    }

    // Enforce genre limit
    if (updateData.genres && updateData.genres.length > 5) {
      return res.status(400).json({ success: false, error: 'Maximum 5 genres allowed' });
    }

    const updated = await prisma.djProfile.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/djs/:id - Delete DJ profile
router.delete('/:id', authMiddleware, requireRole('ADMIN', 'DJ'), async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { id: req.params.id } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ not found' });
    }
    if (dj.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.djProfile.delete({ where: { id: req.params.id } });
    return res.json({ success: true, data: { message: 'DJ profile deleted' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/djs/:id/recalculate - Recalculate ranking for a DJ (admin or self)
router.post('/:id/recalculate', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { id: req.params.id } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ not found' });
    }
    if (dj.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const scores = await computeDjScore(req.params.id);
    if (!scores) {
      return res.status(500).json({ success: false, error: 'Failed to calculate score' });
    }

    const updated = await prisma.djProfile.update({
      where: { id: req.params.id },
      data: {
        rankingScore: scores.rankingScore,
        digitalScore: scores.digitalScore,
        industryScore: scores.industryScore,
        communityScore: scores.communityScore,
      },
    });

    return res.json({ success: true, data: { scores, dj: updated } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
