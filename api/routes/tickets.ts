const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const { uploadBuffer } = require('../utils/storage');

const router = express.Router({ mergeParams: true });

// Memory storage for screenshot uploads
const uploadScreenshot = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: check if DJ owns the event
async function getDjAndEvent(userId: string, eventId: string) {
  const [dj, event] = await Promise.all([
    prisma.djProfile.findUnique({ where: { userId } }),
    prisma.event.findUnique({ where: { id: eventId } }),
  ]);
  return { dj, event };
}

// ─── USER: POST /api/events/:id/tickets ─────────────────────────────────────
// Buy a ticket: upload payment screenshot
router.post('/', authMiddleware, uploadScreenshot.single('screenshot'), async (req: any, res: any) => {
  try {
    const { id: eventId } = req.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!event.isTicketed) return res.status(400).json({ success: false, error: 'This event does not sell tickets' });
    if (!req.file) return res.status(400).json({ success: false, error: 'Payment screenshot is required' });
    if (new Date(event.date) < new Date()) return res.status(400).json({ success: false, error: 'Cannot buy tickets for a past event' });

    // Check if already has a ticket (pending or approved)
    const existing = await prisma.eventTicket.findFirst({
      where: { eventId, userId: req.user.id, status: { in: ['pending', 'approved', 'scanned'] } },
    });
    if (existing) return res.status(409).json({ success: false, error: 'You already have a ticket for this event' });

    // Check capacity
    if (event.totalTickets) {
      const sold = await prisma.eventTicket.count({ where: { eventId, status: { in: ['approved', 'scanned'] } } });
      if (sold >= event.totalTickets) return res.status(400).json({ success: false, error: 'Event is sold out' });
    }

    // Upload screenshot
    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const screenshotUrl = await uploadBuffer(req.file.buffer, 'tickets', { contentType: req.file.mimetype, ext });

    const ticket = await prisma.eventTicket.create({
      data: {
        eventId,
        userId: req.user.id,
        paymentScreenshot: screenshotUrl,
        amount: event.ticketPrice || 0,
        currency: event.ticketCurrency || 'SLE',
        status: 'pending',
      },
    });

    // Notify DJ
    if (event.djId) {
      const djProfile = await prisma.djProfile.findUnique({ where: { id: event.djId }, include: { user: true } });
      if (djProfile?.userId) {
        await prisma.notification.create({
          data: {
            userId: djProfile.userId,
            type: 'TICKET_PURCHASED',
            title: 'New Ticket Purchase',
            body: `A user submitted a payment screenshot for "${event.title}". Review and approve or decline.`,
            actionUrl: `/dashboard/events`,
            entityId: ticket.id,
            entityType: 'EventTicket',
          },
        });
      }
    }

    return res.status(201).json({ success: true, data: ticket });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── DJ: GET /api/events/:id/tickets ─────────────────────────────────────────
// List all tickets for this event (DJ only)
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { id: eventId } = req.params;
    const { dj, event } = await getDjAndEvent(req.user.id, eventId);
    const isAdmin = req.user.role === 'ADMIN';
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!isAdmin && (!dj || event.djId !== dj.id)) return res.status(403).json({ success: false, error: 'Forbidden' });

    const tickets = await prisma.eventTicket.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, username: true, avatar: true, email: true } } },
    });

    return res.json({ success: true, data: tickets });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── USER: GET /api/events/:id/tickets/my ────────────────────────────────────
// Get the current user's ticket for this event
router.get('/my', authMiddleware, async (req: any, res: any) => {
  try {
    const { id: eventId } = req.params;
    const ticket = await prisma.eventTicket.findFirst({
      where: { eventId, userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: ticket || null });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── DJ: PUT /api/events/:id/tickets/:ticketId/approve ───────────────────────
router.put('/:ticketId/approve', authMiddleware, async (req: any, res: any) => {
  try {
    const { id: eventId, ticketId } = req.params;
    const { dj, event } = await getDjAndEvent(req.user.id, eventId);
    const isAdmin = req.user.role === 'ADMIN';
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!isAdmin && (!dj || event.djId !== dj.id)) return res.status(403).json({ success: false, error: 'Forbidden' });

    const ticket = await prisma.eventTicket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.eventId !== eventId) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (ticket.status !== 'pending') return res.status(400).json({ success: false, error: `Ticket is already ${ticket.status}` });

    // Generate a unique QR token
    const qrCode = `DS-${eventId.slice(-6).toUpperCase()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    const updated = await prisma.eventTicket.update({
      where: { id: ticketId },
      data: { status: 'approved', qrCode, approvedAt: new Date() },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: 'TICKET_APPROVED',
        title: '🎟️ Ticket Approved!',
        body: `Your ticket for "${event.title}" has been approved. Your QR code is ready!`,
        actionUrl: `/events/${eventId}`,
        entityId: ticket.id,
        entityType: 'EventTicket',
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── DJ: PUT /api/events/:id/tickets/:ticketId/decline ───────────────────────
router.put('/:ticketId/decline', authMiddleware, async (req: any, res: any) => {
  try {
    const { id: eventId, ticketId } = req.params;
    const { dj, event } = await getDjAndEvent(req.user.id, eventId);
    const isAdmin = req.user.role === 'ADMIN';
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!isAdmin && (!dj || event.djId !== dj.id)) return res.status(403).json({ success: false, error: 'Forbidden' });

    const ticket = await prisma.eventTicket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.eventId !== eventId) return res.status(404).json({ success: false, error: 'Ticket not found' });
    if (ticket.status !== 'pending') return res.status(400).json({ success: false, error: `Ticket is already ${ticket.status}` });

    const { reason } = req.body;
    const updated = await prisma.eventTicket.update({
      where: { id: ticketId },
      data: { status: 'declined', declineReason: reason || null },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: 'TICKET_DECLINED',
        title: 'Ticket Payment Declined',
        body: reason
          ? `Your payment for "${event.title}" was declined: ${reason}`
          : `Your payment for "${event.title}" was declined. Please re-submit.`,
        actionUrl: `/events/${eventId}`,
        entityId: ticket.id,
        entityType: 'EventTicket',
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ─── DJ: POST /api/events/:id/tickets/scan ───────────────────────────────────
// Scan and validate a QR code (marks ticket as scanned, one-time only)
router.post('/scan', authMiddleware, async (req: any, res: any) => {
  try {
    const { id: eventId } = req.params;
    const { qrCode } = req.body;
    if (!qrCode) return res.status(400).json({ success: false, error: 'QR code is required' });

    const { dj, event } = await getDjAndEvent(req.user.id, eventId);
    const isAdmin = req.user.role === 'ADMIN';
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (!isAdmin && (!dj || event.djId !== dj.id)) return res.status(403).json({ success: false, error: 'Forbidden' });

    const ticket = await prisma.eventTicket.findUnique({ where: { qrCode } });

    if (!ticket) return res.status(404).json({ success: false, error: 'INVALID', message: 'QR code not found. Invalid ticket.' });
    if (ticket.eventId !== eventId) return res.status(400).json({ success: false, error: 'WRONG_EVENT', message: 'This ticket is for a different event.' });
    if (ticket.status === 'scanned') return res.status(409).json({ success: false, error: 'ALREADY_SCANNED', message: 'Ticket already scanned.', scannedAt: ticket.scannedAt });
    if (ticket.status !== 'approved') return res.status(400).json({ success: false, error: 'NOT_APPROVED', message: `Ticket status is "${ticket.status}". Only approved tickets can be scanned.` });

    const updated = await prisma.eventTicket.update({
      where: { qrCode },
      data: { status: 'scanned', scannedAt: new Date() },
      include: { user: { select: { name: true, username: true, avatar: true } } },
    });

    return res.json({ success: true, data: updated, message: '✅ Valid ticket! Entry granted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
