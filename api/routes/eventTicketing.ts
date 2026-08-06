const express = require('express');
const { z } = require('zod');
const multer = require('multer');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { purchaseLimiter } = require('../utils/rateLimiter');
const { requireLegend } = require('../middleware/permissions');
const { uploadBuffer } = require('../utils/storage');
const {
  generateTicketQrPayload,
  reissueQrPayload,
  decryptQrPayload,
  generateTicketNumber,
} = require('../utils/ticketQr');

const router = express.Router({ mergeParams: true });

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

async function getEventWithAuth(userId: string, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!event) return { event: null, isOwner: false, isAdmin: false };

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { djProfile: true } });
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
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
  quantity: z.number().int().min(1).max(100).default(1),
  buyerName: z.string().max(200).optional(),
  buyerEmail: z.string().email().max(200).optional(),
  buyerPhone: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

const ticketActionSchema = z.object({
  reason: z.string().max(500).optional(),
  internalNotes: z.string().max(1000).optional(),
});

/* ─── TICKET TYPES ────────────────────────────────────────────────────────── */

// POST /api/events/:id/ticketing/ticket-types
router.post('/ticket-types', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const parsed = ticketTypeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });

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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/events/:id/ticketing/ticket-types/:typeId
router.put('/ticket-types/:typeId', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const parsed = ticketTypeSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });

    const data: any = { ...parsed.data };
    if (parsed.data.saleStartsAt) data.saleStartsAt = new Date(parsed.data.saleStartsAt);
    if (parsed.data.saleEndsAt) data.saleEndsAt = new Date(parsed.data.saleEndsAt);

    const type = await prisma.eventTicketType.update({
      where: { id: req.params.typeId, eventId: event.id },
      data,
    });
    return res.json({ success: true, data: type });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/events/:id/ticketing/ticket-types/:typeId
router.delete('/ticket-types/:typeId', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const sold = await prisma.eventTicket.count({ where: { ticketTypeId: req.params.typeId } });
    if (sold > 0) return res.status(400).json({ success: false, error: 'Cannot delete ticket type that already has sales' });

    await prisma.eventTicketType.delete({ where: { id: req.params.typeId, eventId: event.id } });
    return res.json({ success: true, data: { message: 'Ticket type deleted' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── PUBLISH / SETTINGS ──────────────────────────────────────────────────── */

// POST /api/events/:id/ticketing/publish
router.post('/publish', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { publishStatus: 'published', publishedAt: new Date() },
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/ticketing/unpublish
router.post('/unpublish', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { publishStatus: 'draft', publishedAt: null },
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
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
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (event.publishStatus !== 'published') return res.status(404).json({ success: false, error: 'Event not found' });

    const types = event.ticketTypes.map((t: any) => ({
      ...t,
      available: t.quantity ? Math.max(0, t.quantity - t.sold) : null,
    }));

    return res.json({ success: true, data: { event, ticketTypes: types } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── PURCHASE ────────────────────────────────────────────────────────────── */

const uploadPurchaseProof = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WebP screenshots are allowed'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/events/:id/ticketing/purchase
router.post('/purchase', authMiddleware, purchaseLimiter, uploadPurchaseProof.single('screenshot'), async (req: any, res: any) => {
  try {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });

    const { event } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!event.isTicketed) return res.status(400).json({ success: false, error: 'This event does not sell tickets' });
    if (event.publishStatus !== 'published') return res.status(400).json({ success: false, error: 'Tickets are not on sale yet' });
    if (new Date(event.date) < new Date()) return res.status(400).json({ success: false, error: 'Event has already passed' });

    const now = new Date();
    if (event.ticketSaleStartsAt && now < event.ticketSaleStartsAt) {
      return res.status(400).json({ success: false, error: 'Ticket sales have not started' });
    }
    if (event.ticketSaleEndsAt && now > event.ticketSaleEndsAt) {
      return res.status(400).json({ success: false, error: 'Ticket sales have ended' });
    }

    const ticketType = await prisma.eventTicketType.findUnique({ where: { id: parsed.data.ticketTypeId, eventId: event.id } });
    if (!ticketType || !ticketType.isActive) return res.status(404).json({ success: false, error: 'Ticket type not found' });

    const qty = parsed.data.quantity;
    if (qty > ticketType.maxPerOrder) {
      return res.status(400).json({ success: false, error: `Maximum ${ticketType.maxPerOrder} tickets per order` });
    }

    const totalAmount = ticketType.price * qty;
    const isFree = totalAmount === 0;

    if (!isFree && !req.file) {
      return res.status(400).json({ success: false, error: 'Payment screenshot is required for paid tickets' });
    }

    let screenshotUrl: string | null = null;
    if (req.file && !isFree) {
      const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
      screenshotUrl = await uploadBuffer(req.file.buffer, 'tickets', { contentType: req.file.mimetype, ext });
    }

    const shouldAutoApprove = event.approvalMode === 'automatic';
    const status = shouldAutoApprove ? 'approved' : 'pending';
    const paymentStatus = isFree ? 'paid' : 'pending';

    const ticket = await prisma.$transaction(async (tx: any) => {
      // Atomic capacity check + increment to prevent overselling.
      const incrementResult = await tx.$executeRawUnsafe(
        'UPDATE event_ticket_types SET sold = sold + $1 WHERE id = $2 AND (quantity IS NULL OR sold + $1 <= quantity)',
        qty,
        ticketType.id
      );
      if (incrementResult !== 1) {
        throw new Error('Not enough tickets available');
      }

      const created = await tx.eventTicket.create({
        data: {
          eventId: event.id,
          ticketTypeId: ticketType.id,
          userId: req.user.id,
          ticketNumber: generateFriendlyTicketNumber(),
          status,
          paymentStatus,
          paymentMethod: isFree ? 'free' : (req.body.paymentMethod || 'mobile_money'),
          paymentScreenshot: screenshotUrl,
          amount: totalAmount,
          currency: ticketType.currency,
          quantity: qty,
          buyerName: parsed.data.buyerName || req.user.name || null,
          buyerEmail: parsed.data.buyerEmail || req.user.email || null,
          buyerPhone: parsed.data.buyerPhone || req.user.phone || null,
          notes: parsed.data.notes || null,
          approvedAt: shouldAutoApprove ? new Date() : null,
        },
      });

      if (shouldAutoApprove) {
        const { payload } = generateTicketQrPayload(created.id, event.id, req.user.id, ticketType.id);
        await tx.eventTicket.update({ where: { id: created.id }, data: { qrPayload: payload } });
      }

      return created;
    });

    await updateEventAggregates(event.id);

    if (shouldAutoApprove) {
      await notifyUser(
        req.user.id,
        'TICKET_APPROVED',
        '🎟️ Ticket Confirmed',
        `Your ${ticketType.name} ticket for "${event.title}" is confirmed.`,
        `/user/tickets`,
        ticket.id
      );
    } else {
      await notifyUser(
        req.user.id,
        'TICKET_PURCHASED',
        'Ticket Purchase Submitted',
        `Your ${ticketType.name} ticket request for "${event.title}" is pending approval.`,
        `/user/tickets`,
        ticket.id
      );
    }

    await notifyOrganizer(
      event,
      'New Ticket Purchase',
      `${req.user.name || req.user.username} requested ${qty}x ${ticketType.name} for "${event.title}"`,
      `/dashboard/events/${event.id}/tickets`
    );

    const updatedTicketType = ticketType.quantity ? await prisma.eventTicketType.findUnique({ where: { id: ticketType.id } }) : null;
    if (updatedTicketType && updatedTicketType.quantity && updatedTicketType.sold >= updatedTicketType.quantity) {
      await notifyOrganizer(event, 'Ticket Type Sold Out', `${ticketType.name} for "${event.title}" is sold out.`, `/dashboard/events/${event.id}`);
    } else if (updatedTicketType && updatedTicketType.quantity && updatedTicketType.sold >= updatedTicketType.quantity * 0.9) {
      await notifyOrganizer(event, 'Ticket Type Nearly Sold Out', `${ticketType.name} for "${event.title}" is nearly sold out.`, `/dashboard/events/${event.id}`);
    }

    return res.status(201).json({ success: true, data: ticket });
  } catch (error: any) {
    if (error.message === 'Not enough tickets available') {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── ORGANIZER DASHBOARD ─────────────────────────────────────────────────── */

// GET /api/events/:id/ticketing/dashboard
router.get('/dashboard', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
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

    return res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── TICKET MANAGEMENT ───────────────────────────────────────────────────── */

// GET /api/events/:id/ticketing/tickets
router.get('/tickets', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const { status, search, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));

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

    const [tickets, total] = await Promise.all([
      prisma.eventTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          user: { select: { id: true, name: true, username: true, avatar: true, email: true, phone: true } },
          ticketType: { select: { id: true, name: true, price: true, currency: true } },
          scanLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.eventTicket.count({ where }),
    ]);

    return res.json({ success: true, data: tickets, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/ticketing/tickets/:ticketId/approve
router.post('/tickets/:ticketId/approve', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const ticket = await prisma.eventTicket.findFirst({ where: { id: req.params.ticketId, eventId: event.id }, include: { user: true, ticketType: true } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (ticket.status !== 'pending') return res.status(400).json({ success: false, error: `Ticket is already ${ticket.status}` });

    const { payload } = generateTicketQrPayload(ticket.id, event.id, ticket.userId, ticket.ticketTypeId);
    const updated = await prisma.eventTicket.update({
      where: { id: ticket.id },
      data: { status: 'approved', paymentStatus: 'paid', qrPayload: payload, approvedAt: new Date() },
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

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/ticketing/tickets/approve-all
router.post('/tickets/approve-all', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const pendingTickets = await prisma.eventTicket.findMany({
      where: { eventId: event.id, status: 'pending' },
      include: { ticketType: true },
    });

    const updatedIds: string[] = [];
    for (const ticket of pendingTickets) {
      const { payload } = generateTicketQrPayload(ticket.id, event.id, ticket.userId, ticket.ticketTypeId);
      await prisma.eventTicket.update({
        where: { id: ticket.id },
        data: { status: 'approved', paymentStatus: 'paid', qrPayload: payload, approvedAt: new Date() },
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
    }

    await updateEventAggregates(event.id);
    return res.json({ success: true, data: { approvedCount: updatedIds.length } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/ticketing/tickets/:ticketId/reject
router.post('/tickets/:ticketId/reject', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const parsed = ticketActionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid input' });

    const ticket = await prisma.eventTicket.findFirst({ where: { id: req.params.ticketId, eventId: event.id }, include: { user: true, ticketType: true } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (!['pending', 'approved'].includes(ticket.status)) return res.status(400).json({ success: false, error: `Cannot reject ticket with status ${ticket.status}` });

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

    return res.json({ success: true, data: { message: 'Ticket rejected' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/ticketing/tickets/:ticketId/cancel
router.post('/tickets/:ticketId/cancel', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const ticket = await prisma.eventTicket.findFirst({ where: { id: req.params.ticketId, eventId: event.id }, include: { ticketType: true } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (ticket.status === 'checked_in') return res.status(400).json({ success: false, error: 'Cannot cancel a checked-in ticket' });

    await prisma.$transaction(async (tx: any) => {
      await tx.eventTicket.update({ where: { id: ticket.id }, data: { status: 'cancelled', cancelledAt: new Date() } });
      if (ticket.ticketTypeId) {
        await tx.eventTicketType.update({ where: { id: ticket.ticketTypeId }, data: { sold: { decrement: ticket.quantity } } });
      }
    });

    await updateEventAggregates(event.id);
    return res.json({ success: true, data: { message: 'Ticket cancelled' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/ticketing/tickets/:ticketId/reissue-qr
router.post('/tickets/:ticketId/reissue-qr', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const ticket = await prisma.eventTicket.findFirst({ where: { id: req.params.ticketId, eventId: event.id } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (!['approved', 'checked_in'].includes(ticket.status)) return res.status(400).json({ success: false, error: 'Ticket must be approved to reissue QR' });

    const { payload } = reissueQrPayload(ticket.id, event.id, ticket.userId, ticket.ticketTypeId);
    const updated = await prisma.eventTicket.update({ where: { id: ticket.id }, data: { qrPayload: payload, status: 'approved', scannedAt: null, checkedInBy: null } });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/ticketing/tickets/:ticketId/edit-attendee
router.post('/tickets/:ticketId/edit-attendee', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const schema = z.object({ buyerName: z.string().max(200).optional(), buyerEmail: z.string().email().max(200).optional(), buyerPhone: z.string().max(50).optional(), internalNotes: z.string().max(1000).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid input' });

    const ticket = await prisma.eventTicket.findFirst({ where: { id: req.params.ticketId, eventId: event.id } });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    const updated = await prisma.eventTicket.update({ where: { id: ticket.id }, data: parsed.data });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── CUSTOMERS / EXPORT ──────────────────────────────────────────────────── */

// GET /api/events/:id/ticketing/customers
router.get('/customers', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!assertOwnerOrAdmin(isOwner, isAdmin, res)) return;

    const { search, status, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));

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
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { user: { select: { id: true, name: true, username: true, email: true, phone: true, avatar: true } }, ticketType: { select: { name: true } } },
      }),
      prisma.eventTicket.count({ where }),
    ]);

    return res.json({ success: true, data: customers, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/:id/ticketing/customers/export
router.get('/customers/export', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── SALES ANALYTICS ─────────────────────────────────────────────────────── */

// GET /api/events/:id/ticketing/analytics
router.get('/analytics', authMiddleware, requireLegend, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
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

    return res.json({
      success: true,
      data: {
        dailySales: Object.values(dailySales).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        hourlySales: Object.values(hourlySales).sort((a: any, b: any) => parseInt(a.hour) - parseInt(b.hour)),
        ticketTypeDistribution: Object.values(typeDistribution),
        revenue: event.totalRevenue,
        attendance: { approved: approvedCount, checkedIn: checkedInCount },
        conversionRate,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* ─── SCANNER ─────────────────────────────────────────────────────────────── */

// POST /api/events/:id/ticketing/scan
router.post('/scan', authMiddleware, async (req: any, res: any) => {
  try {
    const { qrPayload } = req.body;
    if (!qrPayload) return res.status(400).json({ success: false, error: 'QR payload is required' });

    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    const canScan = isOwner || isAdmin;
    if (!canScan) return res.status(403).json({ success: false, error: 'Only event organizers can scan tickets' });

    const decrypted = decryptQrPayload(qrPayload);
    if (!decrypted) {
      await prisma.eventScanLog.create({
        data: { ticketId: null, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'invalid', metadata: { reason: 'decrypt_failed' } },
      });
      return res.status(404).json({ success: false, error: 'INVALID', message: 'Invalid QR code' });
    }

    if (decrypted.eventId !== event.id) {
      await prisma.eventScanLog.create({
        data: { ticketId: null, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'wrong_event', metadata: { attemptedTicketId: decrypted.ticketId, expectedEventId: event.id, actualEventId: decrypted.eventId } },
      });
      return res.status(400).json({ success: false, error: 'WRONG_EVENT', message: 'This ticket is for a different event.' });
    }

    const ticket = await prisma.eventTicket.findUnique({
      where: { id: decrypted.ticketId },
      include: { user: { select: { id: true, name: true, username: true, avatar: true, email: true } }, ticketType: { select: { name: true } } },
    });

    if (!ticket || ticket.eventId !== event.id) {
      await prisma.eventScanLog.create({
        data: { ticketId: null, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'invalid', metadata: { attemptedTicketId: decrypted.ticketId, reason: 'ticket_not_found' } },
      });
      return res.status(404).json({ success: false, error: 'INVALID', message: 'Ticket not found' });
    }

    if (ticket.status === 'checked_in') {
      await prisma.eventScanLog.create({
        data: { ticketId: ticket.id, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'already_used', metadata: { scannedAt: ticket.scannedAt } },
      });
      return res.status(409).json({
        success: false,
        error: 'ALREADY_SCANNED',
        message: 'Ticket already used',
        data: { ticket, checkedInAt: ticket.scannedAt, checkedInBy: ticket.checkedInBy },
      });
    }

    if (ticket.status !== 'approved') {
      await prisma.eventScanLog.create({
        data: { ticketId: ticket.id, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'invalid', metadata: { reason: 'not_approved', status: ticket.status } },
      });
      return res.status(400).json({ success: false, error: 'NOT_APPROVED', message: `Ticket status is ${ticket.status}` });
    }

    // Atomic check-in: only update if still approved.
    const updated = await prisma.eventTicket.updateMany({
      where: { id: ticket.id, status: 'approved' },
      data: { status: 'checked_in', scannedAt: new Date(), checkedInBy: req.user.id },
    });

    if (updated.count === 0) {
      return res.status(409).json({ success: false, error: 'ALREADY_SCANNED', message: 'Ticket already used' });
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

    return res.json({ success: true, data: ticket, message: 'Valid ticket! Entry granted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/events/:id/ticketing/scan/:ticketId/checkin
router.post('/scan/:ticketId/checkin', authMiddleware, async (req: any, res: any) => {
  try {
    const { event, isOwner, isAdmin } = await getEventWithAuth(req.user.id, req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });

    const ticket = await prisma.eventTicket.findUnique({
      where: { id: req.params.ticketId },
      include: { user: { select: { id: true, name: true, username: true, avatar: true, email: true } }, ticketType: { select: { name: true } } },
    });

    if (!ticket || ticket.eventId !== event.id) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (ticket.status === 'checked_in') return res.status(409).json({ success: false, error: 'ALREADY_SCANNED', message: 'Already checked in' });
    if (ticket.status !== 'approved') return res.status(400).json({ success: false, error: 'NOT_APPROVED', message: `Ticket status is ${ticket.status}` });

    // Atomic check-in: only update if still approved.
    const updated = await prisma.eventTicket.updateMany({
      where: { id: ticket.id, status: 'approved' },
      data: { status: 'checked_in', scannedAt: new Date(), checkedInBy: req.user.id },
    });

    if (updated.count === 0) {
      return res.status(409).json({ success: false, error: 'ALREADY_SCANNED', message: 'Already checked in' });
    }

    await prisma.eventScanLog.create({
      data: { ticketId: ticket.id, eventId: event.id, scannedBy: req.user.id, scannerRole: req.user.role, status: 'valid', metadata: { manual: true } },
    });

    await updateEventAggregates(event.id);

    return res.json({ success: true, data: ticket });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
