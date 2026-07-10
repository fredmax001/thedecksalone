const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { requirePro } = require('../middleware/permissions');

const router = express.Router();

const createSetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  genre: z.string().max(100).optional(),
  coverImage: z.string().optional(),
  isPublic: z.coerce.boolean().optional(),
});

const updateSetSchema = createSetSchema.partial();

const setItemSchema = z.object({
  mixId: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
});

// GET /api/sets/:id - Get a single set (public if set is public)
router.get('/:id', async (req, res) => {
  try {
    const set = await prisma.djSet.findUnique({
      where: { id: req.params.id },
      include: {
        dj: { select: { id: true, stageName: true, avatar: true, username: true } },
        items: {
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

    if (!set.isPublic) {
      return res.status(403).json({ success: false, error: 'This set is private' });
    }

    return res.json({
      success: true,
      data: {
        ...set,
        mixCount: set.items.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sets - Create a new set (Pro+ only)
router.post('/', authMiddleware, requirePro, async (req, res) => {
  try {
    const parsed = createSetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const djId = req.djProfile.id;
    const set = await prisma.djSet.create({
      data: { ...parsed.data, djId },
    });

    return res.status(201).json({ success: true, data: set });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/sets/:id - Update set metadata (owner/admin only)
router.put('/:id', authMiddleware, requirePro, async (req, res) => {
  try {
    const parsed = updateSetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const set = await prisma.djSet.findUnique({ where: { id: req.params.id } });
    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    if (set.djId !== req.djProfile.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updated = await prisma.djSet.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sets/:id - Delete a set (owner/admin only)
router.delete('/:id', authMiddleware, requirePro, async (req, res) => {
  try {
    const set = await prisma.djSet.findUnique({ where: { id: req.params.id } });
    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    if (set.djId !== req.djProfile.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.djSet.delete({ where: { id: req.params.id } });
    return res.json({ success: true, data: { message: 'Set deleted' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sets/:id/mixes - Add a mix to a set
router.post('/:id/mixes', authMiddleware, requirePro, async (req, res) => {
  try {
    const parsed = setItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const set = await prisma.djSet.findUnique({ where: { id: req.params.id } });
    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    if (set.djId !== req.djProfile.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const djId = req.djProfile.id;
    const { mixId, sortOrder = 0 } = parsed.data;

    const mix = await prisma.mix.findUnique({ where: { id: mixId } });
    if (!mix) {
      return res.status(404).json({ success: false, error: 'Mix not found' });
    }

    if (!mix.isPublic) {
      return res.status(400).json({ success: false, error: 'Cannot add a private mix to a set' });
    }

    // DJs can only add their own mixes or mixes they have re-upped
    const canAdd = mix.djId === djId || !!(await prisma.mixReup.findUnique({
      where: { djId_mixId: { djId, mixId } },
    }));

    if (!canAdd) {
      return res.status(403).json({ success: false, error: 'You can only add your own mixes or mixes you have re-upped' });
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
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sets/:id/mixes/:mixId - Remove a mix from a set
router.delete('/:id/mixes/:mixId', authMiddleware, requirePro, async (req, res) => {
  try {
    const set = await prisma.djSet.findUnique({ where: { id: req.params.id } });
    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    if (set.djId !== req.djProfile.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const item = await prisma.djSetItem.findUnique({
      where: { setId_mixId: { setId: req.params.id, mixId: req.params.mixId } },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Mix not found in this set' });
    }

    await prisma.djSetItem.delete({
      where: { setId_mixId: { setId: req.params.id, mixId: req.params.mixId } },
    });

    return res.json({ success: true, data: { removed: true } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/sets/:id/reorder - Reorder items in a set
router.put('/:id/reorder', authMiddleware, requirePro, async (req, res) => {
  try {
    const set = await prisma.djSet.findUnique({ where: { id: req.params.id } });
    if (!set) {
      return res.status(404).json({ success: false, error: 'Set not found' });
    }

    if (set.djId !== req.djProfile.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    await prisma.$transaction(
      items.map((item: any) =>
        prisma.djSetItem.updateMany({
          where: { setId: req.params.id, mixId: item.mixId },
          data: { sortOrder: Number(item.sortOrder) || 0 },
        })
      )
    );

    const updated = await prisma.djSet.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
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

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
