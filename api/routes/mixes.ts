const express = require('express');
const path = require('path');
const { z } = require('zod');
const { prisma, DJ_PUBLIC_SELECT } = require('../utils/prisma');
const { authMiddleware, softAuthMiddleware, requireRole } = require('../middleware/auth');
const { playLimiter, conditionalSearchLimiter } = require('../utils/rateLimiter');
const { requirePro } = require('../middleware/permissions');
const { recordMixPlay, recalculateMonthlyListeners } = require('../utils/monthlyListeners');
const { uploadMix, extFromMime } = require('../utils/upload');
const { uploadBuffer } = require('../utils/storage');
const { processMixCover } = require('../utils/imageProcessor');
const { withCache, clearCache } = require('../utils/cache');
const { resolveAudioUrl, resolveHearthisSet } = require('../utils/audioResolver');
const { requireTrialOrSubscription, calculateTrialStatus } = require('../utils/trial');
const { createNotification, createNotificationForDj } = require('../utils/notifications');
const { parsePagination } = require('../utils/pagination');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../middleware/asyncHandler');
const { generateUniqueMixSlug, slugify } = require('../utils/slug');

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
  secondaryGenres: z.array(z.string()).optional(),
  duration: z.number().int().min(1).optional(),
  isPublic: parseBooleanOptional,
  isExclusive: parseBooleanOptional,
  allowPublicDownloads: parseBooleanOptional,
  repostToDownload: parseBooleanOptional,
  followToDownload: parseBooleanOptional,
  notListed: parseBooleanOptional,
  hideStats: parseBooleanOptional,
  allowComments: parseBooleanOptional,
  fansSeeTracklist: parseBooleanOptional,
  recordingLocation: z.string().max(200).optional().nullable(),
  version: z.string().max(100).optional().nullable(),
  bpm: z.string().max(20).optional().nullable(),
  musicalKey: z.string().max(20).optional().nullable(),
  showAutoBpmKey: parseBooleanOptional,
  isAiProduced: parseBooleanOptional,
  releaseDate: z.string().optional().nullable(),
  license: z.string().max(100).optional().nullable(),
  audioUrl: z.string().optional(),
  coverImage: z.string().optional().nullable(),
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

  // Fans / listeners can download mixes for free. DJs still need a Pro subscription
  // to unlock downloads as a platform monetization feature.
  const userWithDj = await prisma.user.findUnique({
    where: { id: user.id },
    include: { djProfile: true },
  });

  if (userWithDj?.role === 'USER') {
    return { allowed: true, gate: 'free' };
  }

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
      return fail(res, 400, 'Invalid filter parameters');
    }

    const { category, genre, djId, search, featured, sortBy, order, page, limit } = parsed.data;

    const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

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
      orderBy.push({ promotedUntil: { sort: 'desc', nulls: 'last' } });
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
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/mixes/all - List ALL mixes (including private) for ADMIN and MODERATOR only
router.get('/all', authMiddleware, requireRole('ADMIN', 'MODERATOR'), async (req, res) => {
  try {
    const { search, page, limit } = req.query;

    const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit }, { defaultLimit: 50, maxLimit: 100 });

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
    return fail(res, 500, 'Internal server error');
  }
});

// Helper middleware: Ensure user is a DJ and attach djProfile
async function requireDjProfile(req, res, next) {
  if (!req.user || req.user.role !== 'DJ') {
    return fail(res, 403, 'Only DJ accounts can perform this action');
  }
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj) {
    return fail(res, 404, 'DJ Profile not found');
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

    return ok(res, mixes);
  } catch (error) {
    console.error('[Mixes API] Error fetching my mixes:', error.message);
    return fail(res, 500, 'Internal server error');
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
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
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
      return fail(res, 403, 'You can only reorder your own mixes');
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
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/mixes/hall-of-fame - Legendary mixes in Hall of Fame
router.get('/hall-of-fame', asyncHandler(async (req, res) => {
  const { limit: limitNum } = parsePagination({ limit: req.query.limit }, { defaultLimit: 6, maxLimit: 20 });

  let mixes = await prisma.mix.findMany({
    where: { hallOfFame: true, isPublic: true },
    orderBy: [{ plays: 'desc' }, { likes: 'desc' }],
    take: limitNum,
    include: {
      dj: { select: DJ_PUBLIC_SELECT },
    },
  });

  // Fallback: if no Hall of Fame mixes, return top trending mixes
  if (mixes.length === 0) {
    mixes = await prisma.mix.findMany({
      where: { isPublic: true },
      orderBy: [{ plays: 'desc' }, { likes: 'desc' }],
      take: limitNum,
      include: {
        dj: { select: DJ_PUBLIC_SELECT },
      },
    });
  }

  return ok(res, mixes);
}));

// GET /api/mixes/categories - Get all categories (alias for genres) (cached 60s)
router.get('/categories', asyncHandler(async (req, res) => {
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
  return ok(res, categories);
}));

// GET /api/mixes/genres - Get all distinct genres with mix counts
router.get('/genres', asyncHandler(async (req, res) => {
  const rows = await prisma.$queryRaw`
    SELECT genre, COUNT(*) as count
    FROM mixes
    WHERE "isPublic" = true AND genre IS NOT NULL AND genre <> ''
    GROUP BY genre
    ORDER BY count DESC, genre ASC
  `;
  return ok(res, rows.map((r: any) => ({
      name: r.genre,
      count: Number(r.count),
    })));
}));

// GET /api/mixes/trending - Trending mixes
router.get('/trending', asyncHandler(async (req, res) => {
  const { limit: limitNum } = parsePagination({ limit: req.query.limit }, { defaultLimit: 10, maxLimit: 20 });
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

  return ok(res, mixes);
}));

// POST /api/mixes/import-hearthis - Bulk import Hearthis.at track URLs for the authenticated DJ
router.post('/import-hearthis', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = importHearthisSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input');
  }

  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj && req.user.role !== 'ADMIN') {
    return fail(res, 403, 'Must be a DJ to import mixes');
  }

  const djId = dj ? dj.id : req.body.djId;
  if (!djId) {
    return fail(res, 400, 'DJ ID required');
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

          const mixTitle = resolved.title || 'Imported Mix';
          const slug = await generateUniqueMixSlug(prisma, djId, mixTitle);

          const mix = await prisma.mix.create({
            data: {
              title: mixTitle,
              slug,
              description: resolved.description || `Imported from Hearthis.at`,
              genre: resolved.genre || defaultGenre,
              category: defaultCategory,
              tags: resolved.tags && resolved.tags.length > 0 ? resolved.tags : undefined,
              djId,
              audioUrl: resolved.audioUrl,
              audioSource: resolved.audioSource,
              originalUrl,
              coverImage: resolved.coverImage || dj?.avatar || null,
              duration: resolved.duration,
              releaseDate: resolved.releaseDate,
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

      const mixTitle = resolved.title || 'Imported Mix';
      const slug = await generateUniqueMixSlug(prisma, djId, mixTitle);

      const mix = await prisma.mix.create({
        data: {
          title: mixTitle,
          slug,
          description: resolved.description || `Imported from Hearthis.at`,
          genre: resolved.genre || defaultGenre,
          category: defaultCategory,
          tags: resolved.tags && resolved.tags.length > 0 ? resolved.tags : undefined,
          djId,
          audioUrl: resolved.audioUrl,
          audioSource: resolved.audioSource,
          originalUrl: url,
          coverImage: resolved.coverImage || dj?.avatar || null,
          duration: resolved.duration,
          releaseDate: resolved.releaseDate,
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

  return ok(res, { imported, count: imported.length, errors, errorCount: errors.length });
}));

// GET /api/mixes/by-slug/:djIdentifier/:slug - Get mix by DJ identifier and mix slug
router.get('/by-slug/:djIdentifier/:slug', softAuthMiddleware, asyncHandler(async (req, res) => {
  const { djIdentifier, slug } = req.params;

  // 1. Try finding DJ first by username, id, or stageName
  const dj = await prisma.djProfile.findFirst({
    where: {
      OR: [
        { id: djIdentifier },
        { user: { username: { equals: djIdentifier, mode: 'insensitive' } } },
        { stageName: { equals: djIdentifier.replace(/-/g, ' '), mode: 'insensitive' } },
        { stageName: { equals: djIdentifier, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });

  let mix = null;
  if (dj) {
    mix = await prisma.mix.findFirst({
      where: {
        djId: dj.id,
        OR: [
          { slug: { equals: slug, mode: 'insensitive' } },
          { id: slug },
        ],
      },
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
  }

  // Fallback: search globally by slug/id
  if (!mix) {
    mix = await prisma.mix.findFirst({
      where: {
        OR: [
          { slug: { equals: slug, mode: 'insensitive' } },
          { id: slug },
        ],
      },
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
  }

  if (!mix) {
    return fail(res, 404, 'Mix not found');
  }

  // Private mixes are only visible to the owner or an admin
  if (!mix.isPublic) {
    const isOwner = req.user?.id && mix.dj?.user?.id === req.user.id;
    const isAdmin = req.user?.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return fail(res, 404, 'Mix not found');
    }
  }

  return ok(res, mix);
}));

// GET /api/mixes/:id - Get single mix (by ID or Slug)
router.get('/:id', softAuthMiddleware, asyncHandler(async (req, res) => {
  const identifier = req.params.id;
  const mix = await prisma.mix.findFirst({
    where: {
      OR: [
        { id: identifier },
        { slug: { equals: identifier, mode: 'insensitive' } },
      ],
    },
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
    return fail(res, 404, 'Mix not found');
  }

  // Private mixes are only visible to the owner or an admin
  if (!mix.isPublic) {
    const isOwner = req.user?.id && mix.dj?.user?.id === req.user.id;
    const isAdmin = req.user?.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return fail(res, 404, 'Mix not found');
    }
  }

  // Play tracking is handled by POST /:id/play to support dedup and analytics
  return ok(res, mix);
}));

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
      return fail(res, 404, 'Mix not found');
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

    return ok(res, {
        similar,
        moreFromDj,
      });
  } catch (error: any) {
    console.error('Error fetching mix recommendations:', error.message);
    return fail(res, 500, 'Failed to fetch recommendations');
  }
});

// POST /api/mixes - Create mix (auth required)
router.post('/', authMiddleware, requireTrialOrSubscription, uploadMix, asyncHandler(async (req, res) => {
  const parsed = createMixSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj && req.user.role !== 'ADMIN') {
    return fail(res, 403, 'Must be a DJ to upload mixes');
  }

  // Check upload limits for expired free tier
  const FREE_TIER_LIMIT = 5;
  const isPro = dj?.isPro || ['pro', 'legend'].includes(dj?.subscriptionTier || '');
  if (dj && !isPro && dj.totalMixes >= FREE_TIER_LIMIT) {
    const trial = req.trialStatus || calculateTrialStatus(req.user, dj);
    if (!trial.hasFeatureAccess) {
      return fail(res, 403, 'Free trial expired and upload limit reached. Upgrade to Pro to upload unlimited mixes.', { requiresUpgrade: true, requiresSubscription: true, trialStatus: trial });
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
      ext: extFromMime(audioFile.mimetype),
    });
    audioSource = 'upload';
  } else if (data.audioUrl) {
    const resolved = await resolveAudioUrl(data.audioUrl);
    if (!resolved) {
      return fail(res, 400, 'Unable to use this audio link. Please provide a direct audio file or a Hearthis.at link.');
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
    if ((!data.description || data.description.trim() === '') && resolved.description) {
      data.description = resolved.description;
    }
    if ((!data.title || data.title.trim() === '') && resolved.title) {
      data.title = resolved.title;
    }
  }
  if (coverFile) {
    const { buffer, contentType, ext } = await processMixCover(coverFile.buffer);
    coverUrl = await uploadBuffer(buffer, 'covers', { contentType, ext });
  }
  // Fallback to the artist's avatar when no cover art is provided
  if (!coverUrl) {
    coverUrl = dj?.avatar || req.user.avatar || null;
  }

  const maxOrder = await prisma.mix.aggregate({
    where: { djId },
    _max: { sortOrder: true },
  });
  const nextSortOrder = (maxOrder._max.sortOrder || 0) + 1;

  const slug = await generateUniqueMixSlug(prisma, djId, data.title || 'mix');

  const mix = await prisma.mix.create({
    data: {
      ...data,
      slug,
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
}));

// PUT /api/mixes/:id - Update mix
router.put('/:id', authMiddleware, uploadMix, asyncHandler(async (req, res) => {
  if (typeof req.body.tags === 'string') {
    try {
      req.body.tags = JSON.parse(req.body.tags);
    } catch {
      req.body.tags = req.body.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  if (typeof req.body.secondaryGenres === 'string') {
    try {
      req.body.secondaryGenres = JSON.parse(req.body.secondaryGenres);
    } catch {
      req.body.secondaryGenres = req.body.secondaryGenres
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }
  if (req.body.releaseDate === '' || req.body.releaseDate === 'null' || req.body.releaseDate === 'undefined') {
    req.body.releaseDate = null;
  }

  const parsed = updateMixSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const mix = await prisma.mix.findUnique({
    where: { id: req.params.id },
    include: { dj: true },
  });
  if (!mix) {
    return fail(res, 404, 'Mix not found');
  }

  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (mix.dj.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return fail(res, 403, 'Forbidden');
  }

  const updateData = { ...parsed.data };
  if (updateData.title && updateData.title !== mix.title) {
    updateData.slug = await generateUniqueMixSlug(prisma, mix.djId, updateData.title, mix.id);
  } else if (!mix.slug) {
    updateData.slug = await generateUniqueMixSlug(prisma, mix.djId, mix.title || 'mix', mix.id);
  }

  if (updateData.releaseDate) {
    try {
      const d = new Date(updateData.releaseDate);
      updateData.releaseDate = isNaN(d.getTime()) ? null : d;
    } catch {
      updateData.releaseDate = null;
    }
  }
  const audioFile = req.files?.audio?.[0];
  const coverFile = req.files?.coverImage?.[0] || req.files?.cover?.[0] || req.files?.coverFile?.[0];

  if (audioFile) {
    updateData.audioUrl = await uploadBuffer(audioFile.buffer, 'mixes', {
      contentType: audioFile.mimetype,
      ext: extFromMime(audioFile.mimetype),
    });
    updateData.audioSource = 'upload';
    updateData.originalUrl = null;
  } else if (updateData.audioUrl) {
    const originalAudioUrl = updateData.audioUrl;
    const resolved = await resolveAudioUrl(originalAudioUrl);
    if (!resolved) {
      return fail(res, 400, 'Unable to use this audio link. Please provide a direct audio file or a Hearthis.at link.');
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
    if ((!updateData.description || updateData.description.trim() === '') && resolved.description) {
      updateData.description = resolved.description;
    }
  }
  if (coverFile) {
    const { buffer, contentType, ext } = await processMixCover(coverFile.buffer);
    updateData.coverImage = await uploadBuffer(buffer, 'covers', { contentType, ext });
  } else if (updateData.coverImage === undefined) {
    // Retain the existing mix coverImage if not modified or replaced
    delete updateData.coverImage;
  } else if (updateData.coverImage === '' || updateData.coverImage === null) {
    // Fallback to artist avatar only when explicitly cleared
    updateData.coverImage = mix.dj?.avatar || req.user.avatar || null;
  }

  const updated = await prisma.mix.update({
    where: { id: req.params.id },
    data: updateData,
  });

  return ok(res, updated);
}));

// DELETE /api/mixes/:id - Delete mix
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const mix = await prisma.mix.findUnique({
    where: { id: req.params.id },
    include: { dj: true },
  });
  if (!mix) {
    return fail(res, 404, 'Mix not found');
  }
  if (mix.dj.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return fail(res, 403, 'Forbidden');
  }

  await prisma.mix.delete({ where: { id: req.params.id } });

  await prisma.djProfile.update({
    where: { id: mix.djId },
    data: { totalMixes: { decrement: 1 } },
  });

  return ok(res, { message: 'Mix deleted' });
}));

// POST /api/mixes/:id/like - Toggle like on a mix (deduped via MixLike join table)
router.post('/:id/like', authMiddleware, asyncHandler(async (req, res) => {
  const mixId = req.params.id;
  const userId = req.user.id;

  // Check if mix exists and belongs to a DJ
  const mix = await prisma.mix.findUnique({
    where: { id: mixId },
    select: { id: true, title: true, djId: true, dj: { select: { userId: true } } },
  });
  if (!mix) {
    return fail(res, 404, 'Mix not found');
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

    return ok(res, { liked: true, message: 'Mix liked' });
  } catch (createErr: any) {
    // P2002 = unique constraint violation -> already liked, so unlike instead
    if (createErr?.code === 'P2002') {
      try {
        await prisma.$transaction([
          prisma.mixLike.delete({ where: { mixId_userId: { mixId, userId } } }),
          prisma.mix.update({ where: { id: mixId }, data: { likes: { decrement: 1 } } }),
        ]);
        return ok(res, { liked: false, message: 'Mix unliked' });
      } catch (deleteErr: any) {
        // Record may have been deleted by another concurrent request
        if (deleteErr?.code === 'P2025') {
          return ok(res, { liked: false, message: 'Mix unliked' });
        }
        throw deleteErr;
      }
    }
    throw createErr;
  }
}));

// POST /api/mixes/:id/play - Track a play (call from the player, not on GET)
router.post('/:id/play', softAuthMiddleware, playLimiter, asyncHandler(async (req, res) => {
  const mix = await prisma.mix.findUnique({
    where: { id: req.params.id },
    select: { id: true, djId: true, plays: true },
  });
  if (!mix) {
    return fail(res, 404, 'Mix not found');
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

  return ok(res, { plays: updated.plays });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// RE-UPS (Pro+ only)
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/mixes/:id/reup - Re-up another DJ's mix
router.post('/:id/reup', authMiddleware, requirePro, asyncHandler(async (req, res) => {
  const mixId = req.params.id;
  const djId = req.djProfile.id;

  const mix = await prisma.mix.findUnique({
    where: { id: mixId },
    include: { dj: { select: { userId: true } } },
  });

  if (!mix) {
    return fail(res, 404, 'Mix not found');
  }

  if (!mix.isPublic) {
    return fail(res, 400, 'Cannot re-up a private mix');
  }

  if (mix.djId === djId) {
    return fail(res, 400, 'You cannot re-up your own mix');
  }

  if (mix.dj.userId === req.user.id) {
    return fail(res, 400, 'You cannot re-up your own mix');
  }

  const existing = await prisma.mixReup.findUnique({
    where: { djId_mixId: { djId, mixId } },
  });

  if (existing) {
    return fail(res, 409, 'You have already re-upped this mix');
  }

  const reup = await prisma.mixReup.create({
    data: { djId, mixId },
  });

  // Notify the original mix owner
  const reupper = await prisma.djProfile.findUnique({
    where: { id: djId },
    select: { stageName: true },
  });
  createNotification({
    userId: mix.dj.userId,
    type: 'MIX_REUPPED',
    title: 'Your mix was re-upped',
    body: `${reupper?.stageName || 'A DJ'} re-upped your mix "${mix.title || 'Untitled'}"`,
    actionUrl: `/mix/${mix.id}`,
    entityId: mix.id,
    entityType: 'MIX',
    sendEmail: true,
    emailSubject: 'Your mix was re-upped on Deck Salone',
    emailBody: `${reupper?.stageName || 'A DJ'} re-upped your mix "${mix.title || 'Untitled'}". View it here: https://decksalone.com/mix/${mix.id}`,
  }).catch(() => {});

  return res.status(201).json({ success: true, data: reup });
}));

// DELETE /api/mixes/:id/reup - Remove a re-up
router.delete('/:id/reup', authMiddleware, requirePro, asyncHandler(async (req, res) => {
  const mixId = req.params.id;
  const djId = req.djProfile.id;

  const existing = await prisma.mixReup.findUnique({
    where: { djId_mixId: { djId, mixId } },
  });

  if (!existing) {
    return fail(res, 404, 'Re-up not found');
  }

  await prisma.mixReup.delete({
    where: { djId_mixId: { djId, mixId } },
  });

  return ok(res, { reupped: false });
}));

// GET /api/mixes/:id/reup-status - Check if current DJ has re-upped this mix
router.get('/:id/reup-status', softAuthMiddleware, asyncHandler(async (req, res) => {
  const mixId = req.params.id;

  if (!req.user) {
    const count = await prisma.mixReup.count({ where: { mixId } });
    return ok(res, { reupped: false, count });
  }

  const dj = await prisma.djProfile.findUnique({
    where: { userId: req.user.id },
    select: { id: true, subscriptionTier: true },
  });

  if (!dj || dj.subscriptionTier === 'free') {
    const count = await prisma.mixReup.count({ where: { mixId } });
    return ok(res, { reupped: false, count });
  }

  const [reup, count] = await Promise.all([
    prisma.mixReup.findUnique({
      where: { djId_mixId: { djId: dj.id, mixId } },
    }),
    prisma.mixReup.count({ where: { mixId } }),
  ]);

  return ok(res, { reupped: !!reup, count });
}));

// POST /api/mixes/:id/repost - User reposts a mix
router.post('/:id/repost', authMiddleware, asyncHandler(async (req, res) => {
  const mixId = req.params.id;
  const userId = req.user.id;

  const mix = await prisma.mix.findUnique({
    where: { id: mixId },
    select: { id: true, isPublic: true },
  });

  if (!mix) {
    return fail(res, 404, 'Mix not found');
  }

  if (!mix.isPublic) {
    return fail(res, 400, 'Cannot repost a private mix');
  }

  await prisma.mixRepost.upsert({
    where: { mixId_userId: { mixId, userId } },
    create: { mixId, userId },
    update: {},
  });

  return res.json({ success: true, message: 'Mix reposted' });
}));

// DELETE /api/mixes/:id/repost - Remove a repost
router.delete('/:id/repost', authMiddleware, asyncHandler(async (req, res) => {
  const mixId = req.params.id;
  const userId = req.user.id;

  await prisma.mixRepost.deleteMany({
    where: { mixId, userId },
  });

  return res.json({ success: true, message: 'Repost removed' });
}));

// GET /api/mixes/:id/repost-status - Check if current user reposted a mix
router.get('/:id/repost-status', softAuthMiddleware, asyncHandler(async (req, res) => {
  const mixId = req.params.id;

  if (!req.user) {
    const count = await prisma.mixRepost.count({ where: { mixId } });
    return ok(res, { reposted: false, count });
  }

  const [repost, count] = await Promise.all([
    prisma.mixRepost.findUnique({
      where: { mixId_userId: { mixId, userId: req.user.id } },
    }),
    prisma.mixRepost.count({ where: { mixId } }),
  ]);

  return ok(res, { reposted: !!repost, count });
}));

// POST /api/mixes/:id/reactions - Toggle an emoji reaction on a mix
const reactionSchema = z.object({
  emoji: z.string().min(1).max(16),
});

router.post('/:id/reactions', authMiddleware, asyncHandler(async (req, res) => {
  const mixId = req.params.id;
  const userId = req.user.id;

  const parsed = reactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid reaction data', { details: parsed.error.flatten() });
  }
  const { emoji } = parsed.data;

  const mix = await prisma.mix.findUnique({
    where: { id: mixId },
    select: { id: true },
  });

  if (!mix) {
    return fail(res, 404, 'Mix not found');
  }

  const existing = await prisma.mixReaction.findUnique({
    where: { mixId_userId_emoji: { mixId, userId, emoji } },
  });

  if (existing) {
    await prisma.mixReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.mixReaction.create({ data: { mixId, userId, emoji } });
  }

  const [grouped, mine] = await Promise.all([
    prisma.mixReaction.groupBy({
      by: ['emoji'],
      where: { mixId },
      _count: { _all: true },
    }),
    prisma.mixReaction.findMany({
      where: { mixId, userId },
      select: { emoji: true },
    }),
  ]);
  const mineSet = new Set(mine.map((r: any) => r.emoji));

  const reactions = grouped.map((g: any) => ({
    emoji: g.emoji,
    count: g._count._all,
    reacted: mineSet.has(g.emoji),
  }));

  return ok(res, { reactions });
}));

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
      return fail(res, 403, 'DJ profile required');
    }

    const tier = (dj.subscriptionTier || 'free').toLowerCase();
    if (tier !== 'pro' && tier !== 'legend') {
      return fail(res, 403, 'Mix promotions and point boosts are exclusively available for Pro and Pro+ DJs.', { requiresUpgrade: true });
    }

    // Point pricing: 1 day = 100 pts, 3 days = 250 pts, 7 days = 500 pts
    let pointsCost = 100;
    if (durationDays >= 7) pointsCost = 500;
    else if (durationDays >= 3) pointsCost = 250;
    else pointsCost = Math.max(1, durationDays) * 100;

    if ((dj.promotionPoints || 0) < pointsCost) {
      return fail(res, 400, `Insufficient promotion points. You have ${dj.promotionPoints || 0} pts, but this boost requires ${pointsCost} pts.`, { requiredPoints: pointsCost, currentPoints: dj.promotionPoints || 0 });
    }

    const mix = await prisma.mix.findUnique({
      where: { id: mixId },
      select: { id: true, djId: true, title: true, promotedUntil: true },
    });

    if (!mix) {
      return fail(res, 404, 'Mix not found');
    }

    if (mix.djId !== dj.id && req.user.role !== 'ADMIN') {
      return fail(res, 403, 'You can only promote your own mixes');
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

    return ok(res, {
        promotedUntil: updatedMix.promotedUntil,
        remainingPoints: updatedDj.promotionPoints,
        pointsSpent: pointsCost,
      }, `"${mix.title}" is now boosted and promoted until ${newExpiry.toLocaleDateString()}!`);
  } catch (error) {
    console.error('[Mix Promote API] Error:', error);
    return fail(res, 500, 'Internal server error');
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
      return fail(res, 404, 'Mix not found');
    }

    if (!mix.audioUrl) {
      return fail(res, 400, 'No audio file available for this mix.');
    }

    // Require authentication and check download permissions
    if (!req.user) {
      return fail(res, 401, 'Please log in to download mixes.', { requiresAuth: true });
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
    return fail(res, 500, 'Internal server error');
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
      return fail(res, 404, 'Mix not found');
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
          _count: { select: { likes: true } },
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
              _count: { select: { likes: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mixComment.count({ where: { mixId } }),
    ]);

    let likedCommentIds = new Set<string>();
    if (req.user?.id) {
      const likes = await prisma.mixCommentLike.findMany({
        where: {
          userId: req.user.id,
          commentId: { in: comments.flatMap((c: any) => [c.id, ...(c.replies || []).map((r: any) => r.id)]) },
        },
        select: { commentId: true },
      });
      likedCommentIds = new Set(likes.map((l: any) => l.commentId));
    }

    const mapComment = (c: any) => ({
      ...c,
      likeCount: c._count?.likes || 0,
      isLiked: likedCommentIds.has(c.id),
      isDjCreator: Boolean(djUserId && c.userId === djUserId),
      replies: (c.replies || []).map((r: any) => ({
        ...r,
        likeCount: r._count?.likes || 0,
        isLiked: likedCommentIds.has(r.id),
        isDjCreator: Boolean(djUserId && r.userId === djUserId),
      })),
    });

    const formattedComments = comments.map(mapComment);

    return ok(res, {
        comments: formattedComments,
        total,
      });
  } catch (error) {
    console.error('[Mix Comments API] Error fetching comments:', error);
    return fail(res, 500, 'Internal server error');
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
      return fail(res, 400, parsed.error.issues[0]?.message || 'Invalid comment input');
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
      return fail(res, 404, 'Mix not found');
    }

    if (parentId) {
      const parentComment = await prisma.mixComment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.mixId !== mixId) {
        return fail(res, 404, 'Parent comment not found');
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

    const authorName = comment.user?.djProfile?.stageName || comment.user?.name || comment.user?.username || 'A user';

    // Notify mix creator if someone else commented on their mix
    if (mix.dj?.userId && mix.dj.userId !== userId) {
      createNotification({
        userId: mix.dj.userId,
        type: 'MIX_COMMENTED',
        title: 'New Comment on Your Mix',
        body: `${authorName} commented on "${mix.title || 'your mix'}"`,
        actionUrl: `/mixes/${mix.id}#comments`,
        entityId: mix.id,
        entityType: 'mix',
        sendEmail: true,
        emailSubject: 'New comment on your mix',
        emailBody: `${authorName} commented on your mix "${mix.title || 'your mix'}". View it here: https://decksalone.com/mixes/${mix.id}#comments`,
      }).catch((err: any) => console.error('[Mix Comments Notification Error]:', err));
    }

    // Notify parent comment author when someone replies to their comment
    if (parentId) {
      const parentComment = await prisma.mixComment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      if (parentComment && parentComment.userId !== userId) {
        createNotification({
          userId: parentComment.userId,
          type: 'MIX_COMMENTED',
          title: 'New Reply to Your Comment',
          body: `${authorName} replied to your comment on "${mix.title || 'a mix'}"`,
          actionUrl: `/mixes/${mix.id}#comments`,
          entityId: mix.id,
          entityType: 'mix',
          sendEmail: true,
          emailSubject: 'New reply to your comment',
          emailBody: `${authorName} replied to your comment on "${mix.title || 'a mix'}". View it here: https://decksalone.com/mixes/${mix.id}#comments`,
        }).catch((err: any) => console.error('[Comment Reply Notification Error]:', err));
      }
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
    return fail(res, 500, 'Internal server error');
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
      return fail(res, 404, 'Comment not found');
    }

    const isAuthor = comment.userId === userId;
    const isDjCreator = comment.mix?.dj?.userId === userId;
    const isStaff = ['ADMIN', 'MODERATOR'].includes(req.user.role || '');

    if (!isAuthor && !isDjCreator && !isStaff) {
      return fail(res, 403, 'You are not authorized to delete this comment');
    }

    await prisma.mixComment.delete({
      where: { id: commentId },
    });

    return res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('[Mix Comments API] Error deleting comment:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/mixes/:id/comments/:commentId/like - Toggle like on a comment
router.post('/:id/comments/:commentId/like', authMiddleware, async (req: any, res: any) => {
  try {
    const { id: mixId, commentId } = req.params;
    const userId = req.user.id;

    const comment = await prisma.mixComment.findUnique({
      where: { id: commentId },
      select: { id: true, mixId: true, userId: true },
    });

    if (!comment || comment.mixId !== mixId) {
      return fail(res, 404, 'Comment not found');
    }

    const existingLike = await prisma.mixCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existingLike) {
      await prisma.mixCommentLike.delete({
        where: { id: existingLike.id },
      });
      return ok(res, { liked: false });
    }

    await prisma.mixCommentLike.create({
      data: { commentId, userId },
    });

    // Notify comment author (not self)
    if (comment.userId !== userId) {
      const liker = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, username: true, djProfile: { select: { stageName: true } } },
      });
      const likerName = liker?.djProfile?.stageName || liker?.name || liker?.username || 'A user';
      createNotification({
        userId: comment.userId,
        type: 'COMMENT_LIKED',
        title: 'New Like on Your Comment',
        body: `${likerName} liked your comment`,
        actionUrl: `/mixes/${mixId}#comments`,
        entityId: mixId,
        entityType: 'mix',
        sendEmail: true,
        emailSubject: 'New like on your comment',
        emailBody: `${likerName} liked your comment. View it here: https://decksalone.com/mixes/${mixId}#comments`,
      }).catch((err: any) => console.error('[Comment Like Notification Error]:', err));
    }

    return ok(res, { liked: true });
  } catch (error) {
    console.error('[Mix Comments API] Error toggling comment like:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
