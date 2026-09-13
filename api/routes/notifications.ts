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

const pushTokenSchema = z.object({
  token: z.string().min(10).max(255),
  platform: z.string().max(20).optional(),
});

// POST /api/notifications/push-token - Register an FCM device token for the current user
router.post('/push-token', authMiddleware, async (req, res) => {
  try {
    const parsed = pushTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid push token');
    }

    const { token, platform } = parsed.data;
    await prisma.pushToken.upsert({
      where: { token },
      update: { userId: req.user.id, platform: platform || null, lastSeenAt: new Date() },
      create: { userId: req.user.id, token, platform: platform || null },
    });

    return ok(res, { registered: true });
  } catch (error) {
    console.error('[Notifications] Push token register error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// DELETE /api/notifications/push-token - Remove all push tokens for the current user (logout)
router.delete('/push-token', authMiddleware, async (req, res) => {
  try {
    await prisma.pushToken.deleteMany({ where: { userId: req.user.id } });
    return ok(res, { removed: true });
  } catch (error) {
    console.error('[Notifications] Push token delete error:', error);
    return fail(res, 500, 'Internal server error');
  }
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
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.id);
    return ok(res, { count });
  } catch (error) {
    console.error('[notifications.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
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
    console.error('[notifications.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const result = await markAllAsRead(req.user.id);
    return ok(res, { updated: result.count });
  } catch (error) {
    console.error('[notifications.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
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
    console.error('[notifications.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
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
    console.error('[notifications.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
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
    console.error('[notifications.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
