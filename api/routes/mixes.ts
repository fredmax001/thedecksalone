const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, softAuthMiddleware } = require('../middleware/auth');
const { requirePro } = require('../middleware/permissions');
const { recordMixPlay, recalculateMonthlyListeners } = require('../utils/monthlyListeners');
const { uploadMix } = require('../utils/upload');
const { uploadBuffer } = require('../utils/storage');
const { processCover } = require('../utils/imageProcessor');
const { withCache, clearCache } = require('../utils/cache');
const { resolveAudioUrl, resolveHearthisSet } = require('../utils/audioResolver');

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

const createMixSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  genre: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  tags: z.array(z.string()).optional(),
  duration: z.number().int().min(1).optional(),
  isPublic: z.coerce.boolean().optional(),
  audioUrl: z.string().optional(),
});

const updateMixSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  genre: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  tags: z.array(z.string()).optional(),
  duration: z.number().int().min(1).optional(),
  isPublic: z.coerce.boolean().optional(),
  audioUrl: z.string().optional(),
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
    console.error('[Mixes API] Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
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
        dj: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    return res.json({ success: true, data: mixes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/mixes/import-hearthis - Bulk import Hearthis.at track URLs for the authenticated DJ
router.post('/import-hearthis', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Must be a DJ to import mixes' });
    }

    const djId = dj ? dj.id : req.body.djId;
    if (!djId) {
      return res.status(400).json({ success: false, error: 'DJ ID required' });
    }

    const rawUrls = req.body.urls;
    if (!rawUrls || (Array.isArray(rawUrls) && rawUrls.length === 0)) {
      return res.status(400).json({ success: false, error: 'No URLs provided' });
    }

    const urls = Array.isArray(rawUrls)
      ? rawUrls.map((u) => String(u).trim()).filter(Boolean)
      : String(rawUrls)
          .split(/\n/)
          .map((u) => u.trim())
          .filter(Boolean);

    const defaultGenre = String(req.body.defaultGenre || 'Open Format').slice(0, 100);
    const defaultCategory = String(req.body.defaultCategory || 'Salone Mix').slice(0, 100);
    const isPublic = req.body.isPublic !== false;

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

    // Play tracking is handled by POST /:id/play to support dedup and analytics
    return res.json({ success: true, data: mix });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/mixes - Create mix (auth required)
router.post('/', authMiddleware, uploadMix, async (req, res) => {
  try {
    const parsed = createMixSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Must be a DJ to upload mixes' });
    }

    // Check upload limits
    const FREE_TIER_LIMIT = 5;
    if (dj && dj.subscriptionTier === 'free' && dj.totalMixes >= FREE_TIER_LIMIT) {
      return res.status(403).json({ 
        success: false, 
        error: 'Upload limit reached. Upgrade to Pro to upload unlimited mixes.',
        requiresUpgrade: true 
      });
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
            'Unable to use this audio link. Please provide a direct audio file, Audiomack, or Hearthis.at link.',
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
    return res.status(500).json({ success: false, error: error.message });
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
            'Unable to use this audio link. Please provide a direct audio file, Audiomack, or Hearthis.at link.',
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/mixes/:id/play - Track a play (call from the player, not on GET)
router.post('/:id/play', softAuthMiddleware, async (req, res) => {
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
    return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
