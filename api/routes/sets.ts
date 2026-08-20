const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { uploadCover } = require('../utils/upload');
const { uploadBuffer } = require('../utils/storage');
const { requireTrialOrSubscription } = require('../utils/trial');

const router = express.Router();

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

const createSetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  genre: z.string().max(100).optional(),
  coverImage: z.string().optional(),
  isPublic: parseBooleanOptional,
});

const updateSetSchema = createSetSchema.partial();

const setItemSchema = z.object({
  mixId: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
});

// Helper middleware: Ensure user is a DJ and attach djProfile
async function requireDjProfile(req: any, res: any, next: any) {
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

// GET /api/sets/mine - Get all sets for the currently logged-in DJ
router.get('/mine', authMiddleware, requireDjProfile, async (req: any, res: any) => {
  try {
    const djId = req.djProfile.id;
    const sets = await prisma.djSet.findMany({
      where: { djId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            mix: {
              select: {
                id: true,
                title: true,
                genre: true,
                coverImage: true,
                audioUrl: true,
                duration: true,
                plays: true,
                likes: true,
              },
            },
          },
        },
      },
    });

    const formatted = sets.map((s: any) => ({
      ...s,
      mixCount: s.items.length,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sets/dj/:djId - Get public sets for a DJ profile
router.get('/dj/:djId', async (req: any, res: any) => {
  try {
    const sets = await prisma.djSet.findMany({
      where: { djId: req.params.djId, isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          where: {
            mix: { isPublic: true },
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            mix: {
              select: {
                id: true,
                title: true,
                genre: true,
                coverImage: true,
                audioUrl: true,
                duration: true,
                plays: true,
                likes: true,
                dj: { select: { id: true, stageName: true, avatar: true } },
              },
            },
          },
        },
      },
    });

    const formatted = sets.map((s: any) => ({
      ...s,
      mixCount: s.items.length,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sets/:id - Get a single set
router.get('/:id', async (req: any, res: any) => {
  try {
    const set = await prisma.djSet.findUnique({
      where: { id: req.params.id },
      include: {
        dj: { select: { id: true, stageName: true, avatar: true, username: true } },
        items: {
          where: {
            mix: { isPublic: true },
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            mix: {
              include: {
                dj: { select: { id: true, stageName: true, avatar: true, city: true } },
              },
            },
          },
        },
      },
    });

    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    return res.json({
      success: true,
      data: {
        ...set,
        mixCount: set.items.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sets - Create a new set (supports coverImage URL or coverImageFile upload)
router.post('/', authMiddleware, requireTrialOrSubscription, requireDjProfile, uploadCover.single('coverImageFile'), async (req: any, res: any) => {
  try {
    let coverImage = req.body.coverImage;
    if (req.file) {
      const ext = req.file.originalname.split('.').pop() || 'jpg';
      coverImage = await uploadBuffer(req.file.buffer, 'covers', { contentType: req.file.mimetype, ext });
    }

    const payload = {
      title: req.body.title,
      description: req.body.description || undefined,
      genre: req.body.genre || undefined,
      coverImage: coverImage || undefined,
      isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
    };

    const parsed = createSetSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input parameters' });
    }

    const djId = req.djProfile.id;
    const set = await prisma.djSet.create({
      data: { ...parsed.data, djId },
    });

    return res.status(201).json({ success: true, data: set });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/sets/:id - Update set metadata (supports file upload)
router.put('/:id', authMiddleware, requireDjProfile, uploadCover.single('coverImageFile'), async (req: any, res: any) => {
  try {
    const set = await prisma.djSet.findUnique({ where: { id: req.params.id } });
    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    if (set.djId !== req.djProfile.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    let coverImage = req.body.coverImage;
    if (req.file) {
      const ext = req.file.originalname.split('.').pop() || 'jpg';
      coverImage = await uploadBuffer(req.file.buffer, 'covers', { contentType: req.file.mimetype, ext });
    }

    const payload = {
      title: req.body.title,
      description: req.body.description,
      genre: req.body.genre,
      coverImage: coverImage || set.coverImage,
      isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
    };

    const parsed = updateSetSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input parameters' });
    }

    const updated = await prisma.djSet.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sets/:id - Delete a set
router.delete('/:id', authMiddleware, requireDjProfile, async (req: any, res: any) => {
  try {
    const set = await prisma.djSet.findUnique({ where: { id: req.params.id } });
    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    if (set.djId !== req.djProfile.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.djSetItem.deleteMany({ where: { setId: req.params.id } });
    await prisma.djSet.delete({ where: { id: req.params.id } });

    return res.json({ success: true, data: { message: 'Set deleted' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sets/:id/mixes - Add a mix to a set
router.post('/:id/mixes', authMiddleware, requireDjProfile, async (req: any, res: any) => {
  try {
    const parsed = setItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input parameters' });
    }

    const set = await prisma.djSet.findUnique({ where: { id: req.params.id } });
    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    if (set.djId !== req.djProfile.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { mixId, sortOrder = 0 } = parsed.data;

    // Prevent duplicates
    const existingItem = await prisma.djSetItem.findFirst({
      where: { setId: req.params.id, mixId },
    });
    if (existingItem) {
      return res.status(409).json({ success: false, error: 'Mix is already in this set' });
    }

    const item = await prisma.djSetItem.create({
      data: { setId: req.params.id, mixId, sortOrder },
      include: {
        mix: {
          include: {
            dj: { select: { id: true, stageName: true, avatar: true, city: true } },
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sets/:id/mixes/:mixId - Remove a mix from a set
router.delete('/:id/mixes/:mixId', authMiddleware, requireDjProfile, async (req: any, res: any) => {
  try {
    const set = await prisma.djSet.findUnique({ where: { id: req.params.id } });
    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    if (set.djId !== req.djProfile.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.djSetItem.deleteMany({
      where: { setId: req.params.id, mixId: req.params.mixId },
    });

    return res.json({ success: true, data: { removed: true } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/sets/:id/reorder - Reorder items in a DJ set
router.put('/:id/reorder', authMiddleware, requireDjProfile, async (req: any, res: any) => {
  try {
    const set = await prisma.djSet.findUnique({ where: { id: req.params.id } });
    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    if (set.djId !== req.djProfile.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { itemIds } = req.body; // array of djSetItem IDs in desired order
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ success: false, error: 'itemIds array required' });
    }

    const updates = itemIds.map((itemId: string, index: number) =>
      prisma.djSetItem.update({
        where: { id: itemId },
        data: { sortOrder: index },
      })
    );

    await prisma.$transaction(updates);

    return res.json({ success: true, message: 'Set reordered successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
