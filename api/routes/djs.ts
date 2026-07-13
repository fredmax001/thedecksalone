const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, softAuthMiddleware, requireRole } = require('../middleware/auth');
const { requirePro } = require('../middleware/permissions');
const { uploadAvatar, uploadDjProfileImages, uploadDocument } = require('../utils/upload');
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
  search: z.string().max(200).optional(),
  sortBy: z.enum(['ranking', 'streams', 'followers', 'name', 'mixes', 'rating']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const createDjSchema = z.object({
  stageName: z.string().min(1).max(100),
  fullName: z.string().min(1).max(200),
  bio: z.string().max(2000).optional(),
  startYear: z.number().int().min(1980).max(2099).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  genres: z.array(z.string()).max(5).optional(),
  eventTypes: z.array(z.string()).optional(),
  awards: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  bookingFeeMin: z.number().min(0).optional(),
  bookingFeeMax: z.number().min(0).optional(),
  hourlyRate: z.number().min(0).optional(),
  fullDayRate: z.number().min(0).optional(),
  depositPercent: z.number().int().min(0).max(100).optional(),
  currency: z.string().max(10).optional(),
  availability: z.string().optional(),
  willTravel: z.boolean().optional(),
  maxTravelDistanceKm: z.number().int().min(0).optional(),
  services: z.array(z.object({
    name: z.string().min(1),
    price: z.number().min(0).optional(),
    description: z.string().optional(),
  })).optional(),
  isPro: z.boolean().optional(),
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

// updateDjSchema is the same shape as createDjSchema but every field is optional
const updateDjSchema = createDjSchema.partial();

// Helper to parse JSON fields from FormData (multer stores them as strings)
function parseFormFields(body) {
  const parsed = { ...body };

  // Parse JSON fields
  ['socialLinks', 'streamingLinks', 'services', 'genres', 'eventTypes', 'awards', 'equipment', 'languages'].forEach((key) => {
    if (typeof parsed[key] === 'string') {
      try {
        parsed[key] = JSON.parse(parsed[key]);
      } catch {
        // leave as-is if invalid JSON
      }
    }
  });

  // Normalize null values inside JSON objects to empty strings
  // (Prisma Json fields may contain nulls that Zod rejects)
  ['socialLinks', 'streamingLinks'].forEach((key) => {
    if (parsed[key] && typeof parsed[key] === 'object') {
      Object.keys(parsed[key]).forEach((subKey) => {
        if (parsed[key][subKey] === null) {
          parsed[key][subKey] = '';
        }
      });
    }
  });

  // Normalize empty optional scalar fields so .optional() accepts cleared values.
  ['website', 'whatsappNumber', 'country', 'city', 'availability'].forEach((key) => {
    if (parsed[key] === null || parsed[key] === '') {
      delete parsed[key];
    }
  });

  // Coerce number fields from FormData strings
  const numberFields = ['startYear', 'bookingFeeMin', 'bookingFeeMax', 'hourlyRate', 'fullDayRate', 'depositPercent', 'maxTravelDistanceKm'];
  numberFields.forEach((key) => {
    if (parsed[key] === '') {
      delete parsed[key];
    } else if (parsed[key] !== undefined) {
      const n = key === 'startYear' || key === 'depositPercent' || key === 'maxTravelDistanceKm'
        ? parseInt(parsed[key], 10)
        : parseFloat(parsed[key]);
      if (!isNaN(n)) parsed[key] = n;
    }
  });

  // Coerce boolean fields from FormData strings
  if (parsed.willTravel !== undefined) {
    parsed.willTravel = parsed.willTravel === true || parsed.willTravel === 'true';
  }
  if (parsed.isPro !== undefined) {
    parsed.isPro = parsed.isPro === true || parsed.isPro === 'true';
  }

  // Ensure array fields are arrays (multer may send single string for one item)
  ['genres', 'eventTypes', 'awards', 'equipment', 'languages'].forEach((key) => {
    if (parsed[key] !== undefined && !Array.isArray(parsed[key])) {
      parsed[key] = [parsed[key]].filter(Boolean);
    }
  });

  return parsed;
}

async function updateDjProfile(req, res, id) {
  const dj = await prisma.djProfile.findUnique({ where: { id } });
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

  if (req.files && req.files['avatar'] && req.files['avatar'][0]) {
    const file = req.files['avatar'][0];
    const { buffer, contentType } = await processAvatar(file.buffer);
    const avatarUrl = await uploadBuffer(buffer, 'avatars', { contentType });
    updateData.avatar = avatarUrl;
    if (dj.avatar) {
      await deleteFile(dj.avatar).catch(() => {});
    }
  }

  if (req.files && req.files['coverBanner'] && req.files['coverBanner'][0]) {
    const file = req.files['coverBanner'][0];
    const { buffer, contentType } = await processCover(file.buffer);
    const coverUrl = await uploadBuffer(buffer, 'covers', { contentType });
    updateData.coverBanner = coverUrl;
    if (dj.coverBanner) {
      await deleteFile(dj.coverBanner).catch(() => {});
    }
  }

  if (updateData.genres && updateData.genres.length > 5) {
    return res.status(400).json({ success: false, error: 'Maximum 5 genres allowed' });
  }

  const updated = await prisma.djProfile.update({
    where: { id },
    data: updateData,
  });

  return res.json({ success: true, data: updated });
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
          _count: { select: { mixes: true, reviews: true, events: true, followers: true } },
        },
      }),
      prisma.djProfile.count({ where }),
    ]);

    const computeTotalStreams = (platforms: any[]) =>
      platforms.reduce((sum, p) => sum + (p.streams || 0), 0);

    return res.json({
      success: true,
      data: djs.map((dj) => ({
        ...dj,
        username: dj.user.username,
        totalFollowers: dj._count.followers,
        totalMixes: dj._count.mixes,
        totalEvents: dj._count.events,
        totalStreams: computeTotalStreams(dj.streamingPlatforms),
      })),
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/hall-of-fame - DJs in the Hall of Fame
router.get('/hall-of-fame', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 6));

    let djs = await prisma.djProfile.findMany({
      where: { hallOfFame: true, isPublic: true },
      orderBy: { rankingScore: 'desc' },
      take: limitNum,
      include: {
        user: { select: { username: true } },
        streamingPlatforms: { select: { platform: true, followers: true, streams: true } },
        _count: { select: { mixes: true, reviews: true, events: true, followers: true } },
      },
    });

    // Fallback: if no Hall of Fame DJs, return top verified DJs
    if (djs.length === 0) {
      djs = await prisma.djProfile.findMany({
        where: { verified: true, isPublic: true },
        orderBy: { rankingScore: 'desc' },
        take: limitNum,
        include: {
          user: { select: { username: true } },
          streamingPlatforms: { select: { platform: true, followers: true, streams: true } },
          _count: { select: { mixes: true, reviews: true, events: true, followers: true } },
        },
      });
    }

    const computeTotalStreams = (platforms) =>
      platforms.reduce((sum, p) => sum + (p.streams || 0), 0);

    return res.json({
      success: true,
      data: djs.map((dj) => ({
        ...dj,
        username: dj.user.username,
        totalFollowers: dj._count.followers,
        totalMixes: dj._count.mixes,
        totalEvents: dj._count.events,
        totalStreams: computeTotalStreams(dj.streamingPlatforms),
      })),
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

// GET /api/djs/genres - Get all genres (uses UNNEST for efficiency)
router.get('/genres', async (req, res) => {
  try {
    // Using raw SQL UNNEST to flatten the genres array column efficiently
    // without loading all DJ profile rows into Node.js memory.
    const rows: Array<{ genre: string }> = await prisma.$queryRaw`
      SELECT DISTINCT UNNEST(genres) AS genre
      FROM dj_profiles
      WHERE "isPublic" = true
      ORDER BY genre
    `;
    return res.json({ success: true, data: rows.map((r) => r.genre) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/me - Get current user's DJ profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        user: { select: { id: true, username: true } },
        streamingPlatforms: true,
      },
    });

    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }

    return res.json({ success: true, data: { ...dj, username: dj.user.username, userId: dj.user.id } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/djs/verification-request - Submit passport/ID verification
router.post('/verification-request', authMiddleware, uploadDocument.single('document'), async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }

    const { nationality, idDocumentType, fullLegalName, socialProofLinks, whyVerified } = req.body;

    if (!nationality || !idDocumentType || !fullLegalName) {
      return res.status(400).json({ success: false, error: 'Nationality, ID document type, and full legal name are required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'ID document file is required' });
    }

    if (dj.verificationStatus === 'pending') {
      return res.status(409).json({ success: false, error: 'A verification request is already pending' });
    }

    const idDocumentUrl = await uploadBuffer(req.file.buffer, 'documents', {
      contentType: req.file.mimetype,
      ext: req.file.originalname.split('.').pop() || 'pdf',
    });

    const updated = await prisma.djProfile.update({
      where: { id: dj.id },
      data: {
        nationality,
        idDocumentType,
        idDocumentUrl,
        legalName: fullLegalName,
        socialProof: socialProofLinks || '',
        verificationReason: whyVerified || '',
        verificationStatus: 'pending',
        verificationNotes: `Submitted on ${new Date().toISOString()}`,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/:identifier - Get single DJ by id or username
router.get('/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;

    const commonInclude = {
      user: { select: { id: true, username: true } },
      mixes: { where: { isPublic: true }, orderBy: { createdAt: 'desc' } },
      streamingPlatforms: true,
      reviews: {
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      photos: { where: { isPublic: true }, orderBy: { sortOrder: 'asc' } },
      events: { where: { status: 'upcoming' }, orderBy: { date: 'asc' } },
      _count: { select: { mixes: true, reviews: true, bookingsAsDj: true, followers: true, events: true } },
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

    const computeTotalStreams = (platforms) =>
      platforms.reduce((sum, p) => sum + (p.streams || 0), 0);

    return res.json({
      success: true,
      data: {
        ...dj,
        username: dj.user.username,
        userId: dj.user.id,
        totalFollowers: dj._count.followers,
        totalMixes: dj._count.mixes,
        totalEvents: dj._count.events,
        totalStreams: computeTotalStreams(dj.streamingPlatforms),
        monthlyListeners: dj.monthlyListeners,
        sets: [],
        highlights: [],
        reups: [],
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/djs - Create DJ profile (auth required)
router.post('/', authMiddleware, uploadDjProfileImages, async (req, res) => {
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
    let coverUrl = null;

    if (req.files && req.files['avatar'] && req.files['avatar'][0]) {
      const file = req.files['avatar'][0];
      const { buffer, contentType } = await processAvatar(file.buffer);
      avatarUrl = await uploadBuffer(buffer, 'avatars', { contentType });
    }

    if (req.files && req.files['coverBanner'] && req.files['coverBanner'][0]) {
      const file = req.files['coverBanner'][0];
      const { buffer, contentType } = await processCover(file.buffer);
      coverUrl = await uploadBuffer(buffer, 'covers', { contentType });
    }

    const dj = await prisma.djProfile.create({
      data: {
        ...data,
        userId: req.user.id,
        avatar: avatarUrl,
        coverBanner: coverUrl,
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
router.put('/me', authMiddleware, uploadDjProfileImages, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }
    return updateDjProfile(req, res, dj.id);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', authMiddleware, uploadDjProfileImages, async (req, res) => {
  try {
    return updateDjProfile(req, res, req.params.id);
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

// POST /api/djs/:id/follow - Follow a DJ
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { id: req.params.id } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ not found' });
    }

    // Prevent DJs from following themselves
    if (dj.userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot follow yourself' });
    }

    await prisma.follow.upsert({
      where: { userId_djId: { userId: req.user.id, djId: req.params.id } },
      create: { userId: req.user.id, djId: req.params.id },
      update: {},
    });

    return res.json({ success: true, data: { following: true } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/djs/:id/follow - Unfollow a DJ
router.delete('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const existing = await prisma.follow.findUnique({
      where: { userId_djId: { userId: req.user.id, djId: req.params.id } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Not following this DJ' });
    }

    await prisma.follow.delete({
      where: { userId_djId: { userId: req.user.id, djId: req.params.id } },
    });

    return res.json({ success: true, data: { following: false } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/:id/follow-status - Check if current user follows this DJ (public, returns false if not logged in)
router.get('/:id/follow-status', softAuthMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ success: true, data: { following: false } });
    }

    const follow = await prisma.follow.findUnique({
      where: { userId_djId: { userId: req.user.id, djId: req.params.id } },
    });

    return res.json({ success: true, data: { following: !!follow } });
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

// ═══════════════════════════════════════════════════════════════════════════════
// HIGHLIGHTS (Pro+ only, max 4 per DJ)
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_HIGHLIGHTS = 4;
const highlightSchema = z.object({
  mixId: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
});

// GET /api/djs/me/highlights - Current DJ's highlights
router.get('/me/highlights', authMiddleware, requirePro, async (req, res) => {
  try {
    const djId = req.djProfile.id;
    const highlights = await prisma.djHighlight.findMany({
      where: { djId },
      orderBy: { sortOrder: 'asc' },
      include: {
        mix: {
          include: {
            dj: { select: { id: true, stageName: true, avatar: true, city: true } },
          },
        },
      },
    });
    return res.json({ success: true, data: highlights });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/:id/highlights - Public highlights for a DJ
router.get('/:id/highlights', async (req, res) => {
  try {
    const highlights = await prisma.djHighlight.findMany({
      where: { djId: req.params.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        mix: {
          include: {
            dj: { select: { id: true, stageName: true, avatar: true, city: true } },
          },
        },
      },
    });
    return res.json({ success: true, data: highlights });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/djs/me/highlights - Add a mix to highlights
router.post('/me/highlights', authMiddleware, requirePro, async (req, res) => {
  try {
    const parsed = highlightSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const djId = req.djProfile.id;
    const { mixId, sortOrder = 0 } = parsed.data;

    const mix = await prisma.mix.findUnique({ where: { id: mixId } });
    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    if (!mix.isPublic) {
      return res.status(400).json({ success: false, error: 'Cannot highlight a private mix' });
    }

    // DJs can only highlight their own mixes or mixes they have re-upped
    const canHighlight = mix.djId === djId || !!(await prisma.mixReup.findUnique({
      where: { djId_mixId: { djId, mixId } },
    }));

    if (!canHighlight) {
      return res.status(403).json({ success: false, error: 'You can only highlight your own mixes or mixes you have re-upped' });
    }

    const currentCount = await prisma.djHighlight.count({ where: { djId } });
    if (currentCount >= MAX_HIGHLIGHTS) {
      return res.status(403).json({ success: false, error: `You can only highlight up to ${MAX_HIGHLIGHTS} mixes` });
    }

    const highlight = await prisma.djHighlight.create({
      data: { djId, mixId, sortOrder },
      include: {
        mix: {
          include: {
            dj: { select: { id: true, stageName: true, avatar: true, city: true } },
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: highlight });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/djs/me/highlights/reorder - Reorder highlights
router.put('/me/highlights/reorder', authMiddleware, requirePro, async (req, res) => {
  try {
    const djId = req.djProfile.id;
    const items = req.body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    await prisma.$transaction(
      items.map((item: any) =>
        prisma.djHighlight.updateMany({
          where: { djId, mixId: item.mixId },
          data: { sortOrder: Number(item.sortOrder) || 0 },
        })
      )
    );

    const highlights = await prisma.djHighlight.findMany({
      where: { djId },
      orderBy: { sortOrder: 'asc' },
      include: {
        mix: {
          include: {
            dj: { select: { id: true, stageName: true, avatar: true, city: true } },
          },
        },
      },
    });

    return res.json({ success: true, data: highlights });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/djs/me/highlights/:mixId - Remove a highlight
router.delete('/me/highlights/:mixId', authMiddleware, requirePro, async (req, res) => {
  try {
    const djId = req.djProfile.id;
    const mixId = req.params.mixId;

    const existing = await prisma.djHighlight.findUnique({
      where: { djId_mixId: { djId, mixId } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Highlight not found' });
    }

    await prisma.djHighlight.delete({
      where: { djId_mixId: { djId, mixId } },
    });

    return res.json({ success: true, data: { highlighted: false } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SETS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/djs/me/sets - Current DJ's sets (with item counts)
router.get('/me/sets', authMiddleware, requirePro, async (req, res) => {
  try {
    const djId = req.djProfile.id;
    const sets = await prisma.djSet.findMany({
      where: { djId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { items: true } },
      },
    });
    return res.json({
      success: true,
      data: sets.map((set: any) => ({ ...set, mixCount: set._count.items })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/:id/sets - Public sets for a DJ
router.get('/:id/sets', async (req, res) => {
  try {
    const sets = await prisma.djSet.findMany({
      where: { djId: req.params.id, isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { items: true } },
      },
    });
    return res.json({
      success: true,
      data: sets.map((set: any) => ({ ...set, mixCount: set._count.items })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/:id/reups - Public re-ups for a DJ
router.get('/:id/reups', async (req, res) => {
  try {
    const reups = await prisma.mixReup.findMany({
      where: { djId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        mix: {
          include: {
            dj: { select: { id: true, stageName: true, avatar: true, city: true } },
          },
        },
      },
    });
    return res.json({ success: true, data: reups });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
