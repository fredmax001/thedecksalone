const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, softAuthMiddleware, requireRole } = require('../middleware/auth');
const { requirePro } = require('../middleware/permissions');
const { uploadAvatar, uploadCover, uploadDjProfileImages, uploadDocument } = require('../utils/upload');
const { processAvatar, processCover } = require('../utils/imageProcessor');
const { uploadBuffer, deleteFile } = require('../utils/storage');
const { computeDjScore, recalculateAllRankings } = require('../utils/ranking');
const { conditionalSearchLimiter } = require('../utils/rateLimiter');
const { createNotification } = require('../utils/notifications');
const { CITY_TO_COMMUNITIES } = require('../utils/sierraLeoneLocations');
const { parsePagination } = require('../utils/pagination');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

const djFilterSchema = z.object({
  city: z.string().optional(),
  community: z.string().optional(),
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
  community: z.string().max(100).nullable().optional(),
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
  website: z.string().max(500).optional().nullable().or(z.literal('')),
  whatsappNumber: z.string().max(30).optional().nullable(),
  isPublic: z.boolean().optional(),
  socialLinks: z.object({
    instagram: z.string().max(500).optional().nullable().or(z.literal('')),
    twitter: z.string().max(500).optional().nullable().or(z.literal('')),
    tiktok: z.string().max(500).optional().nullable().or(z.literal('')),
    youtube: z.string().max(500).optional().nullable().or(z.literal('')),
    facebook: z.string().max(500).optional().nullable().or(z.literal('')),
  }).optional().nullable(),
  streamingLinks: z.object({
    audiomack: z.string().max(500).optional().nullable().or(z.literal('')),
    mixcloud: z.string().max(500).optional().nullable().or(z.literal('')),
    soundcloud: z.string().max(500).optional().nullable().or(z.literal('')),
    youtube: z.string().max(500).optional().nullable().or(z.literal('')),
    hearthis: z.string().max(500).optional().nullable().or(z.literal('')),
    appleMusic: z.string().max(500).optional().nullable().or(z.literal('')),
    spotify: z.string().max(500).optional().nullable().or(z.literal('')),
  }).optional().nullable(),
});

// updateDjSchema is the same shape as createDjSchema but every field is optional
const updateDjSchema = createDjSchema.partial();

const verificationRequestSchema = z.object({
  nationality: z.string().max(100).optional(),
  idDocumentType: z.string().max(100).optional(),
  fullLegalName: z.string().max(200).optional(),
  socialProofLinks: z.string().max(2000).optional(),
  whyVerified: z.string().max(2000).optional(),
});

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
  if (parsed.community === '') {
    parsed.community = null;
  }

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
    return fail(res, 404, 'DJ not found');
  }
  if (dj.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return fail(res, 403, 'Forbidden');
  }

  const parsed = updateDjSchema.safeParse(parseFormFields(req.body));
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const updateData = { ...parsed.data };

  if (updateData.city === undefined && updateData.community !== undefined) {
    return fail(res, 400, 'City is required when setting a community');
  }

  const nextCity = updateData.city ?? dj.city;
  const nextCommunity = updateData.community;
  if (nextCommunity !== undefined && nextCommunity !== null) {
    const validCommunities = CITY_TO_COMMUNITIES[nextCity] || [];
    if (validCommunities.length && !validCommunities.includes(nextCommunity)) {
      return fail(res, 400, 'Selected community does not belong to the selected city');
    }
  }

  if (updateData.city && updateData.community === undefined && dj.community) {
    const validCommunities = CITY_TO_COMMUNITIES[updateData.city] || [];
    if (!validCommunities.includes(dj.community)) {
      updateData.community = null;
    }
  }

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
    return fail(res, 400, 'Maximum 5 genres allowed');
  }

  if (updateData.avatar) {
    await prisma.user.update({
      where: { id: dj.userId },
      data: { avatar: updateData.avatar },
    }).catch(() => {});
  }

  const updated = await prisma.djProfile.update({
    where: { id },
    data: updateData,
  });

  return ok(res, updated);
}

// PUT /api/djs/cover - Upload DJ cover banner directly
router.put('/cover', authMiddleware, uploadCover.single('coverBanner'), async (req, res) => {
  try {
    const userId = req.user.id;
    const dj = await prisma.djProfile.findUnique({
      where: { userId },
      select: { id: true, coverBanner: true },
    });

    if (!dj) {
      return fail(res, 404, 'DJ profile not found');
    }

    if (!req.file) {
      return fail(res, 400, 'No cover banner image provided');
    }

    const { buffer, contentType, ext } = await processCover(req.file.buffer);
    const coverUrl = await uploadBuffer(buffer, 'covers', { contentType, ext });

    if (dj.coverBanner) {
      await deleteFile(dj.coverBanner).catch(() => {});
    }

    const updated = await prisma.djProfile.update({
      where: { id: dj.id },
      data: { coverBanner: coverUrl },
    });

    return ok(res, { coverBanner: coverUrl, dj: updated });
  } catch (err: any) {
    console.error('Error uploading cover:', err);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/djs - List DJs with filtering
router.get('/', conditionalSearchLimiter, asyncHandler(async (req, res) => {
  const parsed = djFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid filter parameters');
  }

  const { city, community, genre, verified, minFee, maxFee, search, sortBy, order, page, limit } = parsed.data;

  const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

  const where: any = { isPublic: true };

  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (community) where.community = { contains: community, mode: 'insensitive' };
  if (genre) where.genres = { has: genre };
  if (verified === 'true') where.verified = true;
  if (minFee) where.bookingFeeMin = { gte: parseFloat(minFee) };
  if (maxFee) where.bookingFeeMax = { lte: parseFloat(maxFee) };
  if (search) {
    where.OR = [
      { stageName: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { community: { contains: search, mode: 'insensitive' } },
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
        mixes: { select: { plays: true } },
        streamingPlatforms: { select: { platform: true, followers: true, streams: true } },
        _count: { select: { mixes: true, reviews: true, events: true, followers: true } },
      },
    }),
    prisma.djProfile.count({ where }),
  ]);

  const computeTotalStreams = (dj: any) => {
    const externalStreams = (dj.streamingPlatforms || []).reduce((sum: number, p: any) => sum + (p.streams || 0), 0);
    const mixPlays = (dj.mixes || []).reduce((sum: number, m: any) => sum + (m.plays || 0), 0);
    return Math.max(dj.totalStreams || 0, mixPlays + externalStreams);
  };

  return res.json({
    success: true,
    data: djs.map((dj) => ({
      ...dj,
      username: dj.user.username,
      totalFollowers: dj._count.followers,
      totalMixes: dj._count.mixes,
      totalEvents: dj._count.events,
      totalStreams: computeTotalStreams(dj),
    })),
    meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
}));

// GET /api/djs/hall-of-fame - DJs in the Hall of Fame
router.get('/hall-of-fame', asyncHandler(async (req, res) => {
  const { limit: limitNum } = parsePagination({ limit: req.query.limit }, { defaultLimit: 6, maxLimit: 20 });

  let djs = await prisma.djProfile.findMany({
    where: { hallOfFame: true, isPublic: true },
    orderBy: { rankingScore: 'desc' },
    take: limitNum,
    include: {
      user: { select: { username: true } },
      mixes: { select: { plays: true } },
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
        mixes: { select: { plays: true } },
        streamingPlatforms: { select: { platform: true, followers: true, streams: true } },
        _count: { select: { mixes: true, reviews: true, events: true, followers: true } },
      },
    });
  }

  const computeTotalStreams = (dj: any) => {
    const externalStreams = (dj.streamingPlatforms || []).reduce((sum: number, p: any) => sum + (p.streams || 0), 0);
    const mixPlays = (dj.mixes || []).reduce((sum: number, m: any) => sum + (m.plays || 0), 0);
    return Math.max(dj.totalStreams || 0, mixPlays + externalStreams);
  };

  return ok(res, djs.map((dj) => ({
      ...dj,
      username: dj.user.username,
      totalFollowers: dj._count.followers,
      totalMixes: dj._count.mixes,
      totalEvents: dj._count.events,
      totalStreams: computeTotalStreams(dj),
    })));
}));

// GET /api/djs/cities - Get all cities
router.get('/cities', asyncHandler(async (req, res) => {
  const cities = await prisma.djProfile.findMany({
    where: { isPublic: true },
    select: { city: true },
    distinct: ['city'],
  });
  return ok(res, cities.map((c) => c.city).filter(Boolean));
}));

// GET /api/djs/genres - Get all genres (uses UNNEST for efficiency)
router.get('/genres', asyncHandler(async (req, res) => {
  // Using raw SQL UNNEST to flatten the genres array column efficiently
  // without loading all DJ profile rows into Node.js memory.
  const rows: Array<{ genre: string }> = await prisma.$queryRaw`
    SELECT DISTINCT UNNEST(genres) AS genre
    FROM dj_profiles
    WHERE "isPublic" = true
    ORDER BY genre
  `;
  return ok(res, rows.map((r) => r.genre));
}));

// GET /api/djs/me - Get current user's DJ profile
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const dj = await prisma.djProfile.findUnique({
    where: { userId: req.user.id },
    include: {
      user: { select: { id: true, username: true } },
      streamingPlatforms: true,
    },
  });

  if (!dj) {
    return fail(res, 404, 'DJ profile not found');
  }

  return ok(res, { ...dj, username: dj.user.username, userId: dj.user.id });
}));

// POST /api/djs/verification-request - Submit passport/ID verification
router.post('/verification-request', authMiddleware, uploadDocument.single('document'), asyncHandler(async (req, res) => {
  const parsed = verificationRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input');
  }

  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj) {
    return fail(res, 404, 'DJ profile not found');
  }
  if (dj.subscriptionTier === 'free') {
    return fail(res, 403, 'Verification requests require a Pro subscription');
  }

  const { nationality, idDocumentType, fullLegalName, socialProofLinks, whyVerified } = parsed.data;

  if (!nationality || !idDocumentType || !fullLegalName) {
    return fail(res, 400, 'Nationality, ID document type, and full legal name are required');
  }

  if (!req.file) {
    return fail(res, 400, 'ID document file is required');
  }

  if (dj.verificationStatus === 'pending') {
    return fail(res, 409, 'A verification request is already pending');
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

  return ok(res, updated);
}));

// GET /api/djs/:identifier - Get single DJ by id or username
router.get('/:identifier', asyncHandler(async (req, res) => {
  const identifier = req.params.identifier;

  const commonInclude = {
    user: { select: { id: true, username: true } },
    mixes: {
      where: { isPublic: true },
      // Newest by original release date when known (Hearthis imports carry
      // their upload date); fall back to import date for older mixes.
      orderBy: [{ releaseDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    },
    streamingPlatforms: true,
    reviews: {
      include: { user: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    },
    photos: { where: { isPublic: true }, orderBy: { sortOrder: 'asc' } },
    events: { where: { status: 'upcoming' }, orderBy: { date: 'asc' } },
    highlights: {
      orderBy: { sortOrder: 'asc' },
      take: 4,
      include: {
        mix: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            audioUrl: true,
            duration: true,
            genre: true,
            plays: true,
            likes: true,
          },
        },
      },
    },
    reups: {
      orderBy: { createdAt: 'desc' },
      include: {
        mix: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            audioUrl: true,
            duration: true,
            genre: true,
            plays: true,
            likes: true,
            dj: { select: { id: true, stageName: true, avatar: true, city: true } },
          },
        },
      },
    },
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
    dj = await prisma.djProfile.findFirst({
      where: { userId: identifier },
      include: commonInclude,
    });
  }

  if (!dj) {
    const decoded = decodeURIComponent(identifier);
    dj = await prisma.djProfile.findFirst({
      where: {
        OR: [
          { stageName: { equals: identifier, mode: 'insensitive' } },
          { stageName: { equals: identifier.replace(/-/g, ' '), mode: 'insensitive' } },
          { stageName: { equals: decoded, mode: 'insensitive' } },
          { stageName: { equals: decoded.replace(/-/g, ' '), mode: 'insensitive' } },
        ],
      },
      include: commonInclude,
    });
  }

  if (!dj) {
    return fail(res, 404, 'DJ not found');
  }

  const computeTotalStreams = (dj: any) => {
    const externalStreams = (dj.streamingPlatforms || []).reduce((sum: number, p: any) => sum + (p.streams || 0), 0);
    const mixPlays = (dj.mixes || []).reduce((sum: number, m: any) => sum + (m.plays || 0), 0);
    return Math.max(dj.totalStreams || 0, mixPlays + externalStreams);
  };

  return ok(res, {
      ...dj,
      username: dj.user.username,
      userId: dj.user.id,
      totalFollowers: dj._count.followers,
      totalMixes: dj._count.mixes,
      totalEvents: dj._count.events,
      totalStreams: computeTotalStreams(dj),
      monthlyListeners: dj.monthlyListeners,
      sets: [],
      highlights: dj.highlights || [],
      reups: (dj.reups || []).map((r: any) => ({
        id: r.id,
        mixId: r.mix.id,
        createdAt: r.createdAt,
        mix: {
          id: r.mix.id,
          title: r.mix.title,
          coverImage: r.mix.coverImage || '/mix-placeholder.jpg',
          duration: r.mix.duration,
          genre: r.mix.genre,
          plays: r.mix.plays,
          likes: r.mix.likes,
          audioUrl: r.mix.audioUrl,
          dj: r.mix.dj,
        },
      })),
    });
}));

// POST /api/djs - Create DJ profile (auth required)
router.post('/', authMiddleware, uploadDjProfileImages, asyncHandler(async (req, res) => {
  const existing = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (existing) {
    return fail(res, 409, 'DJ profile already exists');
  }

  const parsed = createDjSchema.safeParse(parseFormFields(req.body));
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const data = parsed.data;

  if (data.community) {
    if (!data.city) {
      return fail(res, 400, 'City is required when setting a community');
    }
    const validCommunities = CITY_TO_COMMUNITIES[data.city] || [];
    if (validCommunities.length && !validCommunities.includes(data.community)) {
      return fail(res, 400, 'Selected community does not belong to the selected city');
    }
  }

  // Enforce genre limit
  if (data.genres && data.genres.length > 5) {
    return fail(res, 400, 'Maximum 5 genres allowed');
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
      isPublic: true,
    },
  });

  await prisma.user.update({
    where: { id: req.user.id },
    data: { role: 'DJ' },
  });

  return res.status(201).json({ success: true, data: dj });
}));

// POST /api/djs/switch-to-dj - Allow a fan/user to upgrade their own account to DJ
router.post('/switch-to-dj', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'USER') {
      return fail(res, 403, 'Only fan accounts can switch to a DJ account');
    }

    const existing = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (existing) {
      return fail(res, 409, 'DJ profile already exists');
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return fail(res, 404, 'User not found');
    }

    const stageName = user.username || user.email.split('@')[0];
    const fullName = user.name || user.username || user.email.split('@')[0];

    const dj = await prisma.djProfile.create({
      data: {
        userId: req.user.id,
        stageName,
        fullName,
        isPublic: true,
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { role: 'DJ' },
      include: { djProfile: true },
    });

    return ok(res, { user: updatedUser, dj });
  } catch (error) {
    console.error('Switch to DJ error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// PUT /api/djs/:id - Update DJ profile
router.put('/me', authMiddleware, uploadDjProfileImages, asyncHandler(async (req, res) => {
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj) {
    return fail(res, 404, 'DJ profile not found');
  }
  return updateDjProfile(req, res, dj.id);
}));

router.put('/:id', authMiddleware, uploadDjProfileImages, asyncHandler(async (req, res) => {
  return updateDjProfile(req, res, req.params.id);
}));

// DELETE /api/djs/:id - Delete DJ profile
router.delete('/:id', authMiddleware, requireRole('ADMIN', 'DJ'), asyncHandler(async (req, res) => {
  const dj = await prisma.djProfile.findUnique({ where: { id: req.params.id } });
  if (!dj) {
    return fail(res, 404, 'DJ not found');
  }
  if (dj.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return fail(res, 403, 'Forbidden');
  }

  await prisma.djProfile.delete({ where: { id: req.params.id } });
  return ok(res, { message: 'DJ profile deleted' });
}));

// POST /api/djs/:id/follow - Follow a DJ
router.post('/:id/follow', authMiddleware, asyncHandler(async (req, res) => {
  const dj = await prisma.djProfile.findUnique({ where: { id: req.params.id } });
  if (!dj) {
    return fail(res, 404, 'DJ not found');
  }

  // Prevent DJs from following themselves
  if (dj.userId === req.user.id) {
    return fail(res, 400, 'You cannot follow yourself');
  }

  const existing = await prisma.follow.findUnique({
    where: { userId_djId: { userId: req.user.id, djId: req.params.id } },
  });

  await prisma.follow.upsert({
    where: { userId_djId: { userId: req.user.id, djId: req.params.id } },
    create: { userId: req.user.id, djId: req.params.id },
    update: {},
  });

  // Only notify on a new follow, not a duplicate upsert
  if (!existing && dj.userId !== req.user.id) {
    const follower = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true, username: true },
    });
    const followerName = follower?.name || follower?.username || 'Someone';
    createNotification({
      userId: dj.userId,
      type: 'NEW_FOLLOWER',
      title: 'New follower',
      body: `${followerName} started following you`,
      actionUrl: `/dj/${dj.username || dj.id}`,
      entityId: dj.id,
      entityType: 'DJ',
      metadata: { followerId: req.user.id },
      sendEmail: true,
      emailSubject: 'New follower on Deck Salone',
      emailBody: `${followerName} started following you. View your profile: https://decksalone.com/dj/${dj.username || dj.id}`,
    }).catch(() => {});
  }

  return ok(res, { following: true });
}));

// DELETE /api/djs/:id/follow - Unfollow a DJ
router.delete('/:id/follow', authMiddleware, asyncHandler(async (req, res) => {
  const existing = await prisma.follow.findUnique({
    where: { userId_djId: { userId: req.user.id, djId: req.params.id } },
  });
  if (!existing) {
    return fail(res, 404, 'Not following this DJ');
  }

  await prisma.follow.delete({
    where: { userId_djId: { userId: req.user.id, djId: req.params.id } },
  });

  return ok(res, { following: false });
}));

// GET /api/djs/:id/follow-status - Check if current user follows this DJ (public, returns false if not logged in)
router.get('/:id/follow-status', softAuthMiddleware, asyncHandler(async (req, res) => {
  if (!req.user) {
    return ok(res, { following: false });
  }

  const follow = await prisma.follow.findUnique({
    where: { userId_djId: { userId: req.user.id, djId: req.params.id } },
  });

  return ok(res, { following: !!follow });
}));

// GET /api/djs/me/followers - List users who follow the current DJ
router.get('/me/followers', authMiddleware, asyncHandler(async (req, res) => {
  const dj = await prisma.djProfile.findUnique({
    where: { userId: req.user.id },
    select: { id: true },
  });

  if (!dj) {
    return fail(res, 404, 'DJ profile not found');
  }

  const { page, limit } = req.query;
  const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

  const [followers, total] = await Promise.all([
    prisma.follow.findMany({
      where: { djId: dj.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            avatar: true,
            location: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.follow.count({ where: { djId: dj.id } }),
  ]);

  const data = followers.map((f) => ({
    id: f.user.id,
    name: f.user.name || f.user.username || f.user.email.split('@')[0],
    username: f.user.username,
    email: f.user.email,
    avatar: f.user.avatar,
    location: f.user.location,
    followedAt: f.createdAt,
  }));

  return res.json({
    success: true,
    data,
    meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
}));


// POST /api/djs/:id/recalculate - Recalculate ranking for a DJ (admin or self)
router.post('/:id/recalculate', authMiddleware, asyncHandler(async (req, res) => {
  const dj = await prisma.djProfile.findUnique({ where: { id: req.params.id } });
  if (!dj) {
    return fail(res, 404, 'DJ not found');
  }
  if (dj.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return fail(res, 403, 'Forbidden');
  }

  const scores = await computeDjScore(req.params.id);
  if (!scores) {
    return fail(res, 500, 'Failed to calculate score');
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

  return ok(res, { scores, dj: updated });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// HIGHLIGHTS (Pro+ only, max 4 per DJ)
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_HIGHLIGHTS = 4;
const highlightSchema = z.object({
  mixId: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
});

// GET /api/djs/me/highlights - Current DJ's highlights
router.get('/me/highlights', authMiddleware, asyncHandler(async (req, res) => {
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj) {
    return fail(res, 403, 'DJ profile required');
  }
  const djId = dj.id;
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
  return ok(res, highlights);
}));

// GET /api/djs/:id/highlights - Public highlights for a DJ
router.get('/:id/highlights', asyncHandler(async (req, res) => {
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
  return ok(res, highlights);
}));

// POST /api/djs/me/highlights - Add a mix to highlights
router.post('/me/highlights', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = highlightSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj) {
    return fail(res, 403, 'DJ profile required');
  }
  const djId = dj.id;
  const { mixId, sortOrder = 0 } = parsed.data;

  const mix = await prisma.mix.findUnique({ where: { id: mixId } });
  if (!mix) {
    return fail(res, 404, 'Mix not found');
  }

  if (!mix.isPublic) {
    return fail(res, 400, 'Cannot highlight a private mix');
  }

  // DJs can only highlight their own mixes or mixes they have re-upped
  const canHighlight = mix.djId === djId || !!(await prisma.mixReup.findUnique({
    where: { djId_mixId: { djId, mixId } },
  }));

  if (!canHighlight) {
    return fail(res, 403, 'You can only highlight your own mixes or mixes you have re-upped');
  }

  const currentCount = await prisma.djHighlight.count({ where: { djId } });
  if (currentCount >= MAX_HIGHLIGHTS) {
    return fail(res, 403, `You can only highlight up to ${MAX_HIGHLIGHTS} mixes`);
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
}));

// PUT /api/djs/me/highlights/reorder - Reorder highlights
router.put('/me/highlights/reorder', authMiddleware, asyncHandler(async (req, res) => {
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj) {
    return fail(res, 403, 'DJ profile required');
  }
  const djId = dj.id;
  const items = req.body.items;

  if (!Array.isArray(items) || items.length === 0) {
    return fail(res, 400, 'items array is required');
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

  return ok(res, highlights);
}));

// DELETE /api/djs/me/highlights/:mixId - Remove a highlight
router.delete('/me/highlights/:mixId', authMiddleware, asyncHandler(async (req, res) => {
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj) {
    return fail(res, 403, 'DJ profile required');
  }
  const djId = dj.id;
  const mixId = req.params.mixId;

  const existing = await prisma.djHighlight.findUnique({
    where: { djId_mixId: { djId, mixId } },
  });

  if (!existing) {
    return fail(res, 404, 'Highlight not found');
  }

  await prisma.djHighlight.delete({
    where: { djId_mixId: { djId, mixId } },
  });

  return ok(res, { highlighted: false });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// SETS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/djs/me/sets - Current DJ's sets (with item counts)
router.get('/me/sets', authMiddleware, requirePro, asyncHandler(async (req, res) => {
  const djId = req.djProfile.id;
  const sets = await prisma.djSet.findMany({
    where: { djId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { items: true } },
    },
  });
  return ok(res, sets.map((set: any) => ({ ...set, mixCount: set._count.items })));
}));

// GET /api/djs/:id/sets - Public sets for a DJ
router.get('/:id/sets', asyncHandler(async (req, res) => {
  const sets = await prisma.djSet.findMany({
    where: { djId: req.params.id, isPublic: true },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { items: true } },
    },
  });
  return ok(res, sets.map((set: any) => ({ ...set, mixCount: set._count.items })));
}));

// GET /api/djs/:id/reups - Public re-ups for a DJ
router.get('/:id/reups', asyncHandler(async (req, res) => {
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
  return ok(res, reups);
}));

// POST /api/djs/:id/support - Fan sends a one-time support payment of any amount to a DJ
router.post('/:id/support', authMiddleware, uploadDocument.single('proof'), async (req, res) => {
  try {
    const djId = req.params.id;
    const userId = req.user.id;
    const { amount, paymentReference, message } = req.body || {};
    const parsedAmount = parseFloat(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return fail(res, 400, 'Please enter a valid support amount');
    }

    const dj = await prisma.djProfile.findUnique({
      where: { id: djId },
      select: { id: true, stageName: true, userId: true },
    });

    if (!dj) {
      return fail(res, 404, 'DJ not found');
    }

    if (dj.userId === userId) {
      return fail(res, 400, 'You cannot support yourself');
    }

    let proofUrl = req.body.paymentProofUrl || '';
    if (req.file) {
      const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
      proofUrl = await uploadBuffer(req.file.buffer, 'support-proofs', {
        ext,
        contentType: req.file.mimetype,
      });
    }

    const support = await prisma.djSupport.create({
      data: {
        djId,
        userId,
        amount: parsedAmount,
        currency: 'SLE',
        paymentReference: paymentReference || null,
        paymentProofUrl: proofUrl || null,
        status: 'PENDING',
        message: message || null,
      },
    });

    return ok(res, support, `Support request sent to ${dj.stageName}. Thank you!`);
  } catch (error) {
    console.error('[DJ Support API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/djs/me/promotion-points - DJ checks their promotion points
router.get('/me/promotion-points', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, subscriptionTier: true, promotionPoints: true },
    });

    if (!dj) {
      return fail(res, 403, 'DJ profile required');
    }

    return ok(res, {
        promotionPoints: dj.promotionPoints || 0,
        subscriptionTier: dj.subscriptionTier,
        isEligible: dj.subscriptionTier === 'pro' || dj.subscriptionTier === 'legend',
      });
  } catch (error) {
    console.error('[DJ Points API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/djs/my/referral - DJ referral tracking and stats
router.get('/my/referral', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        referralCode: true,
        referredBy: true,
        createdAt: true,
      },
    });

    if (!user) {
      return fail(res, 404, 'User not found');
    }

    const [referrals, referrer] = await Promise.all([
      prisma.user.count({ where: { referredBy: user.referralCode } }),
      user.referredBy
        ? prisma.user.findUnique({
            where: { referralCode: user.referredBy },
            select: { id: true, username: true, djProfile: { select: { stageName: true } } },
          })
        : null,
    ]);

    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'https://decksalone.com';
    const referralLink = user.referralCode ? `${frontendUrl}/signup?ref=${user.referralCode}` : null;

    return ok(res, {
        referralCode: user.referralCode,
        referralLink,
        totalReferrals: referrals,
        referredBy: referrer
          ? {
              id: referrer.id,
              username: referrer.username,
              stageName: referrer.djProfile?.stageName,
            }
          : null,
      });
  } catch (error) {
    console.error('[DJ Referral API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/djs/me/availability - DJ reads their availability and blocked dates
router.get('/me/availability', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        stageName: true,
        blockedDates: true,
        availabilitySchedule: true,
        availability: true,
      },
    });

    if (!dj) {
      return fail(res, 403, 'DJ profile required');
    }

    return ok(res, {
        blockedDates: dj.blockedDates || [],
        availabilitySchedule: dj.availabilitySchedule || {
          enabledDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          enabledSlots: ['MORNING', 'AFTERNOON', 'EVENING_NIGHT'],
        },
        availability: dj.availability || 'AVAILABLE',
      });
  } catch (error) {
    console.error('[DJ Availability API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// PUT /api/djs/me/availability - DJ updates their availability and blocked dates
router.put('/me/availability', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return fail(res, 403, 'DJ profile required');
    }

    const { blockedDates, availabilitySchedule, availability } = req.body;
    const updateData: any = {};

    if (Array.isArray(blockedDates)) {
      updateData.blockedDates = blockedDates.filter((d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
    }

    if (availabilitySchedule !== undefined) {
      updateData.availabilitySchedule = availabilitySchedule;
    }

    if (typeof availability === 'string') {
      updateData.availability = availability;
    }

    const updated = await prisma.djProfile.update({
      where: { id: dj.id },
      data: updateData,
      select: {
        id: true,
        blockedDates: true,
        availabilitySchedule: true,
        availability: true,
      },
    });

    return ok(res, updated);
  } catch (error) {
    console.error('[DJ Availability Update API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/djs/me/payout-method - Get DJ's configured payout method
router.get('/me/payout-method', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, payoutMethod: true },
    });

    if (!dj) {
      return fail(res, 403, 'DJ profile required');
    }

    return ok(res, dj.payoutMethod || null);
  } catch (error) {
    console.error('[DJ Payout Method GET API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// PUT /api/djs/me/payout-method - Save DJ's payout method (Orange Money, Afrimoney, Bank)
router.put('/me/payout-method', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return fail(res, 403, 'DJ profile required');
    }

    const { type, accountName, accountNumber, bankName, phone } = req.body;

    if (!type || !['ORANGE_MONEY', 'AFRIMONEY', 'BANK_TRANSFER'].includes(type)) {
      return fail(res, 400, 'Invalid payout method type');
    }

    if (!accountName || accountName.trim() === '') {
      return fail(res, 400, 'Account / Beneficiary name is required');
    }

    const payoutMethodData = {
      type,
      accountName: accountName.trim(),
      accountNumber: (accountNumber || phone || '').trim(),
      bankName: type === 'BANK_TRANSFER' ? (bankName || '').trim() : null,
      updatedAt: new Date().toISOString(),
    };

    const updated = await prisma.djProfile.update({
      where: { id: dj.id },
      data: { payoutMethod: payoutMethodData },
      select: { id: true, payoutMethod: true },
    });

    return ok(res, updated.payoutMethod, 'Payout method saved successfully');
  } catch (error) {
    console.error('[DJ Payout Method PUT API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/djs/me/payout-requests - DJ submits a withdrawal request
router.post('/me/payout-requests', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, stageName: true, payoutMethod: true },
    });

    if (!dj) {
      return fail(res, 403, 'DJ profile required');
    }

    if (!dj.payoutMethod) {
      return fail(res, 400, 'Please configure a payout method first');
    }

    const { amount, notes } = req.body;
    const numAmount = parseFloat(amount);

    if (Number.isNaN(numAmount) || numAmount < 50) {
      return fail(res, 400, 'Minimum withdrawal amount is SLE 50');
    }

    const payoutRequest = await prisma.payoutRequest.create({
      data: {
        djId: dj.id,
        amount: numAmount,
        currency: 'SLE',
        status: 'PENDING',
        payoutMethod: dj.payoutMethod,
        notes: notes || null,
      },
    });

    return ok(res, payoutRequest, `Withdrawal request for SLE ${numAmount.toLocaleString()} submitted successfully. Our finance team will process it within 24-48 hours.`);
  } catch (error) {
    console.error('[DJ Payout Request API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/djs/me/payout-requests - DJ views their withdrawal requests history
router.get('/me/payout-requests', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return fail(res, 403, 'DJ profile required');
    }

    const requests = await prisma.payoutRequest.findMany({
      where: { djId: dj.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return ok(res, requests);
  } catch (error) {
    console.error('[DJ Payout Requests History API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;