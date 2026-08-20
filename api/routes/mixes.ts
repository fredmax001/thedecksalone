const express = require('express');
const axios = require('axios');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, softAuthMiddleware, requireRole } = require('../middleware/auth');
const { playLimiter, conditionalSearchLimiter } = require('../utils/rateLimiter');
const { requirePro } = require('../middleware/permissions');
const { recordMixPlay, recalculateMonthlyListeners } = require('../utils/monthlyListeners');
const { uploadMix } = require('../utils/upload');
const { uploadBuffer } = require('../utils/storage');
const { processCover } = require('../utils/imageProcessor');
const { withCache, clearCache } = require('../utils/cache');
const { resolveAudioUrl, resolveHearthisSet } = require('../utils/audioResolver');
const { requireTrialOrSubscription, calculateTrialStatus } = require('../utils/trial');

const router = express.Router();

const mixFilterSchema = z.object({
  category: z.string().optional(),
  genre: z.string().optional(),
  djId: z.string().optional(),
  search: z.string().max(200).optional(),
  featured: z.string().optional(),
  sortBy: z.enum(['plays', 'likes', 'downloads', 'newest']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const parseBooleanOptional = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
  }
  return val;
}, z.boolean().optional());

const createMixSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  genre: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  tags: z.array(z.string()).optional(),
  duration: z.number().int().min(1).optional(),
  isPublic: parseBooleanOptional,
  isExclusive: parseBooleanOptional,
  audioUrl: z.string().optional(),
});

const updateMixSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  genre: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  tags: z.array(z.string()).optional(),
  duration: z.number().int().min(1).optional(),
  isPublic: parseBooleanOptional,
  isExclusive: parseBooleanOptional,
  audioUrl: z.string().optional(),
});

const importHearthisSchema = z.object({
  urls: z.array(z.string()).min(1).max(50),
  defaultGenre: z.string().max(100).optional(),
  defaultCategory: z.string().max(100).optional(),
  isPublic: parseBooleanOptional,
});

const importSoundcloudSchema = z.object({
  urls: z.array(z.string()).min(1).max(50),
  defaultGenre: z.string().max(100).optional(),
  defaultCategory: z.string().max(100).optional(),
  isPublic: parseBooleanOptional,
});

// GET /api/mixes - List mixes with filtering
router.get('/', conditionalSearchLimiter, async (req, res) => {
  try {
    const parsed = mixFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { category, genre, djId, search, featured, sortBy, order, page, limit } = parsed.data;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause using explicit AND array for clean Prisma queries
    const andConditions: any[] = [];

    // Genre filter: match either genre OR category OR title OR tags (smart genre search)
    if (genre) {
      andConditions.push({
        OR: [
          { genre: { equals: genre, mode: 'insensitive' } },
          { category: { equals: genre, mode: 'insensitive' } },
          { title: { contains: genre, mode: 'insensitive' } },
          { tags: { has: genre } },
        ],
      });
    }

    // Category filter (legacy support)
    if (category) {
      andConditions.push({
        OR: [
          { category: { equals: category, mode: 'insensitive' } },
          { genre: { equals: category, mode: 'insensitive' } },
        ],
      });
    }

    if (djId) andConditions.push({ djId });
    if (featured === 'true') andConditions.push({ featured: true });

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ],
      });
    }

    const where: any = { isPublic: true };
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const orderBy: any = [];
    if (sortBy === 'plays') orderBy.push({ plays: order === 'asc' ? 'asc' : 'desc' });
    else if (sortBy === 'likes') orderBy.push({ likes: order === 'asc' ? 'asc' : 'desc' });
    else if (sortBy === 'downloads') orderBy.push({ downloads: order === 'asc' ? 'asc' : 'desc' });
    else {
      orderBy.push({ promotedUntil: 'desc' });
      orderBy.push({ createdAt: 'desc' });
    }

    const [mixes, total] = await Promise.all([
      prisma.mix.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          dj: {
            select: {
              id: true,
              stageName: true,
              avatar: true,
              city: true,
              country: true,
              verified: true,
              subscriptionTier: true,
              isPro: true,
              subscriptionPrice: true,
              promotionPoints: true,
            },
          },
          _count: {
            select: {
              mixLikes: true,
              reups: true,
              mixComments: true,
            },
          },
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
    console.error('[Mixes API] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/mixes/all - List ALL mixes (including private) for ADMIN and MODERATOR only
router.get('/all', authMiddleware, requireRole('ADMIN', 'MODERATOR'), async (req, res) => {
  try {
    const { search, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { tags: { has: term } },
        { genre: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [mixes, total] = await Promise.all([
      prisma.mix.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
    console.error('[Mixes API] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/mixes/hall-of-fame - Legendary mixes in Hall of Fame
router.get('/hall-of-fame', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 6));

    let mixes = await prisma.mix.findMany({
      where: { hallOfFame: true, isPublic: true },
      orderBy: [{ plays: 'desc' }, { likes: 'desc' }],
      take: limitNum,
      include: {
        dj: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    // Fallback: if no Hall of Fame mixes, return top trending mixes
    if (mixes.length === 0) {
      mixes = await prisma.mix.findMany({
        where: { isPublic: true },
        orderBy: [{ plays: 'desc' }, { likes: 'desc' }],
        take: limitNum,
        include: {
          dj: { select: { id: true, stageName: true, avatar: true } },
        },
      });
    }

    return res.json({ success: true, data: mixes });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/mixes/categories - Get all categories (alias for genres) (cached 60s)
router.get('/categories', async (req, res) => {
  try {
    const categories = await withCache('mixes:categories', 60000, async () => {
      const rows = await prisma.$queryRaw`
        SELECT genre as name, COUNT(*)::int as count
        FROM mixes
        WHERE "isPublic" = true AND genre IS NOT NULL AND genre <> ''
        GROUP BY genre
        ORDER BY count DESC, genre ASC
      `;
      return (rows || []).map((r: any) => ({
        id: r.name.toLowerCase().replace(/\s+/g, '-'),
        name: r.name,
        description: '',
        count: Number(r.count),
      }));
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/mixes/genres - Get all distinct genres with mix counts
router.get('/genres', async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT genre, COUNT(*) as count
      FROM mixes
      WHERE "isPublic" = true AND genre IS NOT NULL AND genre <> ''
      GROUP BY genre
      ORDER BY count DESC, genre ASC
    `;
    return res.json({
      success: true,
      data: rows.map((r: any) => ({
        name: r.genre,
        count: Number(r.count),
      })),
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/mixes/trending - Trending mixes
router.get('/trending', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const genre = req.query.genre;

    const where: any = { isPublic: true };
    if (genre) {
      // Smart genre search: match genre, category, title, or tags
      where.AND = {
        OR: [
          { genre: { equals: genre, mode: 'insensitive' } },
          { category: { equals: genre, mode: 'insensitive' } },
          { title: { contains: genre, mode: 'insensitive' } },
          { tags: { has: genre } },
        ],
      };
    }

    const mixes = await prisma.mix.findMany({
      where,
      orderBy: [{ plays: 'desc' }, { likes: 'desc' }],
      take: limitNum,
      include: {
        dj: {
          select: {
            id: true,
            stageName: true,
            avatar: true,
            city: true,
            country: true,
            verified: true,
            subscriptionTier: true,
            isPro: true,
            subscriptionPrice: true,
            promotionPoints: true,
          },
        },
        _count: {
          select: {
            mixLikes: true,
            reups: true,
            mixComments: true,
          },
        },
      },
    });

    return res.json({ success: true, data: mixes });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/mixes/import-hearthis - Bulk import Hearthis.at track URLs for the authenticated DJ
router.post('/import-hearthis', authMiddleware, async (req, res) => {
  try {
    const parsed = importHearthisSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Must be a DJ to import mixes' });
    }

    const djId = dj ? dj.id : req.body.djId;
    if (!djId) {
      return res.status(400).json({ success: false, error: 'DJ ID required' });
    }

    const rawUrls = parsed.data.urls;
    const urls = rawUrls
      .map((u) => String(u).trim())
      .filter(Boolean);

    const defaultGenre = parsed.data.defaultGenre || 'Open Format';
    const defaultCategory = parsed.data.defaultCategory || 'Salone Mix';
    const isPublic = parsed.data.isPublic !== false;

    const imported = [];
    const errors = [];

    for (const url of urls) {
      try {
        const parts = require('../utils/audioResolver').parseHearthisUrl(url);

        // Handle Hearthis sets (playlists) which contain multiple tracks
        if (parts && parts.isSet) {
          const setTracks = await resolveHearthisSet(url);
          if (setTracks.length === 0) {
            errors.push({ url, error: 'Unable to resolve Hearthis set or set is empty' });
            continue;
          }

          let setImportedCount = 0;
          for (const { resolved, originalUrl } of setTracks) {
            const existing = await prisma.mix.findFirst({
              where: { djId, originalUrl },
            });
            if (existing) {
              errors.push({ url: originalUrl, error: 'Already imported' });
              continue;
            }

            const mix = await prisma.mix.create({
              data: {
                title: resolved.title || 'Imported Mix',
                description: `Imported from Hearthis.at`,
                genre: defaultGenre,
                category: defaultCategory,
                djId,
                audioUrl: resolved.audioUrl,
                audioSource: resolved.audioSource,
                originalUrl,
                coverImage: resolved.coverImage,
                duration: resolved.duration,
                isPublic,
              },
            });

            imported.push(mix);
            setImportedCount += 1;
          }

          if (setImportedCount > 0) {
            await prisma.djProfile.update({
              where: { id: djId },
              data: { totalMixes: { increment: setImportedCount } },
            });
          }
          continue;
        }

        const resolved = await resolveAudioUrl(url);
        if (!resolved) {
          errors.push({ url, error: 'Unable to resolve Hearthis URL' });
          continue;
        }

        // Avoid duplicates by originalUrl
        const existing = await prisma.mix.findFirst({
          where: { djId, originalUrl: url },
        });
        if (existing) {
          errors.push({ url, error: 'Already imported' });
          continue;
        }

        const mix = await prisma.mix.create({
          data: {
            title: resolved.title || 'Imported Mix',
            description: `Imported from Hearthis.at`,
            genre: defaultGenre,
            category: defaultCategory,
            djId,
            audioUrl: resolved.audioUrl,
            audioSource: resolved.audioSource,
            originalUrl: url,
            coverImage: resolved.coverImage,
            duration: resolved.duration,
            isPublic,
          },
        });

        await prisma.djProfile.update({
          where: { id: djId },
          data: { totalMixes: { increment: 1 } },
        });

        imported.push(mix);
      } catch (err) {
        errors.push({ url, error: err.message || 'Import failed' });
      }
    }

    return res.json({
      success: true,
      data: { imported, count: imported.length, errors, errorCount: errors.length },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/mixes/import-soundcloud - Bulk import SoundCloud track URLs for the authenticated DJ
router.post('/import-soundcloud', authMiddleware, async (req, res) => {
  try {
    const parsed = importSoundcloudSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Must be a DJ to import mixes' });
    }

    const djId = dj ? dj.id : req.body.djId;
    if (!djId) {
      return res.status(400).json({ success: false, error: 'DJ ID required' });
    }

    const rawUrls = parsed.data.urls;
    const urls = rawUrls
      .map((u) => String(u).trim())
      .filter(Boolean);

    const defaultGenre = parsed.data.defaultGenre || 'Open Format';
    const defaultCategory = parsed.data.defaultCategory || 'Salone Mix';
    const isPublic = parsed.data.isPublic !== false;

    const imported = [];
    const errors = [];

    for (const url of urls) {
      try {
        const resolved = await resolveAudioUrl(url);
        if (!resolved) {
          errors.push({ url, error: 'Unable to resolve SoundCloud URL' });
          continue;
        }

        // Avoid duplicates by originalUrl or audioUrl
        const existing = await prisma.mix.findFirst({
          where: {
            djId,
            OR: [
              { originalUrl: url },
              { audioUrl: resolved.audioUrl },
            ],
          },
        });
        if (existing) {
          errors.push({ url, error: 'Already imported' });
          continue;
        }

        const mix = await prisma.mix.create({
          data: {
            title: resolved.title || 'Imported SoundCloud Mix',
            description: `Imported from SoundCloud`,
            genre: defaultGenre,
            category: defaultCategory,
            djId,
            audioUrl: resolved.audioUrl,
            audioSource: resolved.audioSource,
            originalUrl: url,
            coverImage: resolved.coverImage,
            duration: resolved.duration,
            isPublic,
          },
        });

        await prisma.djProfile.update({
          where: { id: djId },
          data: { totalMixes: { increment: 1 } },
        });

        imported.push(mix);
      } catch (err: any) {
        errors.push({ url, error: err.message || 'Import failed' });
      }
    }

    return res.json({
      success: true,
      data: { imported, count: imported.length, errors, errorCount: errors.length },
    });
  } catch (error: any) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/mixes/:id - Get single mix
router.get('/:id', softAuthMiddleware, async (req, res) => {
  try {
    const mix = await prisma.mix.findUnique({
      where: { id: req.params.id },
      include: {
        dj: {
          select: {
            id: true,
            stageName: true,
            avatar: true,
            city: true,
            country: true,
            subscriptionTier: true,
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    // Private mixes are only visible to the owner or an admin
    if (!mix.isPublic) {
      const isOwner = req.user?.id && mix.dj?.user?.id === req.user.id;
      const isAdmin = req.user?.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return res.status(404).json({ success: false, error: 'Mix not found' });
      }
    }

    // Play tracking is handled by POST /:id/play to support dedup and analytics
    return res.json({ success: true, data: mix });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/mixes/:id/recommendations - Recommend similar mixes and more from the same DJ
router.get('/:id/recommendations', softAuthMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const targetMix = await prisma.mix.findUnique({
      where: { id },
      select: {
        id: true,
        genre: true,
        category: true,
        tags: true,
        djId: true,
        isPublic: true,
      },
    });

    if (!targetMix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    const selectFields = {
      id: true,
      title: true,
      genre: true,
      category: true,
      tags: true,
      coverImage: true,
      audioUrl: true,
      audioSource: true,
      originalUrl: true,
      duration: true,
      plays: true,
      likes: true,
      createdAt: true,
      dj: {
        select: {
          id: true,
          stageName: true,
          avatar: true,
          verified: true,
          subscriptionTier: true,
        },
      },
    };

    // 1. Find similar mixes by same genre/category/tags excluding current mix
    const similar = await prisma.mix.findMany({
      where: {
        id: { not: id },
        isPublic: true,
        OR: [
          { genre: targetMix.genre },
          { category: targetMix.category },
          ...(targetMix.tags && targetMix.tags.length > 0 ? [{ tags: { hasSome: targetMix.tags } }] : []),
        ],
      },
      take: 8,
      orderBy: [{ plays: 'desc' }, { likes: 'desc' }, { createdAt: 'desc' }],
      select: selectFields,
    });

    // 2. Find more mixes from the same DJ
    const moreFromDj = await prisma.mix.findMany({
      where: {
        id: { not: id },
        djId: targetMix.djId,
        isPublic: true,
      },
      take: 6,
      orderBy: [{ createdAt: 'desc' }, { plays: 'desc' }],
      select: selectFields,
    });

    return res.json({
      success: true,
      data: {
        similar,
        moreFromDj,
      },
    });
  } catch (error: any) {
    console.error('Error fetching mix recommendations:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch recommendations' });
  }
});

// POST /api/mixes - Create mix (auth required)
router.post('/', authMiddleware, requireTrialOrSubscription, uploadMix, async (req, res) => {
  try {
    const parsed = createMixSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Must be a DJ to upload mixes' });
    }

    // Check upload limits for expired free tier
    const FREE_TIER_LIMIT = 5;
    const isPro = dj?.isPro || ['pro', 'legend'].includes(dj?.subscriptionTier || '');
    if (dj && !isPro && dj.totalMixes >= FREE_TIER_LIMIT) {
      const trial = req.trialStatus || calculateTrialStatus(req.user, dj);
      if (!trial.hasFeatureAccess) {
        return res.status(403).json({ 
          success: false, 
          error: 'Free trial expired and upload limit reached. Upgrade to Pro to upload unlimited mixes.',
          requiresUpgrade: true,
          requiresSubscription: true,
          trialStatus: trial,
        });
      }
    }

    const djId = dj ? dj.id : req.body.djId;
    const data = parsed.data;

    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.coverImage?.[0];

    let audioUrl = null;
    let audioSource = null;
    let originalUrl = null;
    let coverUrl = null;

    if (audioFile) {
      audioUrl = await uploadBuffer(audioFile.buffer, 'mixes', {
        contentType: audioFile.mimetype,
        ext: audioFile.originalname.split('.').pop() || 'mp3',
      });
      audioSource = 'upload';
    } else if (data.audioUrl) {
      const resolved = await resolveAudioUrl(data.audioUrl);
      if (!resolved) {
        return res.status(400).json({
          success: false,
          error:
            'Unable to use this audio link. Please provide a direct audio file, SoundCloud, Audiomack, or Hearthis.at link.',
        });
      }
      audioUrl = resolved.audioUrl;
      audioSource = resolved.audioSource;
      originalUrl = data.audioUrl;
      if (!data.duration && resolved.duration) {
        data.duration = resolved.duration;
      }
      if (!coverUrl && resolved.coverImage) {
        coverUrl = resolved.coverImage;
      }
    }
    if (coverFile) {
      const { buffer, contentType, ext } = await processCover(coverFile.buffer);
      coverUrl = await uploadBuffer(buffer, 'covers', { contentType, ext });
    }

    const mix = await prisma.mix.create({
      data: {
        ...data,
        djId,
        audioUrl,
        audioSource,
        originalUrl,
        coverImage: coverUrl,
      },
    });

    // Update totalMixes count
    await prisma.djProfile.update({
      where: { id: djId },
      data: { totalMixes: { increment: 1 } },
    });

    return res.status(201).json({ success: true, data: mix });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/mixes/:id - Update mix
router.put('/:id', authMiddleware, uploadMix, async (req, res) => {
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
    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.coverImage?.[0];

    if (audioFile) {
      updateData.audioUrl = await uploadBuffer(audioFile.buffer, 'mixes', {
        contentType: audioFile.mimetype,
        ext: audioFile.originalname.split('.').pop() || 'mp3',
      });
      updateData.audioSource = 'upload';
      updateData.originalUrl = null;
    } else if (updateData.audioUrl) {
      const originalAudioUrl = updateData.audioUrl;
      const resolved = await resolveAudioUrl(originalAudioUrl);
      if (!resolved) {
        return res.status(400).json({
          success: false,
          error:
            'Unable to use this audio link. Please provide a direct audio file, SoundCloud, Audiomack, or Hearthis.at link.',
        });
      }
      updateData.audioUrl = resolved.audioUrl;
      updateData.audioSource = resolved.audioSource;
      updateData.originalUrl = originalAudioUrl;
      if (!updateData.duration && resolved.duration) {
        updateData.duration = resolved.duration;
      }
      if (!updateData.coverImage && resolved.coverImage) {
        updateData.coverImage = resolved.coverImage;
      }
    }
    if (coverFile) {
      const { buffer, contentType, ext } = await processCover(coverFile.buffer);
      updateData.coverImage = await uploadBuffer(buffer, 'covers', { contentType, ext });
    }

    const updated = await prisma.mix.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
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
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/mixes/:id/like - Toggle like on a mix (deduped via MixLike join table)
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const mixId = req.params.id;
    const userId = req.user.id;

    // Check if mix exists
    const mix = await prisma.mix.findUnique({ where: { id: mixId }, select: { id: true } });
    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    // Check for existing like
    const existing = await prisma.mixLike.findUnique({
      where: { mixId_userId: { mixId, userId } },
    });

    if (existing) {
      // Unlike: remove the record and decrement
      await prisma.$transaction([
        prisma.mixLike.delete({ where: { mixId_userId: { mixId, userId } } }),
        prisma.mix.update({ where: { id: mixId }, data: { likes: { decrement: 1 } } }),
      ]);
      return res.json({ success: true, data: { liked: false, message: 'Mix unliked' } });
    }

    // Like: create the record and increment atomically
    await prisma.$transaction([
      prisma.mixLike.create({ data: { mixId, userId } }),
      prisma.mix.update({ where: { id: mixId }, data: { likes: { increment: 1 } } }),
    ]);
    return res.json({ success: true, data: { liked: true, message: 'Mix liked' } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/mixes/:id/play - Track a play (call from the player, not on GET)
router.post('/:id/play', softAuthMiddleware, playLimiter, async (req, res) => {
  try {
    const mix = await prisma.mix.findUnique({
      where: { id: req.params.id },
      select: { id: true, djId: true, plays: true },
    });
    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    const updated = await prisma.mix.update({
      where: { id: req.params.id },
      data: { plays: { increment: 1 } },
      select: { plays: true },
    });

    recordMixPlay(mix.id, mix.djId, {
      userId: req.user?.id,
      ip: req.ip,
    }).catch(() => {});

    // Update cached monthly listener count asynchronously (do not block response)
    recalculateMonthlyListeners(mix.djId).catch(() => {});

    return res.json({ success: true, data: { plays: updated.plays } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RE-UPS (Pro+ only)
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/mixes/:id/reup - Re-up another DJ's mix
router.post('/:id/reup', authMiddleware, requirePro, async (req, res) => {
  try {
    const mixId = req.params.id;
    const djId = req.djProfile.id;

    const mix = await prisma.mix.findUnique({
      where: { id: mixId },
      include: { dj: { select: { userId: true } } },
    });

    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    if (!mix.isPublic) {
      return res.status(400).json({ success: false, error: 'Cannot re-up a private mix' });
    }

    if (mix.djId === djId) {
      return res.status(400).json({ success: false, error: 'You cannot re-up your own mix' });
    }

    if (mix.dj.userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot re-up your own mix' });
    }

    const existing = await prisma.mixReup.findUnique({
      where: { djId_mixId: { djId, mixId } },
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'You have already re-upped this mix' });
    }

    const reup = await prisma.mixReup.create({
      data: { djId, mixId },
    });

    return res.status(201).json({ success: true, data: reup });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/mixes/:id/reup - Remove a re-up
router.delete('/:id/reup', authMiddleware, requirePro, async (req, res) => {
  try {
    const mixId = req.params.id;
    const djId = req.djProfile.id;

    const existing = await prisma.mixReup.findUnique({
      where: { djId_mixId: { djId, mixId } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Re-up not found' });
    }

    await prisma.mixReup.delete({
      where: { djId_mixId: { djId, mixId } },
    });

    return res.json({ success: true, data: { reupped: false } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/mixes/:id/reup-status - Check if current DJ has re-upped this mix
router.get('/:id/reup-status', softAuthMiddleware, async (req, res) => {
  try {
    const mixId = req.params.id;

    if (!req.user) {
      const count = await prisma.mixReup.count({ where: { mixId } });
      return res.json({ success: true, data: { reupped: false, count } });
    }

    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, subscriptionTier: true },
    });

    if (!dj || dj.subscriptionTier === 'free') {
      const count = await prisma.mixReup.count({ where: { mixId } });
      return res.json({ success: true, data: { reupped: false, count } });
    }

    const [reup, count] = await Promise.all([
      prisma.mixReup.findUnique({
        where: { djId_mixId: { djId: dj.id, mixId } },
      }),
      prisma.mixReup.count({ where: { mixId } }),
    ]);

    return res.json({
      success: true,
      data: { reupped: !!reup, count },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/mixes/:id/promote - Promote mix using DJ Promotion Points (Pro / Pro+ DJs only)
router.post('/:id/promote', authMiddleware, async (req, res) => {
  try {
    const mixId = req.params.id;
    const { durationDays = 1 } = req.body || {};

    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, subscriptionTier: true, promotionPoints: true },
    });

    if (!dj) {
      return res.status(403).json({ success: false, error: 'DJ profile required' });
    }

    const tier = (dj.subscriptionTier || 'free').toLowerCase();
    if (tier !== 'pro' && tier !== 'legend') {
      return res.status(403).json({
        success: false,
        error: 'Mix promotions and point boosts are exclusively available for Pro and Pro+ DJs.',
        requiresUpgrade: true,
      });
    }

    // Point pricing: 1 day = 100 pts, 3 days = 250 pts, 7 days = 500 pts
    let pointsCost = 100;
    if (durationDays >= 7) pointsCost = 500;
    else if (durationDays >= 3) pointsCost = 250;
    else pointsCost = Math.max(1, durationDays) * 100;

    if ((dj.promotionPoints || 0) < pointsCost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient promotion points. You have ${dj.promotionPoints || 0} pts, but this boost requires ${pointsCost} pts.`,
        requiredPoints: pointsCost,
        currentPoints: dj.promotionPoints || 0,
      });
    }

    const mix = await prisma.mix.findUnique({
      where: { id: mixId },
      select: { id: true, djId: true, title: true, promotedUntil: true },
    });

    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    if (mix.djId !== dj.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'You can only promote your own mixes' });
    }

    const currentExpiry = mix.promotedUntil && new Date(mix.promotedUntil) > new Date()
      ? new Date(mix.promotedUntil)
      : new Date();

    const newExpiry = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const [updatedMix, updatedDj] = await prisma.$transaction([
      prisma.mix.update({
        where: { id: mixId },
        data: {
          promotedUntil: newExpiry,
          promotedPointsSpent: { increment: pointsCost },
        },
      }),
      prisma.djProfile.update({
        where: { id: dj.id },
        data: {
          promotionPoints: { decrement: pointsCost },
        },
      }),
    ]);

    return res.json({
      success: true,
      message: `"${mix.title}" is now boosted and promoted until ${newExpiry.toLocaleDateString()}!`,
      data: {
        promotedUntil: updatedMix.promotedUntil,
        remainingPoints: updatedDj.promotionPoints,
        pointsSpent: pointsCost,
      },
    });
  } catch (error) {
    console.error('[Mix Promote API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Helper to sanitize filename
function sanitizeFilename(name) {
  return (name || 'mix').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

// GET /api/mixes/:id/download-file - Stream direct MP3 file attachment to browser
router.get('/:id/download-file', softAuthMiddleware, async (req, res) => {
  try {
    const mixId = req.params.id;

    const mix = await prisma.mix.findUnique({
      where: { id: mixId },
      include: {
        dj: {
          select: {
            id: true,
            stageName: true,
            userId: true,
            subscriptionTier: true,
            subscriptionPrice: true,
          },
        },
      },
    });

    if (!mix || !mix.audioUrl) {
      return res.status(404).send('Audio file not found.');
    }

    // Check exclusivity
    if (mix.isExclusive) {
      if (!req.user) {
        return res.status(401).send('Please log in to download this exclusive mix.');
      }
      const isOwner = mix.dj?.userId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

      if (!isOwner && !isAdmin) {
        const sub = await prisma.djFanSubscription.findUnique({
          where: { djId_userId: { djId: mix.djId, userId: req.user.id } },
        });
        const isSubscribed = !!sub && sub.status === 'ACTIVE' && new Date(sub.expiresAt) > new Date();
        if (!isSubscribed) {
          return res.status(403).send(`This mix is exclusive to ${mix.dj?.stageName || 'DJ'} subscribers.`);
        }
      }
    }

    // Increment download counter
    await prisma.mix.update({
      where: { id: mixId },
      data: { downloads: { increment: 1 } },
    }).catch(() => {});

    const filename = `${sanitizeFilename(mix.title)}.mp3`;

    // If audio is an external URL, stream it with proper download headers
    if (/^https?:\/\//i.test(mix.audioUrl)) {
      try {
        const response = await axios({
          method: 'get',
          url: mix.audioUrl,
          responseType: 'stream',
          timeout: 45000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mpeg');
        if (response.headers['content-length']) {
          res.setHeader('Content-Length', response.headers['content-length']);
        }

        return response.data.pipe(res);
      } catch (streamErr) {
        console.error('[Download Stream] Proxy redirect fallback:', streamErr.message);
        return res.redirect(mix.audioUrl);
      }
    }

    // If audio is a local file
    return res.download(mix.audioUrl, filename, (err) => {
      if (err && !res.headersSent) {
        return res.status(500).send('Error streaming file');
      }
    });
  } catch (error) {
    console.error('[Mix Download File API] Error:', error);
    return res.status(500).send('Internal server error');
  }
});

// POST /api/mixes/:id/download - Verify permissions, increment count & get download URL
router.post('/:id/download', softAuthMiddleware, async (req, res) => {
  try {
    const mixId = req.params.id;

    const mix = await prisma.mix.findUnique({
      where: { id: mixId },
      include: {
        dj: {
          select: {
            id: true,
            stageName: true,
            userId: true,
            subscriptionTier: true,
            subscriptionPrice: true,
          },
        },
      },
    });

    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    // Check if mix is exclusive to subscribers
    if (mix.isExclusive) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Please log in to download this exclusive mix.',
          requiresAuth: true,
        });
      }

      const isOwner = mix.dj?.userId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

      if (!isOwner && !isAdmin) {
        const sub = await prisma.djFanSubscription.findUnique({
          where: { djId_userId: { djId: mix.djId, userId: req.user.id } },
        });

        const isSubscribed = !!sub && sub.status === 'ACTIVE' && new Date(sub.expiresAt) > new Date();

        if (!isSubscribed) {
          return res.status(403).json({
            success: false,
            error: `This mix is exclusive to ${mix.dj?.stageName || 'DJ'} subscribers.`,
            requiresSubscription: true,
            djId: mix.djId,
            djName: mix.dj?.stageName,
            subscriptionPrice: mix.dj?.subscriptionPrice || 100,
          });
        }
      }
    }

    // Increment download counter
    const updated = await prisma.mix.update({
      where: { id: mixId },
      data: { downloads: { increment: 1 } },
      select: { id: true, downloads: true, audioUrl: true, title: true },
    });

    return res.json({
      success: true,
      downloadUrl: `/api/mixes/${mixId}/download-file`,
      directAudioUrl: updated.audioUrl,
      downloads: updated.downloads,
    });
  } catch (error) {
    console.error('[Mix Download API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
