const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');

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
      return res.json({ success: true, data: [] });
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

    return res.json({ success: true, data: conversations.filter(Boolean) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
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
      return res.status(404).json({ success: false, error: 'User not found' });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/messages - Send message
router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { receiverId, content, bookingId } = parsed.data;
    const senderId = req.user.id;

    // Prevent self-messaging
    if (senderId === receiverId) {
      return res.status(400).json({ success: false, error: 'Cannot message yourself' });
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return res.status(404).json({ success: false, error: 'Receiver not found' });
    }

    // Verify booking if provided
    if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      const isParticipant = booking.clientId === senderId || booking.djId === senderId ||
        booking.clientId === receiverId || booking.djId === receiverId;
      if (!isParticipant) {
        return res.status(403).json({ success: false, error: 'Not a participant in this booking' });
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

    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/messages/:id/read - Mark message as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    if (message.receiverId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (message.readAt) {
      return res.json({ success: true, data: message });
    }

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
