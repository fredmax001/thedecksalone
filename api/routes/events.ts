const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { prisma, DJ_PUBLIC_SELECT } = require('../utils/prisma');
const { authMiddleware, softAuthMiddleware } = require('../middleware/auth');
const { uploadEventImage } = require('../utils/upload');
const { processEventImage } = require('../utils/imageProcessor');
const { uploadBuffer } = require('../utils/storage');
const { parsePagination } = require('../utils/pagination');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../middleware/asyncHandler');

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

const parseBooleanOptional = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
  }
  return undefined;
}, z.boolean().optional());

const parseNumberOptional = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  if (typeof val === 'string') {
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}, z.number().optional());

const parseDateOptional = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}, z.date().optional());

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  type: z.string().min(1).max(100),
  date: z.preprocess((val) => {
    if (val instanceof Date) return val;
    if (typeof val === 'string') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  }, z.date()),
  endDate: parseDateOptional.nullable(),
  location: z.string().min(1).max(500),
  city: z.string().max(100).optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  googleMapsUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  organizerName: z.string().max(200).optional().nullable(),
  organizerContact: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  musicGenre: z.string().max(100).optional().nullable(),
  ageRestriction: z.string().max(100).optional().nullable(),
  capacity: parseNumberOptional.nullable(),
  refundPolicy: z.string().max(2000).optional().nullable(),
  termsConditions: z.string().max(5000).optional().nullable(),
  ticketSaleStartsAt: parseDateOptional.nullable(),
  ticketSaleEndsAt: parseDateOptional.nullable(),
  isOpenSlot: parseBooleanOptional,
  slots: parseNumberOptional,
  compensation: parseNumberOptional.nullable(),
  requirements: z.string().max(2000).optional().nullable(),
  status: z.string().optional(),
  publishStatus: z.string().optional(),
  approvalMode: z.string().optional(),
  ticketUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  soundItSaloneEventId: z.string().optional().nullable(),
  soundItSaloneUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  // Pro+ Ticketing
  isTicketed: parseBooleanOptional,
  ticketPrice: parseNumberOptional.nullable(),
  ticketCurrency: z.string().optional().nullable(),
  mobileMoneyNumber: z.string().optional().nullable(),
  mobileMoneyProvider: z.string().optional().nullable(),
  totalTickets: parseNumberOptional.nullable(),
  ticketSalesClosed: parseBooleanOptional,
  showRemainingTickets: parseBooleanOptional,
  onsiteUsername: z.string().max(100).optional().nullable(),
  onsitePassword: z.string().max(200).optional().nullable(),
  eventCode: z.string().max(50).optional().nullable(),
  djId: z.string().optional().nullable(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  type: z.string().min(1).max(100).optional(),
  date: parseDateOptional,
  endDate: parseDateOptional.nullable(),
  location: z.string().min(1).max(500).optional(),
  city: z.string().max(100).optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  googleMapsUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  organizerName: z.string().max(200).optional().nullable(),
  organizerContact: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  musicGenre: z.string().max(100).optional().nullable(),
  ageRestriction: z.string().max(100).optional().nullable(),
  capacity: parseNumberOptional.nullable(),
  refundPolicy: z.string().max(2000).optional().nullable(),
  termsConditions: z.string().max(5000).optional().nullable(),
  ticketSaleStartsAt: parseDateOptional.nullable(),
  ticketSaleEndsAt: parseDateOptional.nullable(),
  isOpenSlot: parseBooleanOptional,
  slots: parseNumberOptional,
  filledSlots: parseNumberOptional,
  compensation: parseNumberOptional.nullable(),
  requirements: z.string().max(2000).optional().nullable(),
  status: z.string().optional(),
  publishStatus: z.string().optional(),
  approvalMode: z.string().optional(),
  ticketUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  soundItSaloneEventId: z.string().optional().nullable(),
  soundItSaloneUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  isSyncedToSalone: parseBooleanOptional,
  // Pro+ Ticketing
  isTicketed: parseBooleanOptional,
  ticketPrice: parseNumberOptional.nullable(),
  ticketCurrency: z.string().optional().nullable(),
  mobileMoneyNumber: z.string().optional().nullable(),
  mobileMoneyProvider: z.string().optional().nullable(),
  totalTickets: parseNumberOptional.nullable(),
  ticketSalesClosed: parseBooleanOptional,
  showRemainingTickets: parseBooleanOptional,
  onsiteUsername: z.string().max(100).optional().nullable(),
  onsitePassword: z.string().max(200).optional().nullable(),
  eventCode: z.string().max(50).optional().nullable(),
  djId: z.string().optional().nullable(),
});

const applySchema = z.object({
  message: z.string().max(2000).optional(),
});

const updateApplicationSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED']),
});

const syncToSaloneSchema = z.object({
  soundItSaloneEventId: z.string().min(1).max(200),
  soundItSaloneUrl: z.string().url().max(500),
});

// GET /api/events - List events
router.get('/', softAuthMiddleware, asyncHandler(async (req, res) => {
  const parsed = eventFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid filter parameters');
  }

  const { city, type, status, isOpenSlot, djId, search, page, limit } = parsed.data;

  const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

  const where: any = {};
  // Public listings only show published events. Owner/admin filtered views may include drafts via djId.
  if (!djId) {
    where.publishStatus = 'published';
  } else {
    const isAdmin = req.user?.role === 'ADMIN';
    let isOwner = false;
    if (req.user?.id) {
      const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
      isOwner = dj?.id === djId;
    }
    if (!isOwner && !isAdmin) {
      where.publishStatus = 'published';
    }
  }
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
        dj: { select: DJ_PUBLIC_SELECT },
      },
    }),
    prisma.event.count({ where }),
  ]);

  // Never expose the event staff password in listings
  const safeEvents = events.map((e: any) => {
    const { onsitePassword: _, ...rest } = e;
    return rest;
  });

  return res.json({
    success: true,
    data: safeEvents,
    meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
}));

// GET /api/events/types - Get event types
router.get('/types', asyncHandler(async (req, res) => {
  const types = [
    { id: 'club-night', name: 'Club Night' },
    { id: 'festival', name: 'Festival' },
    { id: 'private-party', name: 'Private Party' },
    { id: 'wedding', name: 'Wedding' },
    { id: 'corporate', name: 'Corporate Event' },
    { id: 'open-slot', name: 'Open DJ Slot' },
  ];
  return ok(res, types);
}));

// GET /api/events/:id - Get single event
router.get('/:id', asyncHandler(async (req: any, res: any) => {
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
    return fail(res, 404, 'Event not found');
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

  const isOwner = (req.user?.id && (
    (event.djId && event.djId === req.user.djProfile?.id) ||
    (event.dj?.userId && event.dj.userId === req.user.id) ||
    (event.djId === req.user.id)
  ));
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'VERIFICATION_ADMIN', 'MODERATOR'];
  const isAdmin = req.user?.role && adminRoles.includes(req.user.role);

  // Only hide onsitePassword from public visitors / other listeners
  const safeEvent = (isOwner || isAdmin) ? event : (({ onsitePassword: _, ...rest }: any) => rest)(event);
  return ok(res, { ...safeEvent, userRsvp: !!userRsvp, userTicket, isOwner: !!isOwner });
}));

// POST /api/events - Create event (auth required)
router.post('/', authMiddleware, uploadEventImage.single('image'), asyncHandler(async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'VERIFICATION_ADMIN', 'MODERATOR'];
  const isAdmin = req.user.role ? adminRoles.includes(req.user.role) : false;
  const isDjRole = req.user.role === 'DJ';
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj && !isAdmin && !isDjRole) {
    return fail(res, 403, 'Only DJs, Event Organizers, or admins can create events');
  }
  const djId = isAdmin ? (parsed.data.djId || dj?.id || null) : (dj?.id || null);

  const data: any = { ...parsed.data };
  delete data.djId;

  let imageUrl = null;
  if (req.file) {
    const { buffer, contentType, ext } = await processEventImage(req.file.buffer);
    imageUrl = await uploadBuffer(buffer, 'events', { contentType, ext });
  }

  const eventCode = data.eventCode || ('DS-EVT-' + crypto.randomBytes(3).toString('hex').toUpperCase());

  const event = await prisma.event.create({
    data: {
      ...data,
      eventCode,
      onsiteUsername: data.onsiteUsername || 'staff',
      city: data.city || data.location || 'Freetown',
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
}));

// PUT /api/events/:id - Update event
router.put('/:id', authMiddleware, uploadEventImage.single('image'), asyncHandler(async (req, res) => {
  const parsed = updateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return fail(res, 404, 'Event not found');
  }

  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'VERIFICATION_ADMIN', 'MODERATOR'];
  const isAdmin = req.user.role ? adminRoles.includes(req.user.role) : false;
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  const isOwner = (dj && event.djId && event.djId === dj.id) || (event.djId === req.user.id);
  if (!isOwner && !isAdmin) {
    return fail(res, 403, 'Forbidden');
  }

  const updateData: any = { ...parsed.data };
  delete updateData.djId;

  if (req.file) {
    const { buffer, contentType, ext } = await processEventImage(req.file.buffer);
    updateData.image = await uploadBuffer(buffer, 'events', { contentType, ext });
  }
  if (parsed.data.date) {
    updateData.date = new Date(parsed.data.date);
  }
  if (parsed.data.city === undefined && parsed.data.location) {
    updateData.city = parsed.data.location;
  }

  const updated = await prisma.event.update({
    where: { id: req.params.id },
    data: updateData,
  });

  return ok(res, updated);
}));

// DELETE /api/events/:id - Delete event
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return fail(res, 404, 'Event not found');
  }

  const isAdmin = req.user.role === 'ADMIN';
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  const isOwner = dj && event.djId && event.djId === dj.id;
  if (!isOwner && !isAdmin) {
    return fail(res, 403, 'Forbidden');
  }

  await prisma.event.delete({ where: { id: req.params.id } });

  if (event.djId) {
    await prisma.djProfile.update({
      where: { id: event.djId },
      data: { totalEvents: { decrement: 1 } },
    });
  }

  return ok(res, { message: 'Event deleted' });
}));

// POST /api/events/:id/sync-to-salone - Mark event as synced to Sound It Salone
router.post('/:id/sync-to-salone', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = syncToSaloneSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input');
  }

  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return fail(res, 404, 'Event not found');
  }

  const isAdmin = req.user.role === 'ADMIN';
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  const isOwner = dj && event.djId && event.djId === dj.id;
  if (!isOwner && !isAdmin) {
    return fail(res, 403, 'Forbidden');
  }

  const { soundItSaloneEventId, soundItSaloneUrl } = parsed.data;

  const updated = await prisma.event.update({
    where: { id: req.params.id },
    data: {
      isSyncedToSalone: true,
      soundItSaloneEventId: soundItSaloneEventId || null,
      soundItSaloneUrl: soundItSaloneUrl || null,
    },
  });

  return ok(res, updated);
}));

// POST /api/events/:id/apply - DJ applies to an event
router.post('/:id/apply', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return fail(res, 404, 'Event not found');
  }

  if (!event.isOpenSlot) {
    return fail(res, 400, 'This event is not accepting applications');
  }

  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!dj) {
    return fail(res, 403, 'DJ profile required to apply');
  }

  // Check if already applied
  const existing = await prisma.eventApplication.findUnique({
    where: { eventId_djId: { eventId: req.params.id, djId: dj.id } },
  });
  if (existing) {
    return fail(res, 409, 'You have already applied to this event');
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
}));

// GET /api/events/:id/applications - Get applications for an event (admin/organizer only)
router.get('/:id/applications', authMiddleware, asyncHandler(async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return fail(res, 404, 'Event not found');
  }

  const isAdmin = req.user.role === 'ADMIN';
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  const isOwner = dj && event.djId && event.djId === dj.id;
  if (!isOwner && !isAdmin) {
    return fail(res, 403, 'Forbidden');
  }

  const applications = await prisma.eventApplication.findMany({
    where: { eventId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: {
      dj: { select: { id: true, stageName: true, avatar: true, city: true, verified: true } },
    },
  });

  return ok(res, applications);
}));

// PATCH /api/events/:id/applications/:appId - Update application status (admin/organizer only)
router.patch('/:id/applications/:appId', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const parsed = updateApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return fail(res, 404, 'Event not found');
  }

  const isAdmin = req.user.role === 'ADMIN';
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  const isOwner = dj && event.djId && event.djId === dj.id;
  if (!isOwner && !isAdmin) {
    return fail(res, 403, 'Forbidden');
  }

  const application = await prisma.eventApplication.findUnique({
    where: { id: req.params.appId },
  });
  if (!application || application.eventId !== req.params.id) {
    return fail(res, 404, 'Application not found');
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

  return ok(res, updated);
}));

// ─── POST /api/events/:id/rsvp ───────────────────────────────────────────────
router.post('/:id/rsvp', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return fail(res, 404, 'Event not found');
  if (new Date(event.date) < new Date()) return fail(res, 400, 'Cannot RSVP to a past event');

  const existing = await prisma.eventRSVP.findUnique({
    where: { eventId_userId: { eventId: req.params.id, userId: req.user.id } },
  });

  if (existing) {
    // Toggle off (un-RSVP)
    await prisma.eventRSVP.delete({ where: { eventId_userId: { eventId: req.params.id, userId: req.user.id } } });
    return ok(res, { rsvped: false });
  }

  await prisma.eventRSVP.create({ data: { eventId: req.params.id, userId: req.user.id } });
  return ok(res, { rsvped: true });
}));

// ─── POST /api/events/:id/gallery ────────────────────────────────────────────
// DJ uploads gallery photos for a past event
const multerGallery = require('multer');
const uploadGallery = multerGallery({ storage: multerGallery.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.post('/:id/gallery', authMiddleware, uploadGallery.array('photos', 20), asyncHandler(async (req: any, res: any) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return fail(res, 404, 'Event not found');

  const isAdmin = req.user.role === 'ADMIN';
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  const isOwner = dj && event.djId && event.djId === dj.id;
  if (!isOwner && !isAdmin) return fail(res, 403, 'Forbidden');

  if (!req.files || req.files.length === 0) return fail(res, 400, 'No photos uploaded');

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
}));

// ─── DELETE /api/events/:id/gallery/:photoId ─────────────────────────────────
router.delete('/:id/gallery/:photoId', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return fail(res, 404, 'Event not found');
  const isAdmin = req.user.role === 'ADMIN';
  const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
  if (!isAdmin && (!dj || event.djId !== dj.id)) return fail(res, 403, 'Forbidden');
  await prisma.eventPhoto.delete({ where: { id: req.params.photoId } });
  return res.json({ success: true });
}));

module.exports = router;
