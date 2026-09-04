const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');

const { createNotification } = require('../utils/notifications');
const { ok, fail } = require('../utils/response');

const router = express.Router();

const messageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1).max(2000),
  bookingId: z.string().optional(),
});

// GET /api/messages/conversations - List user's conversations
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all unique users the current user has messaged with
    const [sentTo, receivedFrom] = await Promise.all([
      prisma.message.findMany({
        where: { senderId: userId, deletedBySender: false },
        select: { receiverId: true },
        distinct: ['receiverId'],
      }),
      prisma.message.findMany({
        where: { receiverId: userId, deletedByReceiver: false },
        select: { senderId: true },
        distinct: ['senderId'],
      }),
    ]);

    const partnerIds = new Set([
      ...sentTo.map((m) => m.receiverId),
      ...receivedFrom.map((m) => m.senderId),
    ]);

    if (partnerIds.size === 0) {
      return ok(res, []);
    }

    // Get user details and last message for each conversation
    const conversations = await Promise.all(
      Array.from(partnerIds).map(async (partnerId) => {
        const [partner, lastMessage, unreadCount] = await Promise.all([
          prisma.user.findUnique({
            where: { id: partnerId },
            select: { id: true, username: true, email: true, djProfile: { select: { stageName: true, avatar: true } } },
          }),
          prisma.message.findFirst({
            where: {
              OR: [
                { senderId: userId, receiverId: partnerId, deletedBySender: false },
                { senderId: partnerId, receiverId: userId, deletedByReceiver: false },
              ],
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.message.count({
            where: {
              senderId: partnerId,
              receiverId: userId,
              readAt: null,
              deletedByReceiver: false,
            },
          }),
        ]);

        if (!partner) return null;

        const displayName = partner.djProfile?.stageName || partner.username || partner.email;

        return {
          userId: partner.id,
          name: displayName,
          avatar: partner.djProfile?.avatar || null,
          lastMessage: lastMessage?.content || '',
          lastMessageAt: lastMessage?.createdAt || new Date(),
          unreadCount,
        };
      })
    );

    return ok(res, conversations.filter(Boolean));
  } catch (error) {
    console.error('[messages.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/messages/:userId - Get conversation with specific user
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const partnerId = req.params.userId;

    // Verify partner exists
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, username: true, email: true, djProfile: { select: { stageName: true, avatar: true } } },
    });
    if (!partner) {
      return fail(res, 404, 'User not found');
    }

    // Fetch messages between users
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId, deletedBySender: false },
          { senderId: partnerId, receiverId: userId, deletedByReceiver: false },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return res.json({
      success: true,
      data: messages,
      partner: {
        id: partner.id,
        name: partner.djProfile?.stageName || partner.username || partner.email,
        avatar: partner.djProfile?.avatar || null,
      },
    });
  } catch (error) {
    console.error('[messages.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/messages - Send message
router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
    }

    const { receiverId, content, bookingId } = parsed.data;
    const senderId = req.user.id;

    // Prevent self-messaging
    if (senderId === receiverId) {
      return fail(res, 400, 'Cannot message yourself');
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return fail(res, 404, 'Receiver not found');
    }

    // Verify booking if provided
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { dj: { select: { userId: true } } },
      });
      if (!booking) {
        return fail(res, 404, 'Booking not found');
      }
      const isParticipant = booking.clientId === senderId || booking.dj?.userId === senderId ||
        booking.clientId === receiverId || booking.dj?.userId === receiverId;
      if (!isParticipant) {
        return fail(res, 403, 'Not a participant in this booking');
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        bookingId: bookingId || null,
      },
    });

    // Notify receiver about new message
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: {
        username: true,
        email: true,
        djProfile: { select: { stageName: true, avatar: true } },
      },
    });

    const senderName = sender?.djProfile?.stageName || sender?.username || sender?.email || 'Someone';

    await createNotification({
      userId: receiverId,
      type: 'NEW_MESSAGE',
      title: `New message from ${senderName}`,
      body: content.slice(0, 120),
      actionUrl: bookingId ? `/user/messages` : `/user/messages`,
      entityId: message.id,
      entityType: 'message',
      metadata: { senderId, senderName, bookingId },
      sendEmail: true,
      emailSubject: `New Message from ${senderName} - Deck Salone`,
    });

    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('[messages.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// PATCH /api/messages/:id/read - Mark message as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) {
      return fail(res, 404, 'Message not found');
    }
    if (message.receiverId !== req.user.id) {
      return fail(res, 403, 'Forbidden');
    }
    if (message.readAt) {
      return ok(res, message);
    }

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });

    return ok(res, updated);
  } catch (error) {
    console.error('[messages.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
