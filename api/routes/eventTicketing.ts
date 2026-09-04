const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const multer = require('multer');
const { prisma } = require('../utils/prisma');
const { authMiddleware, softAuthMiddleware } = require('../middleware/auth');
const { purchaseLimiter } = require('../utils/rateLimiter');
const { requireProOrAdmin } = require('../middleware/permissions');
const { uploadBuffer } = require('../utils/storage');
const { extFromMime } = require('../utils/upload');
const { signToken, verifyToken } = require('../utils/jwt');
const { sendTicketApprovalEmail } = require('../utils/email');
const {
  generateTicketQrPayload,
  reissueQrPayload,
  decryptQrPayload,
  generateTicketNumber,
  buildLegacyTicketQr,
} = require('../utils/ticketQr');
const { parsePagination } = require('../utils/pagination');
const { getCache, setCache, clearCache } = require('../utils/redis');
const { ok, fail } = require('../utils/response');

const router = express.Router({ mergeParams: true });

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

async function getEventWithAuth(userId: string, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!event) return { event: null, isOwner: false, isAdmin: false };

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { djProfile: true } });
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'VERIFICATION_ADMIN', 'MODERATOR'];
  const isAdmin = adminRoles.includes(user?.role || '');
  const isOwner = !!user?.djProfile && event.djId === user.djProfile.id;
  return { event, isOwner, isAdmin };
}

function assertOwnerOrAdmin(isOwner: boolean, isAdmin: boolean, res: any) {
  if (!isOwner && !isAdmin) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return false;
  }
  return true;
}

async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  actionUrl?: string,
  entityId?: string
) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, actionUrl: actionUrl || null, entityId: entityId || null, entityType: 'EventTicket' },
    });
  } catch {}
}

async function notifyOrganizer(event: any, title: string, body: string, actionUrl?: string) {
  if (!event.djId) return;
  const dj = await prisma.djProfile.findUnique({ where: { id: event.djId }, include: { user: true } });
  if (dj?.userId) {
    await notifyUser(dj.userId, 'TICKET_PURCHASED', title, body, actionUrl || `/dashboard/events/${event.id}`, undefined);
  }
}

async function updateEventAggregates(eventId: string) {
  const [soldAgg, checkedInAgg, revenueAgg] = await Promise.all([
    prisma.eventTicket.aggregate({
      where: { eventId, status: { in: ['approved', 'checked_in'] } },
      _sum: { quantity: true },
    }),
    prisma.eventTicket.aggregate({
      where: { eventId, status: 'checked_in' },
      _sum: { quantity: true },
    }),
    prisma.eventTicket.aggregate({
      where: { eventId, status: { in: ['approved', 'checked_in'] }, paymentStatus: 'paid' },
      _sum: { amount: true },
    }),
  ]);
  await prisma.event.update({
    where: { id: eventId },
    data: {
      ticketsSold: soldAgg._sum.quantity || 0,
      ticketsCheckedIn: checkedInAgg._sum.quantity || 0,
      totalRevenue: revenueAgg._sum.amount || 0,
    },
  });
}

function generateFriendlyTicketNumber(): string {
  return generateTicketNumber();
}

/**
 * Verify an on-site staff JWT issued by /onsite/auth.
 * Returns the eventId from the token, or null if invalid/expired.
 */
function verifyOnsiteToken(token: string): any {
  const decoded = verifyToken(token);
  if (!decoded || typeof decoded === 'string') return null;
  if (decoded.role !== 'onsite_staff' || !decoded.eventId) return null;
  return decoded;
}

/**
 * Middleware: verify X-Onsite-Token header and attach req.onsiteEventId and req.user for staff.
 */
function onsiteAuthMiddleware(req: any, res: any, next: any) {
  const token = req.headers['x-onsite-token'] || req.headers['x_onsite_token'];
  if (!token || typeof token !== 'string') {
    req.onsiteEventId = null;
    return next();
  }
  const decoded = verifyOnsiteToken(token);
  if (decoded && decoded.eventId) {
    req.onsiteEventId = decoded.eventId;
    if (!req.user) {
      req.user = {
        id: decoded.userId || `staff_${decoded.eventId}`,
        role: 'onsite_staff',
        username: decoded.staffUsername || 'Staff',
      };
    }
  }
  next();
}

/**
 * Middleware: allow either a regular user JWT (via authMiddleware) or an
 * X-Onsite-Token issued by /onsite/auth. This lets on-site staff (who only
 * have the onsite token) reach the scan/onsite routes.
 */
function authOrOnsiteMiddleware(req: any, res: any, next: any) {
  const token = req.headers['x-onsite-token'] || req.headers['x_onsite_token'];
  if (token && typeof token === 'string') {
    const decoded = verifyOnsiteToken(token);
    if (!decoded || !decoded.eventId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid on-site token' });
    }
    req.onsiteEventId = decoded.eventId;
    req.user = {
      id: decoded.userId || `staff_${decoded.eventId}`,
      role: 'onsite_staff',
      username: decoded.staffUsername || 'Staff',
    };
    return next();
  }
  // No onsite token — fall back to regular user JWT auth.
  return authMiddleware(req, res, next);
}

/**
 * Check whether the current user may scan/check-in tickets for an event.
 * Allowed: event owner, admin/moderator, Pro+ DJ, or on-site staff with a valid token.
 */
async function canScanEvent(req: any, event: any): Promise<boolean> {
  // Staff logged in via on-site tools
  const token = req.headers['x-onsite-token'] || req.headers['x_onsite_token'];
  if (token && typeof token === 'string') {
    const decoded = verifyOnsiteToken(token);
    if (decoded && decoded.eventId === event.id) return true;
  }

  if (req.user?.role === 'onsite_staff' && req.onsiteEventId === event.id) {
    return true;
  }

  if (req.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { djProfile: true } });
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
    const isOwner = (!!user?.djProfile && event.djId === user.djProfile.id) || (event.dj?.userId && event.dj.userId === user?.id) || event.djId === req.user.id;
    if (isOwner || isAdmin) return true;

    // Pro+ DJs can scan any ticketed event
    const proTiers = ['pro', 'legend'];
    if (proTiers.includes(user?.djProfile?.subscriptionTier?.toLowerCase())) return true;
  }

  return false;
}

interface ExtractedTicketIdentifiers {
  id?: string;
  ticketNumber?: string;
  raw: string;
}

/**
 * Extract ticket identifiers from a raw QR payload.
 * Handles encrypted payloads (returned as-is for decryptQrPayload), plain
 * DS-TICKET:<id>:<ticketNumber> strings (case-insensitive), ticket URLs,
 * and bare ticket numbers or IDs.
 */
function extractTicketIdentifiers(rawPayload: string): ExtractedTicketIdentifiers {
  let clean = String(rawPayload).trim();

  // Strip URL scheme, query string, and fragment so a full share link still works.
  clean = clean.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  const queryIdx = clean.indexOf('?');
  if (queryIdx !== -1) clean = clean.slice(0, queryIdx);
  const fragIdx = clean.indexOf('#');
  if (fragIdx !== -1) clean = clean.slice(0, fragIdx);

  const result: ExtractedTicketIdentifiers = { raw: clean };

  // DS-TICKET:<id>:<ticketNumber>
  if (clean.toLowerCase().startsWith('ds-ticket:')) {
    const parts = clean.split(':');
    if (parts[1]) result.id = parts[1];
    if (parts[2]) result.ticketNumber = parts[2];
    return result;
  }

  // Ticket URLs: /tickets/<id> or /user/tickets/<id>
  const urlMatch = clean.match(/\/(?:user\/)?tickets\/([a-zA-Z0-9_-]+)(?:\/|$)/);
  if (urlMatch) {
    result.id = urlMatch[1];
    return result;
  }

  // Bare ticket number DS-XXXX-XXXX
  const numberMatch = clean.match(/^DS-[A-Z0-9]{6}-[A-Z0-9]{6}$/i);
  if (numberMatch) {
    result.ticketNumber = clean.toUpperCase();
    return result;
  }

  return result;
}

function buildCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: any) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

/* ─── Zod schemas ─────────────────────────────────────────────────────────── */

const ticketTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  currency: z.string().min(1).max(10).default('SLE'),
  quantity: z.number().int().min(1).optional(),
  maxPerOrder: z.number().int().min(1).max(100).default(10),
  saleStartsAt: z.string().datetime().optional(),
  saleEndsAt: z.string().datetime().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const purchaseSchema = z.object({
  ticketTypeId: z.string().min(1),
  quantity: z.preprocess((val) => {
    if (typeof val === 'number') return isNaN(val) ? 1 : val;
    if (typeof val === 'string') {
      const n = parseInt(val, 10);
      return isNaN(n) ? 1 : n;
    }
    return 1;
  }, z.number().int().min(1).max(100).default(1)),
  buyerName: z.preprocess((val) => (val === '' ? undefined : val), z.string().max(200).optional().nullable()),
  buyerEmail: z.preprocess((val) => (val === '' ? undefined : val), z.string().email().max(200).optional().nullable()),
  buyerPhone: z.preprocess((val) => (val === '' ? undefined : val), z.string().max(50).optional().nullable()),
  notes: z.preprocess((val) => (val === '' ? undefined : val), z.string().max(1000).optional().nullable()),
});

const ticketActionSchema = z.object({
  reason: z.string().max(500).optional(),
  internalNotes: z.string().max(1000).optional(),
});

/* ─── TICKET TYPES ────────────────────────────────────────────────────────── */

// POST /api/events/:id/ticketing/ticket-types
router.post('/ticket-types', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const parsed = ticketTypeSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });

    const type = await prisma.eventTicketType.create({
      data: {
        eventId: event.id,
        ...parsed.data,
        saleStartsAt: parsed.data.saleStartsAt ? new Date(parsed.data.saleStartsAt) : null,
        saleEndsAt: parsed.data.saleEndsAt ? new Date(parsed.data.saleEndsAt) : null,
      },
    });
    return res.status(201).json({ success: true, data: type });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// PUT /api/events/:id/ticketing/ticket-types/:typeId
router.put('/ticket-types/:typeId', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const parsed = ticketTypeSchema.partial().safeParse(req.body);
    if (!parsed.success) return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });

    const data: any = { ...parsed.data };
    if (parsed.data.saleStartsAt) data.saleStartsAt = new Date(parsed.data.saleStartsAt);
    if (parsed.data.saleEndsAt) data.saleEndsAt = new Date(parsed.data.saleEndsAt);

    const type = await prisma.eventTicketType.update({
      where: { id: req.params.typeId, eventId: event.id },
      data,
    });
    return ok(res, type);
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// DELETE /api/events/:id/ticketing/ticket-types/:typeId
router.delete('/ticket-types/:typeId', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const sold = await prisma.eventTicket.count({ where: { ticketTypeId: req.params.typeId } });
    if (sold > 0) return fail(res, 400, 'Cannot delete ticket type that already has sales');

    await prisma.eventTicketType.delete({ where: { id: req.params.typeId, eventId: event.id } });
    return ok(res, { message: 'Ticket type deleted' });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─── PUBLISH / SETTINGS ──────────────────────────────────────────────────── */

// POST /api/events/:id/ticketing/publish
router.post('/publish', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { publishStatus: 'published', publishedAt: new Date() },
    });
    return ok(res, updated);
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/ticketing/unpublish
router.post('/unpublish', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { publishStatus: 'draft', publishedAt: null },
    });
    return ok(res, updated);
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─── PUBLIC AVAILABILITY ─────────────────────────────────────────────────── */

// GET /api/events/:id/ticketing/availability
router.get('/availability', async (req: any, res: any) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        ticketTypes: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        dj: { select: { stageName: true, avatar: true } },
        _count: { select: { eventTickets: true, rsvps: true } },
      },
    });
    if (!event) return fail(res, 404, 'Event not found');
    if (event.publishStatus === 'cancelled' || event.publishStatus === 'suspended') {
      return fail(res, 404, 'Event ticketing is unavailable');
    }

    const types = event.ticketTypes.map((t: any) => ({
      ...t,
      available: t.quantity ? Math.max(0, t.quantity - t.sold) : null,
    }));

    // Never expose on-site staff credentials on the public endpoint.
    const { onsitePassword, onsiteUsername, ...publicEvent } = event;

    return ok(res, { event: publicEvent, ticketTypes: types });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─── PURCHASE ────────────────────────────────────────────────────────────── */

const uploadPurchaseProof = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype && ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP) are allowed for payment proof'), false);
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// POST /api/events/:id/ticketing/purchase
router.post('/purchase', authMiddleware, purchaseLimiter, uploadPurchaseProof.single('screenshot'), async (req: any, res: any) => {
  try {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });

    const { event } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!event.isTicketed) return fail(res, 400, 'This event does not sell tickets');
    if (event.publishStatus === 'cancelled' || event.publishStatus === 'suspended') {
      return fail(res, 400, 'Ticket sales are unavailable for this event');
    }
    if (event.ticketSalesClosed) return fail(res, 400, 'Ticket sales for this event have been closed');
    if (new Date(event.date) < new Date()) return fail(res, 400, 'Event has already passed');

    const now = new Date();
    if (event.ticketSaleStartsAt && now < event.ticketSaleStartsAt) {
      return fail(res, 400, 'Ticket sales have not started');
    }
    if (event.ticketSaleEndsAt && now > event.ticketSaleEndsAt) {
      return fail(res, 400, 'Ticket sales have ended');
    }

    const ticketType = await prisma.eventTicketType.findUnique({ where: { id: parsed.data.ticketTypeId, eventId: event.id } });
    if (!ticketType || !ticketType.isActive) return fail(res, 404, 'Ticket type not found');

    const qty = parsed.data.quantity;
    if (qty > ticketType.maxPerOrder) {
      return fail(res, 400, `Maximum ${ticketType.maxPerOrder} tickets per order`);
    }

    const totalAmount = ticketType.price * qty;
    const isFree = totalAmount === 0;

    if (!isFree && !req.file) {
      return fail(res, 400, 'Payment screenshot is required for paid tickets');
    }

    let screenshotUrl: string | null = null;
    if (req.file && !isFree) {
      const ext = extFromMime(req.file.mimetype);
      screenshotUrl = await uploadBuffer(req.file.buffer, 'tickets', { contentType: req.file.mimetype, ext });
    }

    // All submitted ticket orders require DJ approval.
    const status = 'pending';
    const paymentStatus = 'pending';

    const createdTickets = await prisma.$transaction(async (tx: any) => {
      // Atomic capacity check + increment to prevent overselling.
      const incrementResult = await tx.$executeRawUnsafe(
        'UPDATE event_ticket_types SET sold = sold + $1 WHERE id = $2 AND (quantity IS NULL OR sold + $1 <= quantity)',
        qty,
        ticketType.id
      );
      if (incrementResult !== 1) {
        throw new Error('Not enough tickets available');
      }

      const ticketsList: any[] = [];
      for (let i = 0; i < qty; i++) {
        const ticketNumber = generateFriendlyTicketNumber();
        const created = await tx.eventTicket.create({
          data: {
            eventId: event.id,
            ticketTypeId: ticketType.id,
            userId: req.user.id,
            ticketNumber,
            status,
            paymentStatus,
            paymentMethod: isFree ? 'free' : (req.body.paymentMethod || 'mobile_money'),
            paymentScreenshot: screenshotUrl,
            amount: ticketType.price,
            currency: ticketType.currency,
            quantity: 1,
            buyerName: parsed.data.buyerName || req.user.name || null,
            buyerEmail: parsed.data.buyerEmail || req.user.email || null,
            buyerPhone: parsed.data.buyerPhone || req.user.phone || null,
            notes: parsed.data.notes || null,
            approvedAt: null,
          },
        });

        const qrString = buildLegacyTicketQr(created.id, ticketNumber);
        await tx.eventTicket.update({
          where: { id: created.id },
          data: { qrPayload: qrString, qrCode: qrString },
        });
        created.qrPayload = qrString;
        created.qrCode = qrString;

        ticketsList.push(created);
      }

      return ticketsList;
    });

    await updateEventAggregates(event.id);

    const primaryTicket = createdTickets[0];

    await notifyUser(
      req.user.id,
      'TICKET_PURCHASED',
      'Ticket Purchase Submitted',
      `Your ${qty}x ${ticketType.name} ticket request for "${event.title}" has been submitted and is pending DJ approval.`,
      `/user/tickets`,
      primaryTicket.id
    );

    await notifyOrganizer(
      event,
      'New Ticket Purchase Pending Approval',
      `${req.user.name || req.user.username} submitted payment for ${qty}x ${ticketType.name} ("${event.title}"). Please review and approve in your Event Dashboard.`,
      `/dashboard/events/${event.id}/tickets`
    );

    const updatedTicketType = ticketType.quantity ? await prisma.eventTicketType.findUnique({ where: { id: ticketType.id } }) : null;
    if (updatedTicketType && updatedTicketType.quantity && updatedTicketType.sold >= updatedTicketType.quantity) {
      await notifyOrganizer(event, 'Ticket Type Sold Out', `${ticketType.name} for "${event.title}" is sold out.`, `/dashboard/events/${event.id}`);
    } else if (updatedTicketType && updatedTicketType.quantity && updatedTicketType.sold >= updatedTicketType.quantity * 0.9) {
      await notifyOrganizer(event, 'Ticket Type Nearly Sold Out', `${ticketType.name} for "${event.title}" is nearly sold out.`, `/dashboard/events/${event.id}`);
    }

    return res.status(201).json({
      success: true,
      data: primaryTicket,
      tickets: createdTickets,
      message: 'Ticket request submitted! Pending DJ approval.',
    });
  } catch (error: any) {
    if (error.message === 'Not enough tickets available') {
      return fail(res, 400, error.message);
    }
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─── ORGANIZER DASHBOARD ─────────────────────────────────────────────────── */

// GET /api/events/:id/ticketing/dashboard
router.get('/dashboard', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const [totalTickets, pending, approvedCount, checkedInCount, rejected, cancelled, soldSeats, checkedInSeats, revenue, typeBreakdown, recentSales] = await Promise.all([
      prisma.eventTicket.count({ where: { eventId: event.id } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'pending' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'approved' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'checked_in' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'rejected' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'cancelled' } }),
      prisma.eventTicket.aggregate({ where: { eventId: event.id, status: { in: ['approved', 'checked_in'] } }, _sum: { quantity: true } }),
      prisma.eventTicket.aggregate({ where: { eventId: event.id, status: 'checked_in' }, _sum: { quantity: true } }),
      prisma.eventTicket.aggregate({ where: { eventId: event.id, status: { in: ['approved', 'checked_in'] } }, _sum: { amount: true } }),
      prisma.eventScanLog.count({ where: { eventId: event.id, status: 'valid' } }),
      prisma.eventTicket.groupBy({
        by: ['ticketTypeId'],
        where: { eventId: event.id },
        _count: { id: true },
        _sum: { amount: true, quantity: true },
      }),
      prisma.eventTicket.findMany({
        where: { eventId: event.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, name: true, username: true, avatar: true } }, ticketType: { select: { name: true } } },
      }),
    ]);

    const typeDetails = await prisma.eventTicketType.findMany({ where: { eventId: event.id } });
    const typeMap = new Map(typeDetails.map((t: any) => [t.id, t]));

    const capacity = event.capacity || event.totalTickets || null;
    const ticketsSold = soldSeats._sum.quantity || 0;
    const ticketsCheckedIn = checkedInSeats._sum.quantity || 0;
    const attendancePct = capacity && capacity > 0 ? Math.round((ticketsCheckedIn / capacity) * 100) : 0;

    return ok(res, {
        event,
        summary: {
          totalRevenue: revenue._sum.amount || 0,
          ticketsSold,
          ticketsRemaining: capacity ? Math.max(0, capacity - ticketsSold) : null,
          pending,
          approved: approvedCount,
          rejected,
          checkedIn: checkedInCount,
          cancelled,
          attendancePct,
          capacity,
        },
        typeBreakdown: typeBreakdown.map((tb: any) => ({
          ticketType: typeMap.get(tb.ticketTypeId || '') || { name: 'Unknown' },
          count: tb._count.id,
          quantity: tb._sum.quantity || 0,
          revenue: tb._sum.amount || 0,
        })),
        recentSales,
        totalTickets,
      });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─── TICKET MANAGEMENT ───────────────────────────────────────────────────── */

// GET /api/events/:id/ticketing/tickets
router.get('/tickets', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const { status, search, page = '1', limit = '50' } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit }, { defaultLimit: 50, maxLimit: 200 });

    const where: any = { eventId: event.id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { buyerName: { contains: search, mode: 'insensitive' } },
        { buyerEmail: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [tickets, total, pendingCount, approvedCount, checkedInCount, rejectedCount, cancelledCount] = await Promise.all([
      prisma.eventTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, name: true, username: true, avatar: true, email: true, phone: true } },
          ticketType: { select: { id: true, name: true, price: true, currency: true } },
          scanLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.eventTicket.count({ where }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'pending' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'approved' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'checked_in' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'rejected' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'cancelled' } }),
    ]);

    return res.json({
      success: true,
      data: tickets,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      summary: {
        total: approvedCount + checkedInCount + pendingCount + rejectedCount + cancelledCount,
        pending: pendingCount,
        approved: approvedCount,
        checkedIn: checkedInCount,
        pendingArrival: approvedCount,
        rejected: rejectedCount,
        cancelled: cancelledCount,
      },
    });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/ticketing/guest-list - Add guest directly with QR ticket
const addGuestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  ticketTypeId: z.string().optional().nullable(),
  quantity: z.number().int().min(1).max(20).default(1),
  status: z.enum(['approved', 'checked_in']).default('approved'),
  notes: z.string().max(500).optional().nullable(),
  isComplimentary: z.boolean().default(true),
});

router.post('/guest-list', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const parsed = addGuestSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
    }

    const { name, email, phone, ticketTypeId, quantity, status, notes, isComplimentary } = parsed.data;

    let targetTicketType = null;
    if (ticketTypeId) {
      targetTicketType = await prisma.eventTicketType.findFirst({ where: { id: ticketTypeId, eventId: event.id } });
    }
    if (!targetTicketType) {
      targetTicketType = await prisma.eventTicketType.findFirst({ where: { eventId: event.id } });
    }

    const createdList: any[] = [];
    for (let i = 0; i < quantity; i++) {
      const ticketNumber = generateFriendlyTicketNumber();
      const created = await prisma.eventTicket.create({
        data: {
          eventId: event.id,
          ticketTypeId: targetTicketType?.id || null,
          userId: req.user.id,
          ticketNumber,
          status,
          paymentStatus: 'paid',
          paymentMethod: isComplimentary ? 'guest_list' : 'organizer_comp',
          amount: isComplimentary ? 0 : (targetTicketType?.price || 0),
          currency: targetTicketType?.currency || 'SLE',
          quantity: 1,
          buyerName: name,
          buyerEmail: email || null,
          buyerPhone: phone || null,
          notes: notes || 'Added by Organizer',
          approvedAt: new Date(),
          scannedAt: status === 'checked_in' ? new Date() : null,
          checkedInBy: status === 'checked_in' ? req.user.id : null,
        },
      });

      const qrString = buildLegacyTicketQr(created.id, ticketNumber);
      await prisma.eventTicket.update({
        where: { id: created.id },
        data: { qrPayload: qrString, qrCode: qrString },
      });
      created.qrPayload = qrString;
      created.qrCode = qrString;
      createdList.push(created);

      if (email && status === 'approved') {
        sendTicketApprovalEmail({
          to: email,
          buyerName: name,
          eventTitle: event.title,
          eventDate: event.date,
          eventVenue: event.venue || event.location,
          eventCity: event.city,
          ticketTypeName: targetTicketType?.name || 'Guest Pass',
          ticketNumber,
          ticketId: created.id,
          quantity: 1,
        }, 'guest ticket email');
      }
    }

    await updateEventAggregates(event.id);

    return res.status(201).json({
      success: true,
      data: createdList,
      message: `${quantity} guest ticket(s) added successfully!`,
    });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/ticketing/tickets/:ticketId/approve
router.post('/tickets/:ticketId/approve', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const ticket = await prisma.eventTicket.findFirst({ where: { id: req.params.ticketId, eventId: event.id }, include: { user: true, ticketType: true } });
    if (!ticket) return fail(res, 404, 'Ticket not found');
    if (ticket.status !== 'pending') return fail(res, 400, `Ticket is already ${ticket.status}`);

    const qrString = buildLegacyTicketQr(ticket.id, ticket.ticketNumber);
    const updated = await prisma.eventTicket.update({
      where: { id: ticket.id },
      data: { status: 'approved', paymentStatus: 'paid', qrPayload: qrString, qrCode: qrString, approvedAt: new Date() },
    });

    await updateEventAggregates(event.id);

    await notifyUser(
      ticket.userId,
      'TICKET_APPROVED',
      '🎟️ Ticket Approved',
      `Your ${ticket.ticketType?.name || 'ticket'} for "${event.title}" has been approved.`,
      `/user/tickets/${ticket.id}`,
      ticket.id
    );

    const recipientEmail = ticket.buyerEmail || ticket.user?.email;
    if (recipientEmail) {
      sendTicketApprovalEmail({
        to: recipientEmail,
        buyerName: ticket.buyerName || ticket.user?.name || 'Attendee',
        eventTitle: event.title,
        eventDate: event.date,
        eventVenue: event.venue || event.location,
        eventCity: event.city,
        ticketTypeName: ticket.ticketType?.name || 'Standard Ticket',
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket.id,
        quantity: ticket.quantity || 1,
      }, 'approval email');
    }

    return ok(res, updated);
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/ticketing/tickets/approve-all
router.post('/tickets/approve-all', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const pendingTickets = await prisma.eventTicket.findMany({
      where: { eventId: event.id, status: 'pending' },
      include: { user: true, ticketType: true },
    });

    const updatedIds: string[] = [];
    for (const ticket of pendingTickets) {
      const qrString = buildLegacyTicketQr(ticket.id, ticket.ticketNumber);
      await prisma.eventTicket.update({
        where: { id: ticket.id },
        data: { status: 'approved', paymentStatus: 'paid', qrPayload: qrString, qrCode: qrString, approvedAt: new Date() },
      });
      updatedIds.push(ticket.id);

      await notifyUser(
        ticket.userId,
        'TICKET_APPROVED',
        '🎟️ Ticket Approved',
        `Your ${ticket.ticketType?.name || 'ticket'} for "${event.title}" has been approved.`,
        `/user/tickets/${ticket.id}`,
        ticket.id
      );

      const recipientEmail = ticket.buyerEmail || ticket.user?.email;
      if (recipientEmail) {
        sendTicketApprovalEmail({
          to: recipientEmail,
          buyerName: ticket.buyerName || ticket.user?.name || 'Attendee',
          eventTitle: event.title,
          eventDate: event.date,
          eventVenue: event.venue || event.location,
          eventCity: event.city,
          ticketTypeName: ticket.ticketType?.name || 'Standard Ticket',
          ticketNumber: ticket.ticketNumber,
          ticketId: ticket.id,
          quantity: ticket.quantity || 1,
        }, 'approval email in approve-all');
      }
    }

    await updateEventAggregates(event.id);
    return ok(res, { approvedCount: updatedIds.length });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/ticketing/tickets/:ticketId/reject
router.post('/tickets/:ticketId/reject', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const parsed = ticketActionSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, 'Invalid input');

    const ticket = await prisma.eventTicket.findFirst({ where: { id: req.params.ticketId, eventId: event.id }, include: { user: true, ticketType: true } });
    if (!ticket) return fail(res, 404, 'Ticket not found');
    if (!['pending', 'approved'].includes(ticket.status)) return fail(res, 400, `Cannot reject ticket with status ${ticket.status}`);

    await prisma.$transaction(async (tx: any) => {
      await tx.eventTicket.update({
        where: { id: ticket.id },
        data: { status: 'rejected', rejectedAt: new Date(), declineReason: parsed.data.reason || null, internalNotes: parsed.data.internalNotes || null },
      });
      if (ticket.ticketTypeId) {
        await tx.eventTicketType.update({ where: { id: ticket.ticketTypeId }, data: { sold: { decrement: ticket.quantity } } });
      }
    });

    await updateEventAggregates(event.id);

    await notifyUser(
      ticket.userId,
      'TICKET_DECLINED',
      'Ticket Declined',
      parsed.data.reason
        ? `Your ${ticket.ticketType?.name || 'ticket'} for "${event.title}" was declined: ${parsed.data.reason}`
        : `Your ${ticket.ticketType?.name || 'ticket'} for "${event.title}" was declined.`,
      `/user/tickets/${ticket.id}`,
      ticket.id
    );

    return ok(res, { message: 'Ticket rejected' });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/ticketing/tickets/:ticketId/cancel
router.post('/tickets/:ticketId/cancel', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const ticket = await prisma.eventTicket.findFirst({ where: { id: req.params.ticketId, eventId: event.id }, include: { ticketType: true } });
    if (!ticket) return fail(res, 404, 'Ticket not found');
    if (ticket.status === 'checked_in') return fail(res, 400, 'Cannot cancel a checked-in ticket');

    await prisma.$transaction(async (tx: any) => {
      await tx.eventTicket.update({ where: { id: ticket.id }, data: { status: 'cancelled', cancelledAt: new Date() } });
      if (ticket.ticketTypeId) {
        await tx.eventTicketType.update({ where: { id: ticket.ticketTypeId }, data: { sold: { decrement: ticket.quantity } } });
      }
    });

    await updateEventAggregates(event.id);
    return ok(res, { message: 'Ticket cancelled' });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/ticketing/tickets/:ticketId/reissue-qr
router.post('/tickets/:ticketId/reissue-qr', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const ticket = await prisma.eventTicket.findFirst({ where: { id: req.params.ticketId, eventId: event.id } });
    if (!ticket) return fail(res, 404, 'Ticket not found');
    if (!['approved', 'checked_in'].includes(ticket.status)) return fail(res, 400, 'Ticket must be approved to reissue QR');

    const { payload } = reissueQrPayload(ticket.id, event.id, ticket.userId, ticket.ticketTypeId);
    const updated = await prisma.eventTicket.update({ where: { id: ticket.id }, data: { qrPayload: payload, status: 'approved', scannedAt: null, checkedInBy: null } });
    return ok(res, updated);
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/ticketing/tickets/:ticketId/edit-attendee
router.post('/tickets/:ticketId/edit-attendee', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const schema = z.object({ buyerName: z.string().max(200).optional(), buyerEmail: z.string().email().max(200).optional(), buyerPhone: z.string().max(50).optional(), internalNotes: z.string().max(1000).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, 'Invalid input');

    const ticket = await prisma.eventTicket.findFirst({ where: { id: req.params.ticketId, eventId: event.id } });
    if (!ticket) return fail(res, 404, 'Ticket not found');

    const updated = await prisma.eventTicket.update({ where: { id: ticket.id }, data: parsed.data });
    return ok(res, updated);
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─── CUSTOMERS / EXPORT ──────────────────────────────────────────────────── */

// GET /api/events/:id/ticketing/customers
router.get('/customers', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const { search, status, page = '1', limit = '50' } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit }, { defaultLimit: 50, maxLimit: 200 });

    const where: any = { eventId: event.id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { buyerName: { contains: search, mode: 'insensitive' } },
        { buyerEmail: { contains: search, mode: 'insensitive' } },
        { buyerPhone: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.eventTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: { user: { select: { id: true, name: true, username: true, email: true, phone: true, avatar: true } }, ticketType: { select: { name: true } } },
      }),
      prisma.eventTicket.count({ where }),
    ]);

    return res.json({ success: true, data: customers, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/events/:id/ticketing/customers/export
router.get('/customers/export', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const tickets = await prisma.eventTicket.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true, phone: true } }, ticketType: { select: { name: true } } },
    });

    const rows = tickets.map((t: any) => ({
      'Ticket Number': t.ticketNumber,
      'Ticket Type': t.ticketType?.name || '',
      'Buyer Name': t.buyerName || t.user?.name || '',
      'Buyer Email': t.buyerEmail || t.user?.email || '',
      'Buyer Phone': t.buyerPhone || t.user?.phone || '',
      Quantity: t.quantity,
      Amount: t.amount,
      Currency: t.currency,
      Status: t.status,
      'Payment Status': t.paymentStatus,
      'Purchase Date': t.createdAt.toISOString(),
      'Approved At': t.approvedAt?.toISOString() || '',
      'Checked In At': t.scannedAt?.toISOString() || '',
      Notes: t.notes || '',
    }));

    const csv = buildCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendees-${event.id}.csv"`);
    return res.send(csv);
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─── SALES ANALYTICS ─────────────────────────────────────────────────────── */

// GET /api/events/:id/ticketing/analytics
router.get('/analytics', authMiddleware, requireProOrAdmin, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const tickets = await prisma.eventTicket.findMany({
      where: { eventId: event.id },
      include: { ticketType: { select: { name: true } } },
    });

    const dailySales: Record<string, { date: string; sales: number; revenue: number; tickets: number }> = {};
    const hourlySales: Record<string, { hour: string; sales: number }> = {};
    const typeDistribution: Record<string, { name: string; value: number; revenue: number }> = {};
    let approvedCount = 0;
    let checkedInCount = 0;

    tickets.forEach((t: any) => {
      const dateKey = t.createdAt.toISOString().split('T')[0];
      const hourKey = `${t.createdAt.getHours()}:00`;
      const typeName = t.ticketType?.name || 'Unknown';

      if (!dailySales[dateKey]) dailySales[dateKey] = { date: dateKey, sales: 0, revenue: 0, tickets: 0 };
      dailySales[dateKey].sales += 1;
      dailySales[dateKey].revenue += t.amount;
      dailySales[dateKey].tickets += t.quantity;

      if (!hourlySales[hourKey]) hourlySales[hourKey] = { hour: hourKey, sales: 0 };
      hourlySales[hourKey].sales += 1;

      if (!typeDistribution[typeName]) typeDistribution[typeName] = { name: typeName, value: 0, revenue: 0 };
      typeDistribution[typeName].value += t.quantity;
      typeDistribution[typeName].revenue += t.amount;

      if (t.status === 'approved' || t.status === 'checked_in') approvedCount += t.quantity;
      if (t.status === 'checked_in') checkedInCount += t.quantity;
    });

    const totalQty = tickets.reduce((sum: number, t: any) => sum + t.quantity, 0);
    const conversionRate = totalQty > 0 ? Math.round((approvedCount / totalQty) * 100) : 0;

    return ok(res, {
        dailySales: Object.values(dailySales).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        hourlySales: Object.values(hourlySales).sort((a: any, b: any) => parseInt(a.hour) - parseInt(b.hour)),
        ticketTypeDistribution: Object.values(typeDistribution),
        revenue: event.totalRevenue,
        attendance: { approved: approvedCount, checkedIn: checkedInCount },
        conversionRate,
      });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─── SCANNER ─────────────────────────────────────────────────────────────── */

// POST /api/events/:id/ticketing/scan
router.post('/scan', authOrOnsiteMiddleware, onsiteAuthMiddleware, async (req: any, res: any) => {
  try {
    const { qrPayload } = req.body;
    if (!qrPayload) return fail(res, 400, 'QR payload is required');

    const { event } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    const canScan = await canScanEvent(req, event);
    if (!canScan) return fail(res, 403, 'Only event organizers or on-site staff can scan tickets');

    let ticket: any = null;
    const decrypted = decryptQrPayload(qrPayload);

    if (decrypted && decrypted.ticketId) {
      if (decrypted.eventId && decrypted.eventId !== event.id) {
        await prisma.eventScanLog.create({
          data: { ticketId: null, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'wrong_event', metadata: { attemptedTicketId: decrypted.ticketId, expectedEventId: event.id, actualEventId: decrypted.eventId } },
        });
        return fail(res, 400, 'WRONG_EVENT', { message: 'This ticket is for a different event.' });
      }

      ticket = await prisma.eventTicket.findUnique({
        where: { id: decrypted.ticketId },
        include: { user: { select: { id: true, name: true, username: true, avatar: true, email: true } }, ticketType: { select: { name: true } } },
      });
    }

    // Fallback: match by DS-TICKET:..., plain ticket ID, ticket number (DS-...), qrCode, qrPayload, or URL
    if (!ticket) {
      const extracted = extractTicketIdentifiers(qrPayload);
      const clean = extracted.raw;
      const possibleId = extracted.id;
      const possibleNumber = extracted.ticketNumber;

      const orConditions: any[] = [
        { qrCode: clean },
        { qrPayload: clean },
      ];
      if (possibleId) {
        orConditions.push({ id: possibleId });
      }
      if (possibleNumber) {
        orConditions.push(
          { ticketNumber: { equals: possibleNumber, mode: 'insensitive' } },
          { ticketNumber: { equals: clean, mode: 'insensitive' } }
        );
      } else {
        orConditions.push({ ticketNumber: { equals: clean, mode: 'insensitive' } });
      }

      ticket = await prisma.eventTicket.findFirst({
        where: {
          eventId: event.id,
          OR: orConditions,
        },
        include: { user: { select: { id: true, name: true, username: true, avatar: true, email: true } }, ticketType: { select: { name: true } } },
      });

      if (!ticket) {
        const otherTicket = await prisma.eventTicket.findFirst({
          where: {
            OR: [
              ...(possibleId ? [{ id: possibleId }] : []),
              ...(possibleNumber ? [
                { ticketNumber: { equals: possibleNumber, mode: 'insensitive' } },
                { ticketNumber: { equals: clean, mode: 'insensitive' } },
              ] : [{ ticketNumber: { equals: clean, mode: 'insensitive' } }]),
              { qrCode: clean },
              { qrPayload: clean },
            ],
          },
          include: { event: { select: { title: true } } },
        });

        if (otherTicket) {
          await prisma.eventScanLog.create({
            data: { ticketId: otherTicket.id, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'wrong_event', metadata: { attemptedPayload: clean.slice(0, 100) } },
          });
          return fail(res, 400, 'WRONG_EVENT', { message: `This ticket is for "${otherTicket.event?.title || 'another event'}".` });
        }
      }
    }

    if (!ticket || ticket.eventId !== event.id) {
      await prisma.eventScanLog.create({
        data: { ticketId: null, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'invalid', metadata: { attemptedPayload: String(qrPayload).slice(0, 100), reason: 'ticket_not_found' } },
      });
      return fail(res, 404, 'INVALID', { message: 'Invalid or unknown ticket' });
    }

    if (ticket.status === 'checked_in') {
      await prisma.eventScanLog.create({
        data: { ticketId: ticket.id, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'already_used', metadata: { scannedAt: ticket.scannedAt } },
      });
      return fail(res, 409, 'ALREADY_SCANNED', { message: 'Ticket already used', data: { ticket, checkedInAt: ticket.scannedAt, checkedInBy: ticket.checkedInBy } });
    }

    if (ticket.status !== 'approved') {
      await prisma.eventScanLog.create({
        data: { ticketId: ticket.id, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'invalid', metadata: { reason: 'not_approved', status: ticket.status } },
      });
      return fail(res, 400, 'NOT_APPROVED', { message: `Ticket status is ${ticket.status}` });
    }

    // Atomic check-in: only update if still approved.
    const updated = await prisma.eventTicket.updateMany({
      where: { id: ticket.id, status: 'approved' },
      data: { status: 'checked_in', scannedAt: new Date(), checkedInBy: req.user.id },
    });

    if (updated.count === 0) {
      return fail(res, 409, 'ALREADY_SCANNED', { message: 'Ticket already used' });
    }

    await prisma.eventScanLog.create({
      data: { ticketId: ticket.id, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'valid', metadata: { ticketNumber: ticket.ticketNumber } },
    });

    await updateEventAggregates(event.id);

    await notifyUser(
      ticket.userId,
      'TICKET_APPROVED',
      '✅ Checked In',
      `You have been checked in to "${event.title}".`,
      `/user/tickets/${ticket.id}`,
      ticket.id
    );

    return ok(res, ticket, 'Valid ticket! Entry granted.');
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/ticketing/scan/:ticketId/checkin
router.post('/scan/:ticketId/checkin', authOrOnsiteMiddleware, onsiteAuthMiddleware, async (req: any, res: any) => {
  try {
    const { event } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return fail(res, 404, 'Event not found');
    const canScan = await canScanEvent(req, event);
    if (!canScan) return fail(res, 403, 'Only event organizers or on-site staff can check in tickets');

    const ticket = await prisma.eventTicket.findUnique({
      where: { id: req.params.ticketId },
      include: { user: { select: { id: true, name: true, username: true, avatar: true, email: true } }, ticketType: { select: { name: true } } },
    });

    if (!ticket || ticket.eventId !== event.id) return fail(res, 404, 'Ticket not found');
    if (ticket.status === 'checked_in') return fail(res, 409, 'ALREADY_SCANNED', { message: 'Already checked in' });
    if (ticket.status !== 'approved') return fail(res, 400, 'NOT_APPROVED', { message: `Ticket status is ${ticket.status}` });

    // Atomic check-in: only update if still approved.
    const updated = await prisma.eventTicket.updateMany({
      where: { id: ticket.id, status: 'approved' },
      data: { status: 'checked_in', scannedAt: new Date(), checkedInBy: req.user.id },
    });

    if (updated.count === 0) {
      return fail(res, 409, 'ALREADY_SCANNED', { message: 'Already checked in' });
    }

    await prisma.eventScanLog.create({
      data: { ticketId: ticket.id, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'valid', metadata: { manual: true } },
    });

    await updateEventAggregates(event.id);

    return ok(res, ticket);
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─── ON-SITE STAFF TOOLS ─────────────────────────────────────────────────── */

const onsiteAuthSchema = z.object({
  username: z.string().optional().nullable(),
  password: z.string().min(1).max(200),
});

// POST /api/events/:id/onsite/auth
router.post('/onsite/auth', softAuthMiddleware, async (req: any, res: any) => {
  try {
    const parsed = onsiteAuthSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, 'Password is required');

    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return fail(res, 404, 'Event not found');
    if (!event.isTicketed) return fail(res, 400, 'This event does not use ticketing');

    let bypass = false;
    if (req.user?.id) {
      const { isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
      bypass = isOwner || isAdmin;
    }

    if (!bypass) {
      if (!event.onsitePassword) {
        return fail(res, 403, 'On-site access password is not configured for this event.');
      }

      if (parsed.data.username) {
        const expectedUser = (event.onsiteUsername || 'staff').trim().toLowerCase();
        const inputUser = parsed.data.username.trim().toLowerCase();
        if (inputUser !== expectedUser) {
          return fail(res, 403, 'Incorrect staff username');
        }
      }

      // Lockout: max 5 failed attempts per event/username within 15 minutes
      const lockKey = `onsite_lock:${event.id}:${(parsed.data.username || '-').trim().toLowerCase()}`;
      const lockData = await getCache(lockKey);
      if (lockData && lockData.count >= 5) {
        return fail(res, 429, 'Too many attempts, try again later');
      }

      let passwordOk = false;
      let needsRehash = false;
      if (event.onsitePassword.startsWith('$2')) {
        passwordOk = await bcrypt.compare(parsed.data.password, event.onsitePassword);
      } else {
        const expected = Buffer.from(String(event.onsitePassword));
        const given = Buffer.from(parsed.data.password);
        passwordOk = expected.length === given.length && crypto.timingSafeEqual(expected, given);
        needsRehash = passwordOk;
      }

      if (!passwordOk) {
        const newCount = ((lockData && lockData.count) || 0) + 1;
        await setCache(lockKey, { count: newCount }, 900);
        if (newCount >= 5) {
          return fail(res, 429, 'Too many attempts, try again later');
        }
        return fail(res, 403, 'Incorrect event staff password');
      }

      await clearCache(lockKey);

      // Transparently upgrade legacy plaintext passwords to bcrypt
      if (needsRehash) {
        await prisma.event.update({
          where: { id: event.id },
          data: { onsitePassword: await bcrypt.hash(parsed.data.password, 12) },
        });
      }
    }

    const staffUsername = parsed.data.username || event.onsiteUsername || 'staff';
    const token = signToken({
      role: 'onsite_staff',
      eventId: event.id,
      staffUsername,
      userId: req.user?.id || `staff_${event.id}`,
    });

    return ok(res, {
        token,
        staffUsername,
        event: { id: event.id, title: event.title, date: event.date, location: event.location, city: event.city, eventCode: event.eventCode },
      });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/events/:id/onsite/dashboard
router.get('/onsite/dashboard', authOrOnsiteMiddleware, onsiteAuthMiddleware, async (req: any, res: any) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return fail(res, 404, 'Event not found');
    if (!(await canScanEvent(req, event))) return fail(res, 403, 'Forbidden');

    const [pending, approvedCount, checkedInCount, cancelled, soldSeats, checkedInSeats, revenue, ticketsScanned] = await Promise.all([
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'pending' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'approved' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'checked_in' } }),
      prisma.eventTicket.count({ where: { eventId: event.id, status: 'cancelled' } }),
      prisma.eventTicket.aggregate({ where: { eventId: event.id, status: { in: ['approved', 'checked_in'] } }, _sum: { quantity: true } }),
      prisma.eventTicket.aggregate({ where: { eventId: event.id, status: 'checked_in' }, _sum: { quantity: true } }),
      prisma.eventTicket.aggregate({ where: { eventId: event.id, status: { in: ['approved', 'checked_in'] } }, _sum: { amount: true } }),
      prisma.eventScanLog.count({ where: { eventId: event.id, status: 'valid' } }),
    ]);

    const capacity = event.capacity || event.totalTickets || null;
    const ticketsSold = soldSeats._sum.quantity || 0;
    const ticketsRemaining = capacity ? Math.max(0, capacity - ticketsSold) : null;

    return ok(res, {
        event,
        summary: {
          ticketsSold,
          ticketsScanned,
          ticketsRemaining,
          pending,
          approved: approvedCount,
          checkedIn: checkedInCount,
          cancelled,
          capacity,
          revenue: revenue._sum.amount || 0,
        },
      });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/events/:id/onsite/guests
router.get('/onsite/guests', authOrOnsiteMiddleware, onsiteAuthMiddleware, async (req: any, res: any) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return fail(res, 404, 'Event not found');
    if (!(await canScanEvent(req, event))) return fail(res, 403, 'Forbidden');

    const { search, status, page = '1', limit = '50' } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit }, { defaultLimit: 50, maxLimit: 200 });

    const where: any = { eventId: event.id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { buyerName: { contains: search, mode: 'insensitive' } },
        { buyerEmail: { contains: search, mode: 'insensitive' } },
        { buyerPhone: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [guests, total] = await Promise.all([
      prisma.eventTicket.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, name: true, username: true, avatar: true, email: true, phone: true } },
          ticketType: { select: { id: true, name: true, price: true, currency: true } },
          scanLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.eventTicket.count({ where }),
    ]);

    return res.json({ success: true, data: guests, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/onsite/guests/:ticketId/checkin
router.post('/onsite/guests/:ticketId/checkin', authOrOnsiteMiddleware, onsiteAuthMiddleware, async (req: any, res: any) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return fail(res, 404, 'Event not found');
    if (!(await canScanEvent(req, event))) return fail(res, 403, 'Forbidden');

    const ticket = await prisma.eventTicket.findUnique({
      where: { id: req.params.ticketId },
      include: { user: { select: { id: true, name: true, username: true, avatar: true, email: true } }, ticketType: { select: { name: true } } },
    });
    if (!ticket || ticket.eventId !== event.id) return fail(res, 404, 'Ticket not found');
    if (ticket.status === 'checked_in') return fail(res, 409, 'ALREADY_SCANNED', { message: 'Already checked in' });
    if (ticket.status !== 'approved') return fail(res, 400, 'NOT_APPROVED', { message: `Ticket status is ${ticket.status}` });

    const updated = await prisma.eventTicket.updateMany({
      where: { id: ticket.id, status: 'approved' },
      data: { status: 'checked_in', scannedAt: new Date(), checkedInBy: req.user.id },
    });
    if (updated.count === 0) return fail(res, 409, 'ALREADY_SCANNED', { message: 'Already checked in' });

    await prisma.eventScanLog.create({
      data: { ticketId: ticket.id, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'valid', metadata: { manual: true, source: 'onsite_guest_list' } },
    });
    await updateEventAggregates(event.id);

    return ok(res, ticket);
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/events/:id/onsite/guests/:ticketId/undo-checkin
router.post('/onsite/guests/:ticketId/undo-checkin', authOrOnsiteMiddleware, onsiteAuthMiddleware, async (req: any, res: any) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return fail(res, 404, 'Event not found');
    if (!(await canScanEvent(req, event))) return fail(res, 403, 'Forbidden');

    const ticket = await prisma.eventTicket.findUnique({
      where: { id: req.params.ticketId },
      include: { ticketType: true },
    });
    if (!ticket || ticket.eventId !== event.id) return fail(res, 404, 'Ticket not found');
    if (ticket.status !== 'checked_in') return fail(res, 400, 'NOT_CHECKED_IN', { message: 'Ticket is not checked in' });

    await prisma.eventTicket.update({
      where: { id: ticket.id },
      data: { status: 'approved', scannedAt: null, checkedInBy: null },
    });

    await prisma.eventScanLog.create({
      data: { ticketId: ticket.id, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'valid', metadata: { action: 'undo_checkin' } },
    });
    await updateEventAggregates(event.id);

    return ok(res, { message: 'Check-in undone' });
  } catch (error: any) {
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

const walkinSchema = z.object({
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1).max(100).default(1),
  buyerName: z.string().max(200),
  buyerEmail: z.string().email().max(200).optional(),
  buyerPhone: z.string().max(50).optional(),
  paymentMethod: z.enum(['cash', 'complimentary', 'mobile_money']).default('cash'),
  amount: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

// POST /api/events/:id/onsite/walkin
router.post('/onsite/walkin', authOrOnsiteMiddleware, onsiteAuthMiddleware, async (req: any, res: any) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return fail(res, 404, 'Event not found');
    if (!(await canScanEvent(req, event))) return fail(res, 403, 'Forbidden');

    const parsed = walkinSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });

    const ticketType = await prisma.eventTicketType.findUnique({ where: { id: parsed.data.ticketTypeId, eventId: event.id } });
    if (!ticketType || !ticketType.isActive) return fail(res, 404, 'Ticket type not found');

    const qty = parsed.data.quantity;
    if (qty > ticketType.maxPerOrder) {
      return fail(res, 400, `Maximum ${ticketType.maxPerOrder} tickets per order`);
    }

    const finalAmount = parsed.data.amount !== undefined ? parsed.data.amount : ticketType.price * qty;
    const paymentStatus = parsed.data.paymentMethod === 'complimentary' ? 'paid' : 'pending';

    const ticket = await prisma.$transaction(async (tx: any) => {
      const incrementResult = await tx.$executeRawUnsafe(
        'UPDATE event_ticket_types SET sold = sold + $1 WHERE id = $2 AND (quantity IS NULL OR sold + $1 <= quantity)',
        qty,
        ticketType.id
      );
      if (incrementResult !== 1) throw new Error('Not enough tickets available');

      const created = await tx.eventTicket.create({
        data: {
          eventId: event.id,
          ticketTypeId: ticketType.id,
          userId: req.user.id,
          ticketNumber: generateFriendlyTicketNumber(),
          status: 'approved',
          paymentStatus,
          paymentMethod: parsed.data.paymentMethod,
          amount: finalAmount,
          currency: ticketType.currency,
          quantity: qty,
          buyerName: parsed.data.buyerName,
          buyerEmail: parsed.data.buyerEmail || null,
          buyerPhone: parsed.data.buyerPhone || null,
          notes: parsed.data.notes || null,
          approvedAt: new Date(),
        },
      });

      const { payload } = generateTicketQrPayload(created.id, event.id, req.user.id, ticketType.id);
      await tx.eventTicket.update({ where: { id: created.id }, data: { qrPayload: payload } });

      return created;
    });

    await updateEventAggregates(event.id);

    return res.status(201).json({ success: true, data: ticket });
  } catch (error: any) {
    if (error.message === 'Not enough tickets available') {
      return fail(res, 400, error.message);
    }
    console.error('[eventTicketing.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
