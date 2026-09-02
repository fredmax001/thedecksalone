const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { createNotification, getUnreadCount, markAllAsRead } = require('../utils/notifications');
const { ok, fail } = require('../utils/response');

const router = express.Router();

const listSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  unreadOnly: z.string().optional(),
});

// GET /api/notifications - List current user's notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid query parameters');
    }

    const { page, limit, unreadOnly } = parsed.data;
    const userId = req.user.id;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return res.json({
      success: true,
      data: notifications,
      meta: {
        total,
        unreadCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[Notifications] List error:', error);
    return fail(res, 500, error.message);
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.id);
    return ok(res, { count });
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return fail(res, 404, 'Notification not found');
    }

    if (notification.userId !== req.user.id) {
      return fail(res, 403, 'Forbidden');
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    return ok(res, updated);
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const result = await markAllAsRead(req.user.id);
    return ok(res, { updated: result.count });
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

// DELETE /api/notifications/clear-all - Delete all notifications for the current user
router.delete('/clear-all', authMiddleware, async (req, res) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: { userId: req.user.id }
    });
    return ok(res, { deleted: result.count });
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return fail(res, 404, 'Notification not found');
    }

    if (notification.userId !== req.user.id) {
      return fail(res, 403, 'Forbidden');
    }

    await prisma.notification.delete({ where: { id: req.params.id } });
    return ok(res, { deleted: true });
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

// POST /api/notifications - Create a notification (admin/system use)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Only admins can create notifications for other users
    if (!['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return fail(res, 403, 'Forbidden');
    }

    const { userId, type, title, body, actionUrl, entityId, entityType, metadata } = req.body;

    if (!userId || !type || !title || !body) {
      return fail(res, 400, 'userId, type, title, and body are required');
    }

    const notification = await createNotification({
      userId,
      type,
      title,
      body,
      actionUrl,
      entityId,
      entityType,
      metadata,
    });

    return res.status(201).json({ success: true, data: notification });
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

module.exports = router;
