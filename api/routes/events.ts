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
  soundItSaloneEventId: z.string().optional(),
  soundItSaloneUrl: z.string().url().optional().or(z.literal('')),
  // Pro+ Ticketing
  isTicketed: z.boolean().optional(),
  ticketPrice: z.number().min(0).optional(),
  ticketCurrency: z.string().optional(),
  mobileMoneyNumber: z.string().optional(),
  mobileMoneyProvider: z.string().optional(),
  totalTickets: z.number().int().min(1).optional(),
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
  // Pro+ Ticketing
  isTicketed: z.boolean().optional(),
  ticketPrice: z.number().min(0).optional(),
  ticketCurrency: z.string().optional(),
  mobileMoneyNumber: z.string().optional(),
  mobileMoneyProvider: z.string().optional(),
  totalTickets: z.number().int().min(1).optional(),
});

const applySchema = z.object({
  message: z.string().max(2000).optional(),
});

const updateApplicationSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED']),
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
router.get('/:id', async (req: any, res: any) => {
  try {
    const userId = req.user?.id || null;
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        dj: { select: { id: true, stageName: true, avatar: true, subscriptionTier: true } },
        gallery: { orderBy: { sortOrder: 'asc' } },
        rsvps: { select: { userId: true } },
        _count: { select: { rsvps: true, eventTickets: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // If user is logged in, check their RSVP status and ticket
    let userRsvp = null;
    let userTicket = null;
    if (userId) {
      [userRsvp, userTicket] = await Promise.all([
        prisma.eventRSVP.findUnique({ where: { eventId_userId: { eventId: req.params.id, userId } } }),
        prisma.eventTicket.findFirst({
          where: { eventId: req.params.id, userId, status: { not: 'declined' } },
          select: { id: true, status: true, qrCode: true, paymentScreenshot: true, amount: true, currency: true, createdAt: true },
        }),
      ]);
    }

    return res.json({ success: true, data: { ...event, userRsvp: !!userRsvp, userTicket } });
  } catch (error: any) {
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
    if (!isAdmin && dj?.subscriptionTier === 'free') {
      return res.status(403).json({ success: false, error: 'Event creation requires a Pro subscription' });
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

// POST /api/events/:id/apply - DJ applies to an event
router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (!event.isOpenSlot) {
      return res.status(400).json({ success: false, error: 'This event is not accepting applications' });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return res.status(403).json({ success: false, error: 'DJ profile required to apply' });
    }

    // Check if already applied
    const existing = await prisma.eventApplication.findUnique({
      where: { eventId_djId: { eventId: req.params.id, djId: dj.id } },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'You have already applied to this event' });
    }

    const application = await prisma.eventApplication.create({
      data: {
        eventId: req.params.id,
        djId: dj.id,
        message: parsed.data.message || null,
        status: 'PENDING',
      },
    });

    return res.status(201).json({ success: true, data: application });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/:id/applications - Get applications for an event (admin/organizer only)
router.get('/:id/applications', authMiddleware, async (req, res) => {
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

    const applications = await prisma.eventApplication.findMany({
      where: { eventId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        dj: { select: { id: true, stageName: true, avatar: true, city: true, verified: true } },
      },
    });

    return res.json({ success: true, data: applications });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/events/:id/applications/:appId - Update application status (admin/organizer only)
router.patch('/:id/applications/:appId', authMiddleware, async (req: any, res: any) => {
  try {
    const parsed = updateApplicationSchema.safeParse(req.body);
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

    const application = await prisma.eventApplication.findUnique({
      where: { id: req.params.appId },
    });
    if (!application || application.eventId !== req.params.id) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const updated = await prisma.eventApplication.update({
      where: { id: req.params.appId },
      data: { status: parsed.data.status },
    });

    // If accepted, increment filledSlots and link DJ to event
    if (parsed.data.status === 'ACCEPTED') {
      await prisma.event.update({
        where: { id: req.params.id },
        data: { filledSlots: { increment: 1 } },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/events/:id/rsvp ───────────────────────────────────────────────
router.post('/:id/rsvp', authMiddleware, async (req: any, res: any) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (new Date(event.date) < new Date()) return res.status(400).json({ success: false, error: 'Cannot RSVP to a past event' });

    const existing = await prisma.eventRSVP.findUnique({
      where: { eventId_userId: { eventId: req.params.id, userId: req.user.id } },
    });

    if (existing) {
      // Toggle off (un-RSVP)
      await prisma.eventRSVP.delete({ where: { eventId_userId: { eventId: req.params.id, userId: req.user.id } } });
      return res.json({ success: true, data: { rsvped: false } });
    }

    await prisma.eventRSVP.create({ data: { eventId: req.params.id, userId: req.user.id } });
    return res.json({ success: true, data: { rsvped: true } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/events/:id/gallery ────────────────────────────────────────────
// DJ uploads gallery photos for a past event
const multerGallery = require('multer');
const uploadGallery = multerGallery({ storage: multerGallery.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.post('/:id/gallery', authMiddleware, uploadGallery.array('photos', 20), async (req: any, res: any) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    const isAdmin = req.user.role === 'ADMIN';
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    const isOwner = dj && event.djId && event.djId === dj.id;
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });

    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, error: 'No photos uploaded' });

    const { uploadBuffer } = require('../utils/storage');
    const existing = await prisma.eventPhoto.count({ where: { eventId: req.params.id } });

    const photos = await Promise.all(
      req.files.map(async (file: any, i: number) => {
        const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
        const url = await uploadBuffer(file.buffer, 'events/gallery', { contentType: file.mimetype, ext });
        return prisma.eventPhoto.create({
          data: { eventId: req.params.id, url, caption: req.body.captions?.[i] || null, sortOrder: existing + i },
        });
      })
    );

    return res.status(201).json({ success: true, data: photos });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── DELETE /api/events/:id/gallery/:photoId ─────────────────────────────────
router.delete('/:id/gallery/:photoId', authMiddleware, async (req: any, res: any) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    const isAdmin = req.user.role === 'ADMIN';
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!isAdmin && (!dj || event.djId !== dj.id)) return res.status(403).json({ success: false, error: 'Forbidden' });
    await prisma.eventPhoto.delete({ where: { id: req.params.photoId } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
