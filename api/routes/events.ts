const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { uploadEventImage } = require('../utils/upload');
const { processEventImage } = require('../utils/imageProcessor');
const { uploadBuffer } = require('../utils/storage');

const router = express.Router();

const eventFilterSchema = z.object({
  city: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  isOpenSlot: z.string().optional(),
  djId: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.string().min(1).max(100),
  date: z.string().datetime(),
  location: z.string().min(1).max(500),
  city: z.string().max(100).optional(),
  venue: z.string().max(200).optional(),
  isOpenSlot: z.boolean().optional(),
  slots: z.number().int().min(0).optional(),
  compensation: z.number().min(0).optional(),
  requirements: z.string().optional(),
  status: z.string().optional(),
  ticketUrl: z.string().url().optional().or(z.literal('')),
  // Sound It Salone integration
  soundItSaloneEventId: z.string().optional(),
  soundItSaloneUrl: z.string().url().optional().or(z.literal('')),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.string().min(1).max(100).optional(),
  date: z.string().datetime().optional(),
  location: z.string().min(1).max(500).optional(),
  city: z.string().max(100).optional(),
  venue: z.string().max(200).optional(),
  isOpenSlot: z.boolean().optional(),
  slots: z.number().int().min(0).optional(),
  filledSlots: z.number().int().min(0).optional(),
  compensation: z.number().min(0).optional(),
  requirements: z.string().optional(),
  status: z.string().optional(),
  ticketUrl: z.string().url().optional().or(z.literal('')),
  soundItSaloneEventId: z.string().optional(),
  soundItSaloneUrl: z.string().url().optional().or(z.literal('')),
  isSyncedToSalone: z.boolean().optional(),
});

// GET /api/events - List events
router.get('/', async (req, res) => {
  try {
    const parsed = eventFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { city, type, status, isOpenSlot, djId, search, page, limit } = parsed.data;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (type) where.type = { equals: type, mode: 'insensitive' };
    if (status) where.status = status;
    if (isOpenSlot === 'true') where.isOpenSlot = true;
    if (djId) where.djId = djId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { date: 'asc' },
        skip,
        take: limitNum,
        include: {
          dj: { select: { id: true, stageName: true, avatar: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return res.json({
      success: true,
      data: events,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/types - Get event types
router.get('/types', async (req, res) => {
  try {
    const types = [
      { id: 'club-night', name: 'Club Night' },
      { id: 'festival', name: 'Festival' },
      { id: 'private-party', name: 'Private Party' },
      { id: 'wedding', name: 'Wedding' },
      { id: 'corporate', name: 'Corporate Event' },
      { id: 'open-slot', name: 'Open DJ Slot' },
    ];
    return res.json({ success: true, data: types });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/:id - Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        dj: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    return res.json({ success: true, data: event });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events - Create event (auth required)
router.post('/', authMiddleware, uploadEventImage.single('image'), async (req, res) => {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const isAdmin = req.user.role === 'ADMIN';
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Only DJs or admins can create events' });
    }
    const djId = isAdmin ? req.body.djId || null : dj.id;

    const data = parsed.data;

    let imageUrl = null;
    if (req.file) {
      const { buffer, contentType, ext } = await processEventImage(req.file.buffer);
      imageUrl = await uploadBuffer(buffer, 'events', { contentType, ext });
    }

    const event = await prisma.event.create({
      data: {
        ...data,
        djId,
        date: new Date(data.date),
        image: imageUrl,
      },
    });

    if (djId) {
      await prisma.djProfile.update({
        where: { id: djId },
        data: { totalEvents: { increment: 1 } },
      });
    }

    return res.status(201).json({ success: true, data: event });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/events/:id - Update event
router.put('/:id', authMiddleware, uploadEventImage.single('image'), async (req, res) => {
  try {
    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const isAdmin = req.user.role === 'ADMIN';
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    const isOwner = dj && event.djId && event.djId === dj.id;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updateData = { ...parsed.data };
    if (req.file) {
      const { buffer, contentType, ext } = await processEventImage(req.file.buffer);
      updateData.image = await uploadBuffer(buffer, 'events', { contentType, ext });
    }
    if (parsed.data.date) {
      updateData.date = new Date(parsed.data.date);
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/events/:id - Delete event
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const isAdmin = req.user.role === 'ADMIN';
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    const isOwner = dj && event.djId && event.djId === dj.id;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.event.delete({ where: { id: req.params.id } });

    if (event.djId) {
      await prisma.djProfile.update({
        where: { id: event.djId },
        data: { totalEvents: { decrement: 1 } },
      });
    }

    return res.json({ success: true, data: { message: 'Event deleted' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/sync-to-salone - Mark event as synced to Sound It Salone
router.post('/:id/sync-to-salone', authMiddleware, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const isAdmin = req.user.role === 'ADMIN';
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    const isOwner = dj && event.djId && event.djId === dj.id;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { soundItSaloneEventId, soundItSaloneUrl } = req.body;

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        isSyncedToSalone: true,
        soundItSaloneEventId: soundItSaloneEventId || null,
        soundItSaloneUrl: soundItSaloneUrl || null,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
