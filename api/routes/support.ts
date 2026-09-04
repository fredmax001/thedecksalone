const express = require('express');
const { ok, fail } = require('../utils/response');
const router = express.Router();
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

// All routes mounted under /api/support already pass through authMiddleware in server.ts
const STAFF_ROLES = ['SUPPORT_ADMIN', 'ADMIN'];

const isStaff = (user: any) => !!user && STAFF_ROLES.includes(user.role);

const createTicketSchema = z.object({
  subject: z.string().min(3).max(120),
  message: z.string().min(1).max(2000),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

const replySchema = z.object({
  message: z.string().min(1).max(2000),
});

const updateStatusSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  note: z.string().min(1).max(2000).optional(),
});

const userSelect = { id: true, username: true, email: true, avatar: true };

// SupportTicketReply.authorId is a plain field (no Prisma relation), so usernames
// are resolved with a batched lookup and attached as `author: { username }`.
async function attachReplyAuthors(replies: any[]) {
  const authorIds = [...new Set(replies.map((r) => r.authorId))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, username: true },
  });
  const byId = new Map(authors.map((a: any) => [a.id, a.username]));
  return replies.map((r) => ({
    ...r,
    author: { username: byId.get(r.authorId) || null },
  }));
}

// POST /api/support/tickets - Create a support ticket (any authenticated user)
router.post('/tickets', asyncHandler(async (req: any, res: any) => {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid ticket data', { details: parsed.error.flatten() });
  }

  const { subject, message, priority } = parsed.data;
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: req.user.id,
      subject,
      message,
      priority: priority || 'medium',
    },
  });

  return ok(res, { ticket });
}));

// GET /api/support/tickets/mine - Current user's tickets, newest first
router.get('/tickets/mine', asyncHandler(async (req: any, res: any) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { replies: true } },
    },
  });

  return ok(res, {
    tickets: tickets.map((t: any) => ({
      ...t,
      replyCount: t._count.replies,
      _count: undefined,
    })),
  });
}));

// GET /api/support/tickets/meta/counts - Per-status counts for staff dashboard tabs
router.get('/tickets/meta/counts', requireRole('SUPPORT_ADMIN', 'ADMIN'), asyncHandler(async (req: any, res: any) => {
  const grouped = await prisma.supportTicket.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  const counts: Record<string, number> = { open: 0, pending: 0, resolved: 0, closed: 0 };
  let total = 0;
  for (const g of grouped) {
    if (g.status in counts) counts[g.status] = g._count._all;
    total += g._count._all;
  }

  return ok(res, { ...counts, total });
}));

// GET /api/support/tickets - List tickets (SUPPORT_ADMIN / ADMIN)
router.get('/tickets', requireRole('SUPPORT_ADMIN', 'ADMIN'), asyncHandler(async (req: any, res: any) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const where = status ? { status } : {};
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, username: true, email: true, avatar: true } },
        _count: { select: { replies: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return ok(res, {
    tickets: tickets.map((t: any) => ({
      ...t,
      replyCount: t._count.replies,
      _count: undefined,
    })),
    meta: { total, page, limit },
  });
}));

// GET /api/support/tickets/:id - Ticket detail (owner or staff)
router.get('/tickets/:id', asyncHandler(async (req: any, res: any) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: userSelect },
      replies: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!ticket) {
    return fail(res, 404, 'Ticket not found');
  }
  if (ticket.userId !== req.user.id && !isStaff(req.user)) {
    return fail(res, 403, 'Forbidden');
  }

  ticket.replies = await attachReplyAuthors(ticket.replies);
  return ok(res, { ticket });
}));

// POST /api/support/tickets/:id/reply - Reply to a ticket (owner or staff)
router.post('/tickets/:id/reply', asyncHandler(async (req: any, res: any) => {
  const parsed = replySchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid reply data', { details: parsed.error.flatten() });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) {
    return fail(res, 404, 'Ticket not found');
  }
  if (ticket.userId !== req.user.id && !isStaff(req.user)) {
    return fail(res, 403, 'Forbidden');
  }

  const staff = isStaff(req.user);
  await prisma.supportTicketReply.create({
    data: {
      ticketId: ticket.id,
      authorId: req.user.id,
      message: parsed.data.message,
      isStaff: staff,
    },
  });

  // Owner replying re-opens a pending ticket; staff reply moves it to pending
  let status = ticket.status;
  if (!staff && ticket.status === 'pending') status = 'open';
  if (staff && ticket.status === 'open') status = 'pending';

  const replies = await prisma.$transaction(async (tx: any) => {
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: { status },
    });
    return tx.supportTicketReply.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
    });
  });

  const repliesWithAuthors = await attachReplyAuthors(replies);

  return ok(res, { replies: repliesWithAuthors });
}));

// PUT /api/support/tickets/:id/status - Update status/priority, optional staff note (SUPPORT_ADMIN / ADMIN)
router.put('/tickets/:id/status', requireRole('SUPPORT_ADMIN', 'ADMIN'), asyncHandler(async (req: any, res: any) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid update data', { details: parsed.error.flatten() });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) {
    return fail(res, 404, 'Ticket not found');
  }

  const { status, priority, note } = parsed.data;
  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(status === 'resolved' ? { resolvedAt: new Date() } : {}),
    },
  });

  if (note) {
    await prisma.supportTicketReply.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user.id,
        message: note,
        isStaff: true,
      },
    });
  }

  return ok(res, { ticket: updated });
}));

module.exports = router;
