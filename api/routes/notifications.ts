const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { createNotification, getUnreadCount, markAllAsRead } = require('../utils/notifications');

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
      return res.status(400).json({ success: false, error: 'Invalid query parameters' });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.id);
    return res.json({ success: true, data: { count } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const result = await markAllAsRead(req.user.id);
    return res.json({ success: true, data: { updated: result.count } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.notification.delete({ where: { id: req.params.id } });
    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/notifications - Create a notification (admin/system use)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Only admins can create notifications for other users
    if (!['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { userId, type, title, body, actionUrl, entityId, entityType, metadata } = req.body;

    if (!userId || !type || !title || !body) {
      return res.status(400).json({ success: false, error: 'userId, type, title, and body are required' });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
