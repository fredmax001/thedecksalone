const express = require('express');
const path = require('path');
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
const { createNotification, createNotificationForDj } = require('../utils/notifications');

const router = express.Router();

const mixFilterSchema = z.object({
  category: z.string().optional(),
  genre: z.string().optional(),
  djId: z.string().optional(),
  search: z.string().max(200).optional(),
  featured: z.string().optional(),
  sortBy: z.enum(['plays', 'likes', 'downloads', 'newest', 'trending', 'streamed']).optional(),
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
  allowPublicDownloads: parseBooleanOptional,
  repostToDownload: parseBooleanOptional,
  followToDownload: parseBooleanOptional,
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
  allowPublicDownloads: parseBooleanOptional,
  repostToDownload: parseBooleanOptional,
  followToDownload: parseBooleanOptional,
  audioUrl: z.string().optional(),
});

const importHearthisSchema = z.object({
  urls: z.array(z.string()).min(1).max(50),
  defaultGenre: z.string().max(100).optional(),
  defaultCategory: z.string().max(100).optional(),
  isPublic: parseBooleanOptional,
});

/**
 * Check whether a user is allowed to download a mix.
 * Returns an object describing the gate and whether access is granted.
 */
async function checkDownloadAccess(mix, user) {
  const isOwner = mix.dj?.userId === user.id;
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'MODERATOR';

  if (isOwner || isAdmin) {
    return { allowed: true, gate: 'owner' };
  }

  // Per-mix download gates (mutually exclusive in UI, checked in priority order)
  if (mix.allowPublicDownloads) {
    return { allowed: true, gate: 'public' };
  }

  if (mix.repostToDownload) {
    const repost = await prisma.mixRepost.findUnique({
      where: { mixId_userId: { mixId: mix.id, userId: user.id } },
    });
    if (repost) {
      return { allowed: true, gate: 'repost' };
    }
    return { allowed: false, gate: 'repost' };
  }

  if (mix.followToDownload) {
    const follow = await prisma.follow.findUnique({
      where: { userId_djId: { userId: user.id, djId: mix.djId } },
    });
    if (follow) {
      return { allowed: true, gate: 'follow' };
    }
    return { allowed: false, gate: 'follow' };
  }

  // Fall back to platform subscription gating (DJ or platform Pro subscriptions)
  const userWithDj = await prisma.user.findUnique({
    where: { id: user.id },
    include: { djProfile: true },
  });

  const userTier = (userWithDj?.djProfile?.subscriptionTier || userWithDj?.subscriptionTier || 'free').toLowerCase();
  const hasProPlan = ['pro', 'pro_plus', 'legend'].includes(userTier);

  if (hasProPlan) {
    return { allowed: true, gate: 'subscription' };
  }

  return { allowed: false, gate: 'subscription' };
}

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
    if (sortBy === 'plays' || sortBy === 'trending' || sortBy === 'streamed') {
      orderBy.push({ plays: order === 'asc' ? 'asc' : 'desc' });
      orderBy.push({ createdAt: 'desc' });
    } else if (sortBy === 'likes') {
      orderBy.push({ likes: order === 'asc' ? 'asc' : 'desc' });
      orderBy.push({ createdAt: 'desc' });
    } else if (sortBy === 'downloads') {
      orderBy.push({ downloads: order === 'asc' ? 'asc' : 'desc' });
      orderBy.push({ createdAt: 'desc' });
    } else {
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

// Helper middleware: Ensure user is a DJ and attach djProfile
async function requireDjProfile(req, res, next) {
  if (!req.user || req.user.role !== 'DJ') {
    return res.status(403).json({ success: false, error: 'Only DJ accounts can perform this action' });
  }
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj) {
    return res.status(404).json({ success: false, error: 'DJ Profile not found' });
  }
  req.djProfile = dj;
  next();
}

// GET /api/mixes/my-mixes - List ALL mixes for the authenticated DJ (including private drafts)
router.get('/my-mixes', authMiddleware, requireDjProfile, async (req, res) => {
  try {
    const djId = req.djProfile.id;
    const mixes = await prisma.mix.findMany({
      where: { djId },
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            mixLikes: true,
            reups: true,
            mixComments: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: mixes,
    });
  } catch (error) {
    console.error('[Mixes API] Error fetching my mixes:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/mixes/reorder - Update sortOrder for a DJ's mixes
const reorderMixesSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    sortOrder: z.number().int().min(0),
  })).min(1),
});

router.put('/reorder', authMiddleware, requireDjProfile, async (req, res) => {
  try {
    const parsed = reorderMixesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const djId = req.djProfile.id;
    const { items } = parsed.data;

    // Verify all mixes belong to this DJ
    const mixIds = items.map((item) => item.id);
    const mixes = await prisma.mix.findMany({
      where: { id: { in: mixIds }, djId },
      select: { id: true },
    });
    const ownedIds = new Set(mixes.map((m) => m.id));
    if (mixes.length !== mixIds.length) {
      return res.status(403).json({ success: false, error: 'You can only reorder your own mixes' });
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.mix.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return res.json({ success: true, message: 'Mix order updated' });
  } catch (error) {
    console.error('[Mixes API] Error reordering mixes:', error.message);
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

    const maxOrder = await prisma.mix.aggregate({
      where: { djId },
      _max: { sortOrder: true },
    });
    let nextSortOrder = (maxOrder._max.sortOrder || 0) + 1;

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
                sortOrder: nextSortOrder++,
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
            sortOrder: nextSortOrder++,
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
            'Unable to use this audio link. Please provide a direct audio file or a Hearthis.at link.',
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

    const maxOrder = await prisma.mix.aggregate({
      where: { djId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxOrder._max.sortOrder || 0) + 1;

    const mix = await prisma.mix.create({
      data: {
        ...data,
        djId,
        audioUrl,
        audioSource,
        originalUrl,
        coverImage: coverUrl,
        sortOrder: nextSortOrder,
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
            'Unable to use this audio link. Please provide a direct audio file or a Hearthis.at link.',
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

    // Check if mix exists and belongs to a DJ
    const mix = await prisma.mix.findUnique({
      where: { id: mixId },
      select: { id: true, title: true, djId: true, dj: { select: { userId: true } } },
    });
    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    // Optimistically try to create the like. If a concurrent request already
    // created it (unique constraint), fall back to unliking. This removes the
    // read-then-write race that could create duplicate likes.
    try {
      await prisma.$transaction([
        prisma.mixLike.create({ data: { mixId, userId } }),
        prisma.mix.update({ where: { id: mixId }, data: { likes: { increment: 1 } } }),
      ]);

      // Notify the DJ when someone else likes their mix
      if (mix.dj?.userId && mix.dj.userId !== userId) {
        const liker = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, username: true },
        });
        const likerName = liker?.name || liker?.username || 'Someone';
        createNotification({
          userId: mix.dj.userId,
          type: 'MIX_LIKED',
          title: 'New mix like',
          body: `${likerName} liked your mix "${mix.title || 'Untitled'}"`,
          actionUrl: `/mix/${mix.id}`,
          entityId: mix.id,
          entityType: 'MIX',
          metadata: { likerId: userId },
        }).catch(() => {});
      }

      return res.json({ success: true, data: { liked: true, message: 'Mix liked' } });
    } catch (createErr: any) {
      // P2002 = unique constraint violation -> already liked, so unlike instead
      if (createErr?.code === 'P2002') {
        try {
          await prisma.$transaction([
            prisma.mixLike.delete({ where: { mixId_userId: { mixId, userId } } }),
            prisma.mix.update({ where: { id: mixId }, data: { likes: { decrement: 1 } } }),
          ]);
          return res.json({ success: true, data: { liked: false, message: 'Mix unliked' } });
        } catch (deleteErr: any) {
          // Record may have been deleted by another concurrent request
          if (deleteErr?.code === 'P2025') {
            return res.json({ success: true, data: { liked: false, message: 'Mix unliked' } });
          }
          throw deleteErr;
        }
      }
      throw createErr;
    }
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

// POST /api/mixes/:id/repost - User reposts a mix
router.post('/:id/repost', authMiddleware, async (req, res) => {
  try {
    const mixId = req.params.id;
    const userId = req.user.id;

    const mix = await prisma.mix.findUnique({
      where: { id: mixId },
      select: { id: true, isPublic: true },
    });

    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    if (!mix.isPublic) {
      return res.status(400).json({ success: false, error: 'Cannot repost a private mix' });
    }

    await prisma.mixRepost.upsert({
      where: { mixId_userId: { mixId, userId } },
      create: { mixId, userId },
      update: {},
    });

    return res.json({ success: true, message: 'Mix reposted' });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/mixes/:id/repost - Remove a repost
router.delete('/:id/repost', authMiddleware, async (req, res) => {
  try {
    const mixId = req.params.id;
    const userId = req.user.id;

    await prisma.mixRepost.deleteMany({
      where: { mixId, userId },
    });

    return res.json({ success: true, message: 'Repost removed' });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/mixes/:id/repost-status - Check if current user reposted a mix
router.get('/:id/repost-status', softAuthMiddleware, async (req, res) => {
  try {
    const mixId = req.params.id;

    if (!req.user) {
      const count = await prisma.mixRepost.count({ where: { mixId } });
      return res.json({ success: true, data: { reposted: false, count } });
    }

    const [repost, count] = await Promise.all([
      prisma.mixRepost.findUnique({
        where: { mixId_userId: { mixId, userId: req.user.id } },
      }),
      prisma.mixRepost.count({ where: { mixId } }),
    ]);

    return res.json({
      success: true,
      data: { reposted: !!repost, count },
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
          },
        },
      },
    });

    if (!mix || !mix.audioUrl) {
      return res.status(404).send('Audio file not found.');
    }

    // Require authentication and check download permissions
    if (!req.user) {
      return res.status(401).send('Please log in to download mixes.');
    }

    const access = await checkDownloadAccess(mix, req.user);

    if (!access.allowed) {
      let message = 'Downloading mixes requires an active PRO subscription.';
      if (access.gate === 'repost') {
        message = 'Download is only active for users who reposted this mix.';
      } else if (access.gate === 'follow') {
        message = 'Download is only active for users who are following this DJ.';
      }
      return res.status(403).send(message);
    }

    // NOTE: download counter is incremented once by POST /:id/download
    const filename = `${sanitizeFilename(mix.title)}.mp3`;

    // Local uploads are served directly; external URLs are redirected (never proxied)
    // to prevent SSRF against internal services.
    if (/^https?:\/\//i.test(mix.audioUrl)) {
      return res.redirect(mix.audioUrl);
    }

    // If audio is a local file
    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
    const relativeMatch = mix.audioUrl.match(/^\/uploads\/(.*)$/);
    if (!relativeMatch) {
      return res.status(400).send('Invalid audio file path.');
    }
    const safeSuffix = path.normalize(relativeMatch[1]).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(uploadsDir, safeSuffix);
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(400).send('Invalid audio file path.');
    }
    return res.download(filePath, filename, (err) => {
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
          },
        },
      },
    });

    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    if (!mix.audioUrl) {
      return res.status(400).json({ success: false, error: 'No audio file available for this mix.' });
    }

    // Require authentication and check download permissions
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Please log in to download mixes.',
        requiresAuth: true,
      });
    }

    const access = await checkDownloadAccess(mix, req.user);

    if (!access.allowed) {
      const errorResponse: any = {
        success: false,
        error: 'Downloading mixes requires an active PRO subscription.',
        djId: mix.djId,
        djName: mix.dj?.stageName,
      };

      if (access.gate === 'repost') {
        errorResponse.error = 'Download is only active for users who reposted this mix.';
        errorResponse.requiresRepost = true;
      } else if (access.gate === 'follow') {
        errorResponse.error = 'Download is only active for users who are following this DJ.';
        errorResponse.requiresFollow = true;
      } else {
        errorResponse.requiresSubscription = true;
      }

      return res.status(403).json(errorResponse);
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

// ==========================================
// MIX COMMENTS ENDPOINTS
// ==========================================

// GET /api/mixes/:id/comments - Get comments for a mix
router.get('/:id/comments', softAuthMiddleware, async (req: any, res: any) => {
  try {
    const mixId = req.params.id;

    const mix = await prisma.mix.findUnique({
      where: { id: mixId },
      select: { id: true, dj: { select: { userId: true } } },
    });

    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    const djUserId = mix.dj?.userId;

    const [comments, total] = await Promise.all([
      prisma.mixComment.findMany({
        where: { mixId, parentId: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
              djProfile: {
                select: {
                  id: true,
                  stageName: true,
                  avatar: true,
                },
              },
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatar: true,
                  role: true,
                  djProfile: {
                    select: {
                      id: true,
                      stageName: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mixComment.count({ where: { mixId } }),
    ]);

    const formattedComments = comments.map((c: any) => ({
      ...c,
      isDjCreator: Boolean(djUserId && c.userId === djUserId),
      replies: (c.replies || []).map((r: any) => ({
        ...r,
        isDjCreator: Boolean(djUserId && r.userId === djUserId),
      })),
    }));

    return res.json({
      success: true,
      data: {
        comments: formattedComments,
        total,
      },
    });
  } catch (error) {
    console.error('[Mix Comments API] Error fetching comments:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/mixes/:id/comments - Post a comment or reply to a mix
router.post('/:id/comments', authMiddleware, async (req: any, res: any) => {
  try {
    const mixId = req.params.id;
    const userId = req.user.id;

    const parsed = z.object({
      content: z.string().trim().min(1, 'Comment cannot be empty').max(1000, 'Comment cannot exceed 1000 characters'),
      parentId: z.string().optional().nullable(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid comment input',
      });
    }

    const { content, parentId } = parsed.data;

    const mix = await prisma.mix.findUnique({
      where: { id: mixId },
      include: {
        dj: {
          select: {
            id: true,
            userId: true,
            stageName: true,
          },
        },
      },
    });

    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    if (parentId) {
      const parentComment = await prisma.mixComment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.mixId !== mixId) {
        return res.status(404).json({ success: false, error: 'Parent comment not found' });
      }
    }

    const comment = await prisma.mixComment.create({
      data: {
        mixId,
        userId,
        content,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
            djProfile: {
              select: {
                id: true,
                stageName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Notify mix creator if someone else commented on their mix
    if (mix.dj?.userId && mix.dj.userId !== userId) {
      const authorName = comment.user?.djProfile?.stageName || comment.user?.name || comment.user?.username || 'A user';
      prisma.notification.create({
        data: {
          userId: mix.dj.userId,
          type: 'SYSTEM',
          title: 'New Comment on Your Mix',
          body: `${authorName} commented on "${mix.title || 'your mix'}"`,
          actionUrl: `/mixes/${mix.id}#comments`,
          entityId: mix.id,
          entityType: 'mix',
        },
      }).catch((err: any) => console.error('[Mix Comments Notification Error]:', err));
    }

    return res.status(201).json({
      success: true,
      data: {
        ...comment,
        isDjCreator: Boolean(mix.dj?.userId && comment.userId === mix.dj.userId),
        replies: [],
      },
    });
  } catch (error) {
    console.error('[Mix Comments API] Error creating comment:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/mixes/:id/comments/:commentId - Delete a comment
router.delete('/:id/comments/:commentId', authMiddleware, async (req: any, res: any) => {
  try {
    const { id: mixId, commentId } = req.params;
    const userId = req.user.id;

    const comment = await prisma.mixComment.findUnique({
      where: { id: commentId },
      include: {
        mix: {
          include: {
            dj: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!comment || comment.mixId !== mixId) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const isAuthor = comment.userId === userId;
    const isDjCreator = comment.mix?.dj?.userId === userId;
    const isStaff = ['ADMIN', 'MODERATOR'].includes(req.user.role || '');

    if (!isAuthor && !isDjCreator && !isStaff) {
      return res.status(403).json({ success: false, error: 'You are not authorized to delete this comment' });
    }

    await prisma.mixComment.delete({
      where: { id: commentId },
    });

    return res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('[Mix Comments API] Error deleting comment:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
