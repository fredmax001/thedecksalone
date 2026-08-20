const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { searchLimiter } = require('../utils/rateLimiter');
const bcrypt = require('bcryptjs');
const { uploadAvatar, uploadDocument } = require('../utils/upload');
const { processAvatar } = require('../utils/imageProcessor');
const { uploadBuffer, deleteFile } = require('../utils/storage');

function extFromMime(mimetype, fallbackName = '') {
  const fromMime = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  if (fromMime[mimetype]) return fromMime[mimetype];
  const ext = fallbackName.split('.').pop();
  return ext && ext.length <= 5 ? ext : 'bin';
}

const router = express.Router();

const feedFilterSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  since: z.string().datetime().optional(),
});

// GET /api/users/activity - Current user's activity history
// Returns: mix likes, ratings given, battle votes, and saved events (when model exists)
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [mixLikes, reviews, battleVotes] = await Promise.all([
      prisma.mixLike.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          mix: {
            select: {
              id: true,
              title: true,
              coverImage: true,
              genre: true,
              dj: { select: { id: true, stageName: true, avatar: true } },
            },
          },
        },
      }),
      prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          dj: {
            select: { id: true, stageName: true, avatar: true },
          },
        },
      }),
      prisma.battleVote.findMany({
        where: { userId },
        orderBy: { id: 'desc' },
        take: 50,
        include: {
          entry: {
            select: {
              id: true,
              dj: { select: { id: true, stageName: true, avatar: true } },
              battle: { select: { id: true, title: true, weekStart: true, status: true } },
            },
          },
        },
      }),
    ]);

    // Build flat activity array matching frontend ActivityItem type
    const activities = [
      ...mixLikes.map((like) => ({
        id: like.id,
        type: 'LIKE_MIX',
        title: like.mix.title,
        subtitle: like.mix.dj.stageName,
        thumbnail: like.mix.coverImage,
        createdAt: like.createdAt,
        meta: { mixId: like.mix.id, djId: like.mix.dj.id },
      })),
      ...reviews.map((review) => ({
        id: review.id,
        type: 'RATE_DJ',
        title: review.dj.stageName,
        subtitle: `Rated ${review.rating} stars`,
        thumbnail: review.dj.avatar,
        createdAt: review.createdAt,
        meta: { djId: review.dj.id, rating: review.rating },
      })),
      ...battleVotes.map((vote) => ({
        id: vote.id,
        type: 'BATTLE_VOTE',
        title: vote.entry.battle.title,
        subtitle: vote.entry.dj.stageName,
        thumbnail: vote.entry.dj.avatar,
        createdAt: vote.entry.battle.weekStart || new Date(),
        meta: { battleId: vote.entry.battle.id, entryId: vote.entry.id },
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/users/following-feed - New content from DJs the user follows
router.get('/following-feed', authMiddleware, async (req, res) => {
  try {
    const parsed = feedFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { page, limit, since } = parsed.data;
    const userId = req.user.id;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

    // Get IDs of DJs the user follows
    const follows = await prisma.follow.findMany({
      where: { userId },
      select: { djId: true },
    });
    const followedDjIds = follows.map((f) => f.djId);

    if (followedDjIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        meta: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
      });
    }

    const sinceDate = since ? new Date(since) : new Date(Date.now() - 30 * 86400000); // default 30 days

    // Fetch new mixes and events from followed DJs
    const [newMixes, newEvents] = await Promise.all([
      prisma.mix.findMany({
        where: {
          djId: { in: followedDjIds },
          isPublic: true,
          createdAt: { gte: sinceDate },
        },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        include: {
          dj: { select: { id: true, stageName: true, avatar: true } },
        },
      }),
      prisma.event.findMany({
        where: {
          djId: { in: followedDjIds },
          createdAt: { gte: sinceDate },
        },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        include: {
          dj: { select: { id: true, stageName: true, avatar: true } },
        },
      }),
    ]);

    // Merge and sort all feed items by createdAt desc
    const feedItems = [
      ...newMixes.map((m) => ({
        id: `mix_${m.id}`,
        type: 'mix',
        createdAt: m.createdAt,
        data: m,
      })),
      ...newEvents.map((e) => ({
        id: `event_${e.id}`,
        type: 'event',
        createdAt: e.createdAt,
        data: e,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Manual pagination after merging
    const total = feedItems.length;
    const start = (pageNum - 1) * limitNum;
    const paginated = feedItems.slice(start, start + limitNum);

    return res.json({
      success: true,
      data: paginated,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/users/notifications - Synthetic notification feed
// Since there is no Notification table, this aggregates relevant recent activity
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const parsed = feedFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { page, limit } = parsed.data;
    const userId = req.user.id;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));

    const sinceDate = new Date(Date.now() - 30 * 86400000); // 30 days

    // Booking updates for this user
    const bookingUpdates = await prisma.booking.findMany({
      where: {
        clientId: userId,
        updatedAt: { gte: sinceDate },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: {
        dj: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    // Unread messages
    const unreadMessages = await prisma.message.findMany({
      where: {
        receiverId: userId,
        readAt: null,
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            djProfile: { select: { stageName: true, avatar: true } },
          },
        },
      },
    });

    // Followed DJs — get their recent mixes/events
    const follows = await prisma.follow.findMany({
      where: { userId },
      select: { djId: true },
    });
    const followedDjIds = follows.map((f) => f.djId);

    let newFollowedContent = [];
    if (followedDjIds.length > 0) {
      const [followedMixes, followedEvents] = await Promise.all([
        prisma.mix.findMany({
          where: {
            djId: { in: followedDjIds },
            isPublic: true,
            createdAt: { gte: sinceDate },
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: {
            dj: { select: { id: true, stageName: true, avatar: true } },
          },
        }),
        prisma.event.findMany({
          where: {
            djId: { in: followedDjIds },
            createdAt: { gte: sinceDate },
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: {
            dj: { select: { id: true, stageName: true, avatar: true } },
          },
        }),
      ]);

      newFollowedContent = [
        ...followedMixes.map((m) => ({
          id: `new_mix_${m.id}`,
          type: 'new_mix',
          createdAt: m.createdAt,
          read: true, // content notifications are implicitly "read"
          title: `New mix from ${m.dj.stageName}`,
          body: m.title,
          data: { mixId: m.id, djId: m.dj.id },
        })),
        ...followedEvents.map((e) => ({
          id: `new_event_${e.id}`,
          type: 'new_event',
          createdAt: e.createdAt,
          read: true,
          title: `New event from ${e.dj?.stageName || 'a DJ you follow'}`,
          body: e.title,
          data: { eventId: e.id, djId: e.djId },
        })),
      ];
    }

    // Build notification objects
    const bookingNotifications = bookingUpdates.map((b) => {
      const isNew = b.createdAt.getTime() === b.updatedAt.getTime();
      return {
        id: `booking_${b.id}`,
        type: isNew ? 'booking_created' : 'booking_updated',
        createdAt: b.updatedAt,
        read: false, // TODO: track read state with Notification model
        title: isNew ? 'Booking request sent' : `Booking ${b.status.toLowerCase()}`,
        body: isNew
          ? `You requested ${b.dj.stageName} for ${b.eventType}`
          : `Your booking with ${b.dj.stageName} is now ${b.status}`,
        data: { bookingId: b.id, djId: b.dj.id, status: b.status },
      };
    });

    const messageNotifications = unreadMessages.map((m) => ({
      id: `msg_${m.id}`,
      type: 'new_message',
      createdAt: m.createdAt,
      read: false,
      title: `New message from ${m.sender.djProfile?.stageName || m.sender.username || m.sender.email}`,
      body: m.content.slice(0, 120),
      data: { messageId: m.id, senderId: m.sender.id },
    }));

    // Merge all notifications, newest first
    const allNotifications = [
      ...bookingNotifications,
      ...messageNotifications,
      ...newFollowedContent,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allNotifications.length;
    const start = (pageNum - 1) * limitNum;
    const paginated = allNotifications.slice(start, start + limitNum);

    return res.json({
      success: true,
      data: paginated,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ─────────────────── Profile Endpoints ─────────────────── */

const GENDER_VALUES = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;

const updateProfileSchema = z.object({
  username: z.string().max(50).optional().nullable().or(z.literal('')),
  email: z.string().optional().nullable().or(z.literal('')),
  name: z.string().max(100).optional().nullable().or(z.literal('')),
  bio: z.string().max(2000).optional().nullable().or(z.literal('')),
  location: z.string().max(100).optional().nullable().or(z.literal('')),
  gender: z.string().max(50).optional().nullable().or(z.literal('')),
  dateOfBirth: z.string().optional().nullable().or(z.literal('')),
  avatar: z.string().optional().nullable().or(z.literal('')),
  favoriteGenres: z.array(z.string()).optional().nullable(),
  social: z.object({
    instagram: z.string().optional().nullable().or(z.literal('')),
    twitter: z.string().optional().nullable().or(z.literal('')),
    facebook: z.string().optional().nullable().or(z.literal('')),
  }).optional().nullable(),
});

// GET /api/users/profile - Current user's extended profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        location: true,
        gender: true,
        dateOfBirth: true,
        avatar: true,
        favoriteGenres: true,
        socialLinks: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        ...user,
        social: user.socialLinks || {},
      },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/users/profile - Update current user's profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { username, email, name, bio, location, gender, dateOfBirth, avatar, favoriteGenres, social } = parsed.data;
    const updateData: any = {};

    if (gender !== undefined) {
      updateData.gender = gender === '' ? null : gender;
    }

    if (username && username.trim() !== '') {
      const normalized = username.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { username: normalized } });
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
      updateData.username = normalized;
    }

    if (email && email.trim() !== '') {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ success: false, error: 'Email already in use' });
      }
      updateData.email = normalizedEmail;
    }

    if (dateOfBirth !== undefined) {
      if (!dateOfBirth || dateOfBirth.trim() === '') {
        updateData.dateOfBirth = null;
      } else {
        const parsedDate = new Date(dateOfBirth);
        if (!Number.isNaN(parsedDate.getTime())) {
          updateData.dateOfBirth = parsedDate;
        }
      }
    }

    if (avatar !== undefined && avatar !== '') {
      updateData.avatar = avatar;
    }

    if (name !== undefined) updateData.name = name || null;
    if (bio !== undefined) updateData.bio = bio || null;
    if (location !== undefined) updateData.location = location || null;
    if (favoriteGenres !== undefined) updateData.favoriteGenres = favoriteGenres;
    if (social !== undefined) updateData.socialLinks = social;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        location: true,
        gender: true,
        dateOfBirth: true,
        avatar: true,
        favoriteGenres: true,
        socialLinks: true,
        role: true,
      },
    });

    if (updateData.avatar) {
      await prisma.djProfile.updateMany({
        where: { userId: req.user.id },
        data: { avatar: updateData.avatar },
      }).catch(() => {});
    }

    return res.json({
      success: true,
      data: { ...user, social: user.socialLinks || {} },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/users/avatar - Upload user avatar
router.put('/avatar', authMiddleware, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, avatar: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Process and resize avatar
    const { buffer, contentType, ext } = await processAvatar(req.file.buffer);

    // Upload to storage (S3 or local)
    const avatarUrl = await uploadBuffer(buffer, 'avatars', { ext, contentType });

    // Delete old avatar if exists
    if (user.avatar) {
      try {
        await deleteFile(user.avatar);
      } catch (err) {
        console.warn('Failed to delete old avatar:', err.message);
      }
    }

    // Update user record
    await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
    });

    // Sync to DjProfile if user is a DJ
    await prisma.djProfile.updateMany({
      where: { userId: req.user.id },
      data: { avatar: avatarUrl },
    }).catch(() => { });

    return res.json({ success: true, data: { avatar: avatarUrl } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/users/password - Change current user's password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Current password and new password (min 6 chars) are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return res.status(400).json({ success: false, error: 'User not found or no password set' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    return res.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/users/following - DJs the user follows (with latest mix / event)
router.get('/following', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const follows = await prisma.follow.findMany({
      where: { userId },
      include: {
        dj: {
          select: {
            id: true,
            stageName: true,
            avatar: true,
            city: true,
            genres: true,
            _count: { select: { followers: true } },
            mixes: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, title: true, coverImage: true, createdAt: true },
            },
            events: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, title: true, date: true, city: true },
            },
          },
        },
      },
    });

    const data = follows.map((f) => ({
      id: f.dj.id,
      stageName: f.dj.stageName,
      avatar: f.dj.avatar,
      city: f.dj.city,
      genre: f.dj.genres,
      followerCount: f.dj._count.followers,
      latestMix: f.dj.mixes[0]
        ? {
          id: f.dj.mixes[0].id,
          title: f.dj.mixes[0].title,
          coverArt: f.dj.mixes[0].coverImage,
          createdAt: f.dj.mixes[0].createdAt,
        }
        : undefined,
      latestEvent: f.dj.events[0]
        ? {
          id: f.dj.events[0].id,
          title: f.dj.events[0].title,
          eventDate: f.dj.events[0].date,
          city: f.dj.events[0].city,
        }
        : undefined,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /api/users/notifications/:id/read - Mark notification as read
router.patch('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Notifications are synthetic; nothing to persist yet.
    return res.json({ success: true, data: { id, read: true } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /api/users/notifications/read-all - Mark all notifications as read
router.patch('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    // Notifications are synthetic; nothing to persist yet.
    return res.json({ success: true, data: { read: true } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/users/search - Search for users by name/username/email (for DJs to find clients)
router.get('/search', authMiddleware, searchLimiter, async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters' });
    }
    const searchTerm = q.trim();
    const take = Math.min(20, Math.max(1, parseInt(limit as string) || 10));

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user.id } }, // Exclude self
          {
            OR: [
              { username: { contains: searchTerm, mode: 'insensitive' } },
              { name: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
      },
      take,
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name || u.username || u.email,
        avatar: u.avatar || null,
      })),
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/users/account - Delete the authenticated user's account and all related data
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { djProfile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await prisma.$transaction(async (tx) => {
      // User-scoped relations that do not cascade on user delete
      await tx.notification.deleteMany({ where: { userId } });
      await tx.battleVote.deleteMany({ where: { userId } });
      await tx.mixLike.deleteMany({ where: { userId } });
      await tx.follow.deleteMany({ where: { userId } });
      await tx.message.deleteMany({ where: { senderId: userId } });
      await tx.message.deleteMany({ where: { receiverId: userId } });
      await tx.review.deleteMany({ where: { userId } });
      await tx.payment.deleteMany({ where: { clientId: userId } });
      await tx.booking.deleteMany({ where: { clientId: userId } });

      // DJ-scoped relations (if the user has a DJ profile)
      if (user.djProfile) {
        const djId = user.djProfile.id;

        await tx.review.deleteMany({ where: { djId } });
        await tx.payment.deleteMany({ where: { djId } });
        await tx.booking.deleteMany({ where: { djId } });
        await tx.event.deleteMany({ where: { djId } });
        await tx.battleEntry.deleteMany({ where: { djId } });
        await tx.mix.deleteMany({ where: { djId } });
        await tx.djPhoto.deleteMany({ where: { djId } });
        await tx.streamingPlatform.deleteMany({ where: { djId } });
        await tx.rankingHistory.deleteMany({ where: { djId } });
        await tx.gigApplication.deleteMany({ where: { djId } });
        await tx.proSubscriptionRequest.deleteMany({ where: { djId } });
        await tx.oppApplications.deleteMany({ where: { djId } });
        await tx.follow.deleteMany({ where: { djId } });

        await tx.djProfile.delete({ where: { id: djId } });
      }

      await tx.user.delete({ where: { id: userId } });
    });

    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ─────────────────── Settings Endpoints ─────────────────── */

const notificationPrefsSchema = z.object({
  emailBookings: z.boolean().optional(),
  emailMessages: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
  pushBookings: z.boolean().optional(),
  pushMessages: z.boolean().optional(),
  pushNewMixes: z.boolean().optional(),
});

const privacyPrefsSchema = z.object({
  profilePublic: z.boolean().optional(),
  allowMessages: z.boolean().optional(),
  showEarnings: z.boolean().optional(),
  showActivity: z.boolean().optional(),
});

const settingsSchema = z.object({
  notifications: notificationPrefsSchema.optional(),
  privacy: privacyPrefsSchema.optional(),
});

// GET /api/users/settings - Get current user's settings (notifications + privacy)
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        notificationPreferences: true,
        privacyPreferences: true,
        djProfile: { select: { isPublic: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Merge stored preferences with defaults
    const defaultNotifications = {
      emailBookings: true,
      emailMessages: true,
      emailMarketing: false,
      pushBookings: true,
      pushMessages: true,
      pushNewMixes: true,
    };

    const defaultPrivacy = {
      profilePublic: true,
      allowMessages: true,
      showEarnings: false,
      showActivity: false,
    };

    const notifications = user.notificationPreferences
      ? { ...defaultNotifications, ...(user.notificationPreferences as Record<string, boolean>) }
      : defaultNotifications;

    const privacy = user.privacyPreferences
      ? { ...defaultPrivacy, ...(user.privacyPreferences as Record<string, boolean>) }
      : defaultPrivacy;

    // Override profilePublic with DjProfile.isPublic if DJ
    if (user.djProfile) {
      privacy.profilePublic = user.djProfile.isPublic;
    }

    return res.json({
      success: true,
      data: { notifications, privacy },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/users/settings - Update current user's settings
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { notifications, privacy } = parsed.data;
    const userId = req.user.id;

    // Fetch current user to merge preferences
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true, privacyPreferences: true, djProfile: { select: { id: true } } },
    });

    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updateData: any = {};

    // Merge notification preferences
    if (notifications !== undefined) {
      const existing = (currentUser.notificationPreferences as Record<string, boolean>) || {};
      updateData.notificationPreferences = { ...existing, ...notifications };
    }

    // Merge privacy preferences (excluding profilePublic which is handled via DjProfile)
    if (privacy !== undefined) {
      const { profilePublic, ...restPrivacy } = privacy;
      const existing = (currentUser.privacyPreferences as Record<string, boolean>) || {};
      updateData.privacyPreferences = { ...existing, ...restPrivacy };

      // If profilePublic is provided and user has a DJ profile, update DjProfile.isPublic
      if (profilePublic !== undefined && currentUser.djProfile?.id) {
        await prisma.djProfile.update({
          where: { id: currentUser.djProfile.id },
          data: { isPublic: profilePublic },
        });
      }
    }

    // Update user preferences
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    return res.json({ success: true, data: { message: 'Settings updated' } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/users/public/:username - Public user profile lookup (no auth required)
// NOTE: Also mounted at server-level as /api/users/public/:username
router.get('/public/:username', async (req, res) => {
  try {
    const username = (req.params.username || '').toLowerCase();
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        location: true,
        avatar: true,
        favoriteGenres: true,
        role: true,
        createdAt: true,
        djProfile: {
          select: {
            id: true,
            stageName: true,
            bio: true,
            avatar: true,
            city: true,
            community: true,
            country: true,
            isPublic: true,
            subscriptionTier: true,
            verified: true,
            user: { select: { username: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        ...user,
        djProfile: user.role === 'DJ' && user.djProfile?.isPublic ? user.djProfile : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/my-dj-subscriptions - Active fan-to-DJ subscriptions for logged-in user
router.get('/my-dj-subscriptions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const subs = await prisma.djFanSubscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      include: {
        dj: {
          select: {
            id: true,
            stageName: true,
            avatar: true,
            city: true,
            subscriptionPrice: true,
            user: { select: { username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: subs });
  } catch (error) {
    console.error('[User DJ Subscriptions API] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users/subscription/request - Upgrade listener/user/DJ to Pro or Pro+
router.post('/subscription/request', authMiddleware, uploadDocument.single('proof'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan, amount, currency = 'SLE', paymentReference } = req.body;

    if (!plan) {
      return res.status(400).json({ success: false, error: 'Plan is required' });
    }

    let proofUrl = req.body.paymentProofUrl || '';
    if (req.file) {
      proofUrl = await uploadBuffer(req.file.buffer, 'subscription-proofs', {
        ext: extFromMime(req.file.mimetype, req.file.originalname),
        contentType: req.file.mimetype,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { djProfile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const djId = user.djProfile?.id || null;

    const subRequest = await prisma.proSubscriptionRequest.create({
      data: {
        djId,
        userId: user.id,
        plan,
        amount: parseFloat(amount) || 100,
        currency,
        proofUrl: proofUrl || 'manual_reference_attached',
        status: 'pending',
        adminNote: paymentReference ? `Reference: ${paymentReference}` : null,
      },
    });

    return res.json({
      success: true,
      message: 'Upgrade request submitted successfully! Your subscription is pending admin confirmation.',
      data: subRequest,
    });
  } catch (error) {
    console.error('[User Subscription Request API] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:username - Public user profile by username (MUST be last GET route)
router.get('/:username', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        location: true,
        avatar: true,
        favoriteGenres: true,
        role: true,
        createdAt: true,
        djProfile: {
          select: {
            id: true,
            stageName: true,
            bio: true,
            avatar: true,
            city: true,
            community: true,
            country: true,
            isPublic: true,
            subscriptionTier: true,
            verified: true,
            user: { select: { username: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const publicUser = {
      ...user,
      djProfile: user.role === 'DJ' && user.djProfile?.isPublic ? user.djProfile : null,
    };

    return res.json({ success: true, data: publicUser });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
