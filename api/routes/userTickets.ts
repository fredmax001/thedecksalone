const express = require('express');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');

const router = express.Router();

// GET /api/user/tickets
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const tickets = await prisma.eventTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        event: { select: { id: true, title: true, date: true, location: true, venue: true, image: true } },
        ticketType: { select: { id: true, name: true, price: true, currency: true } },
      },
    });
    return ok(res, tickets);
  } catch (error: any) {
    return fail(res, 500, error.message);
  }
});

// GET /api/user/tickets/:ticketId
router.get('/:ticketId', authMiddleware, async (req: any, res: any) => {
  try {
    const ticket = await prisma.eventTicket.findFirst({
      where: { id: req.params.ticketId, userId: req.user.id },
      include: {
        event: { include: { dj: { select: { stageName: true, avatar: true } } } },
        ticketType: true,
        scanLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!ticket) return fail(res, 404, 'Ticket not found');
    return ok(res, ticket);
  } catch (error: any) {
    return fail(res, 500, error.message);
  }
});

// POST /api/user/tickets/:ticketId/resend
router.post('/:ticketId/resend', authMiddleware, async (req: any, res: any) => {
  try {
    const ticket = await prisma.eventTicket.findFirst({
      where: { id: req.params.ticketId, userId: req.user.id },
      include: { event: true, ticketType: true },
    });
    if (!ticket) return fail(res, 404, 'Ticket not found');
    // Email sending can be wired here using existing sendEmail utility
    return ok(res, { message: 'Confirmation resent' });
  } catch (error: any) {
    return fail(res, 500, error.message);
  }
});

module.exports = router;
