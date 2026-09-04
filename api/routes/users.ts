const express = require('express');
const { z } = require('zod');
const { prisma, DJ_PUBLIC_SELECT } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { searchLimiter } = require('../utils/rateLimiter');
const bcrypt = require('bcryptjs');
const { uploadAvatar, uploadDocument } = require('../utils/upload');
const { processAvatar } = require('../utils/imageProcessor');
const { uploadBuffer, deleteFile } = require('../utils/storage');
const { sendAccountDeletionEmail } = require('../utils/email');
const { isValidUsername } = require('../utils/username');
const { parsePagination } = require('../utils/pagination');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../middleware/asyncHandler');

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
router.get('/activity', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [mixLikes, mixReposts, reviews, battleVotes] = await Promise.all([
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
            dj: { select: DJ_PUBLIC_SELECT },
          },
        },
      },
    }),
    prisma.mixRepost.findMany({
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
            dj: { select: DJ_PUBLIC_SELECT },
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
          select: DJ_PUBLIC_SELECT,
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
            dj: { select: DJ_PUBLIC_SELECT },
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
    ...mixReposts.map((repost) => ({
      id: repost.id,
      type: 'REPOST_MIX',
      title: repost.mix.title,
      subtitle: repost.mix.dj.stageName,
      thumbnail: repost.mix.coverImage,
      createdAt: repost.createdAt,
      meta: { mixId: repost.mix.id, djId: repost.mix.dj.id },
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

  return ok(res, activities);
}));

// GET /api/users/following-feed - New content from DJs the user follows
router.get('/following-feed', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = feedFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid filter parameters');
  }

  const { page, limit, since } = parsed.data;
  const userId = req.user.id;
  const { page: pageNum, limit: limitNum } = parsePagination({ page, limit });

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
        dj: { select: DJ_PUBLIC_SELECT },
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
        dj: { select: DJ_PUBLIC_SELECT },
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
}));

// GET /api/users/notifications - Synthetic notification feed
// Since there is no Notification table, this aggregates relevant recent activity
router.get('/notifications', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = feedFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid filter parameters');
  }

  const { page, limit } = parsed.data;
  const userId = req.user.id;
  const { page: pageNum, limit: limitNum } = parsePagination({ page, limit });

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
      dj: { select: DJ_PUBLIC_SELECT },
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
          dj: { select: DJ_PUBLIC_SELECT },
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
          dj: { select: DJ_PUBLIC_SELECT },
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
}));

/* ─────────────────── Profile Endpoints ─────────────────── */

const GENDER_VALUES = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;

const updateProfileSchema = z.object({
  username: z.string().max(50).optional().nullable().or(z.literal('')),
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
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
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
    return fail(res, 404, 'User not found');
  }

  return ok(res, {
      ...user,
      social: user.socialLinks || {},
    });
}));

// PUT /api/users/profile - Update current user's profile
router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const { username, name, bio, location, gender, dateOfBirth, avatar, favoriteGenres, social } = parsed.data;
  const updateData: any = {};

  if (gender !== undefined) {
    updateData.gender = gender === '' ? null : gender;
  }

  if (username && username.trim() !== '') {
    const normalized = username.toLowerCase().trim();
    if (!isValidUsername(normalized)) {
      return fail(res, 400, 'Username must be 3-30 characters with letters, numbers, hyphens, or underscores only and not reserved');
    }
    const existing = await prisma.user.findUnique({ where: { username: normalized } });
    if (existing && existing.id !== req.user.id) {
      return fail(res, 409, 'Username already taken');
    }
    updateData.username = normalized;
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

  return ok(res, { ...user, social: user.socialLinks || {} });
}));

// PUT /api/users/avatar - Upload user avatar
router.put('/avatar', authMiddleware, uploadAvatar.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return fail(res, 400, 'No image file provided');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, avatar: true },
  });

  if (!user) {
    return fail(res, 404, 'User not found');
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

  return ok(res, { avatar: avatarUrl });
}));

// PUT /api/users/password - Change current user's password
router.put('/password', authMiddleware, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return fail(res, 400, 'Current password and new password (min 6 chars) are required');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, password: true },
  });

  if (!user || !user.password) {
    return fail(res, 400, 'User not found or no password set');
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return fail(res, 401, 'Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword },
  });

  return ok(res, { message: 'Password updated successfully' });
}));

// GET /api/users/following - DJs the user follows (with latest mix / event)
router.get('/following', authMiddleware, asyncHandler(async (req, res) => {
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

  return ok(res, data);
}));

// PATCH /api/users/notifications/:id/read - Mark notification as read
router.patch('/notifications/:id/read', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Notifications are synthetic; nothing to persist yet.
  return ok(res, { id, read: true });
}));

// PATCH /api/users/notifications/read-all - Mark all notifications as read
router.patch('/notifications/read-all', authMiddleware, asyncHandler(async (req, res) => {
  // Notifications are synthetic; nothing to persist yet.
  return ok(res, { read: true });
}));

// GET /api/users/search - Search for users by name/username/email (for DJs to find clients)
router.get('/search', authMiddleware, searchLimiter, asyncHandler(async (req, res) => {
  const { q, limit } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return fail(res, 400, 'Search query must be at least 2 characters');
  }
  const searchTerm = q.trim();
  const { limit: take } = parsePagination({ limit }, { defaultLimit: 10, maxLimit: 20 });

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

  return ok(res, users.map((u) => ({
      id: u.id,
      name: u.name || u.username || u.email,
      avatar: u.avatar || null,
    })));
}));

// DELETE /api/users/account - Schedule the authenticated user's account for deletion
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { djProfile: true },
    });

    if (!user) {
      return fail(res, 404, 'User not found');
    }

    if (user.deletedAt) {
      return ok(res, { scheduled: true, deletionDate: user.deletedAt });
    }

    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const anonymizedEmail = `deleted.${user.id}@decksalone.anon`;
    const anonymizedUsername = `deleted_${user.id.slice(-8)}`;

    await prisma.$transaction(async (tx) => {
      // Soft-delete: mark user as deleted, anonymize identifiers, clear profile data
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: deletionDate,
          deletionEmailSentAt: new Date(),
          email: anonymizedEmail,
          username: anonymizedUsername,
          name: 'Deleted User',
          avatar: null,
          bio: null,
          phone: null,
          googleId: null,
          password: null,
          status: 'DELETED',
          subscriptionTier: 'free',
          subscriptionActivatedAt: null,
          socialLinks: {},
          notificationPreferences: {},
          privacyPreferences: {},
        },
      });

      // Hide DJ profile if present
      if (user.djProfile) {
        await tx.djProfile.update({
          where: { id: user.djProfile.id },
          data: {
            isPublic: false,
            stageName: 'Deleted DJ',
            bio: null,
            avatar: null,
          },
        });
      }
    });

    // Send deletion confirmation email to the original email address
    sendAccountDeletionEmail({
      to: user.email,
      username: user.name || user.username || 'User',
      deletionDate,
    }).catch((err: any) => {
      console.error('[Account Deletion] Failed to send email:', err);
    });

    return ok(res, { scheduled: true, deletionDate }, 'Your account has been scheduled for deletion in 30 days. You can log in before then to reactivate.');
  } catch (error) {
    console.error('Delete account error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─────────────────── Settings Endpoints ─────────────────── */

const notificationPrefsSchema = z.object({
  emailBookings: z.boolean().optional(),
  emailMessages: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
  emailLikes: z.boolean().optional(),
  emailComments: z.boolean().optional(),
  emailFollows: z.boolean().optional(),
  emailReups: z.boolean().optional(),
  emailNewMixes: z.boolean().optional(),
  emailEvents: z.boolean().optional(),
  emailTickets: z.boolean().optional(),
  emailVerifications: z.boolean().optional(),
  emailSubscriptions: z.boolean().optional(),
  emailReviews: z.boolean().optional(),
  pushBookings: z.boolean().optional(),
  pushMessages: z.boolean().optional(),
  pushNewMixes: z.boolean().optional(),
  pushLikes: z.boolean().optional(),
  pushComments: z.boolean().optional(),
  pushFollows: z.boolean().optional(),
  pushReups: z.boolean().optional(),
  pushEvents: z.boolean().optional(),
  pushTickets: z.boolean().optional(),
  pushVerifications: z.boolean().optional(),
  pushSubscriptions: z.boolean().optional(),
  pushReviews: z.boolean().optional(),
  smsBookings: z.boolean().optional(),
  smsPayments: z.boolean().optional(),
  smsTickets: z.boolean().optional(),
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
router.get('/settings', authMiddleware, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      notificationPreferences: true,
      privacyPreferences: true,
      djProfile: { select: { isPublic: true } },
    },
  });

  if (!user) {
    return fail(res, 404, 'User not found');
  }

  // Merge stored preferences with defaults
  const defaultNotifications = {
    emailBookings: true,
    emailMessages: true,
    emailMarketing: false,
    emailLikes: true,
    emailComments: true,
    emailFollows: true,
    emailReups: true,
    emailNewMixes: true,
    emailEvents: true,
    emailTickets: true,
    emailVerifications: true,
    emailSubscriptions: true,
    emailReviews: true,
    pushBookings: true,
    pushMessages: true,
    pushNewMixes: true,
    pushLikes: true,
    pushComments: true,
    pushFollows: true,
    pushReups: true,
    pushEvents: true,
    pushTickets: true,
    pushVerifications: true,
    pushSubscriptions: true,
    pushReviews: true,
    smsBookings: false,
    smsPayments: false,
    smsTickets: false,
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

  return ok(res, { notifications, privacy });
}));

// PUT /api/users/settings - Update current user's settings
router.put('/settings', authMiddleware, asyncHandler(async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
  }

  const { notifications, privacy } = parsed.data;
  const userId = req.user.id;

  // Fetch current user to merge preferences
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true, privacyPreferences: true, djProfile: { select: { id: true } } },
  });

  if (!currentUser) {
    return fail(res, 404, 'User not found');
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

  return ok(res, { message: 'Settings updated' });
}));

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
      return fail(res, 404, 'User not found');
    }

    return ok(res, {
        ...user,
        djProfile: user.role === 'DJ' && user.djProfile?.isPublic ? user.djProfile : null,
      });
  } catch (error) {
    console.error('[users.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// Valid platform subscription plan identifiers sent by the frontend
const VALID_PLANS = ['pro', 'pro_annual', 'legend', 'legend_annual'];
const EXPECTED_MONTHLY_PRICE = { pro: 100, legend: 150 };
const EXPECTED_ANNUAL_PRICE = { pro: 1000, legend: 1500 };

// GET /api/users/subscription/status - Current user's platform subscription status
router.get('/subscription/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [user, latestRequest] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          subscriptionTier: true,
          subscriptionActivatedAt: true,
        },
      }),
      prisma.proSubscriptionRequest.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          plan: true,
          amount: true,
          currency: true,
          status: true,
          adminNote: true,
          reviewedAt: true,
          createdAt: true,
        },
      }),
    ]);

    if (!user) {
      return fail(res, 404, 'User not found');
    }

    return ok(res, {
        tier: user.subscriptionTier || 'free',
        activatedAt: user.subscriptionActivatedAt,
        latestRequest,
      });
  } catch (error) {
    console.error('[User Subscription Status API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/users/subscription/request - Upgrade listener/user/DJ to Pro or Pro+
router.post('/subscription/request', authMiddleware, uploadDocument.single('proof'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan, amount, currency = 'SLE', paymentReference } = req.body;

    if (!plan || !VALID_PLANS.includes(plan)) {
      return fail(res, 400, `Plan is required and must be one of: ${VALID_PLANS.join(', ')}`);
    }

    const isAnnual = plan.includes('annual');
    const basePlan = plan.includes('legend') ? 'legend' : 'pro';
    const expectedAmount = isAnnual ? EXPECTED_ANNUAL_PRICE[basePlan] : EXPECTED_MONTHLY_PRICE[basePlan];

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return fail(res, 400, 'Valid amount is required');
    }

    if (parsedAmount !== expectedAmount) {
      return fail(res, 400, `Amount does not match selected plan. Expected SLE ${expectedAmount} for ${plan}`);
    }

    if (!paymentReference && !req.file) {
      return fail(res, 400, 'Please provide a payment screenshot or transaction reference');
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
      return fail(res, 404, 'User not found');
    }

    // Platform subscriptions are only for DJs. Fans and listeners are always free.
    if (user.role !== 'DJ') {
      return fail(res, 403, 'Subscriptions are only available for DJ accounts. Fans can stream and download for free.');
    }

    const djId = user.djProfile?.id || null;

    // Prevent duplicate pending requests for the same user
    const existingPending = await prisma.proSubscriptionRequest.findFirst({
      where: { userId: user.id, status: 'pending' },
    });
    if (existingPending) {
      return fail(res, 409, 'You already have a pending subscription request. Please wait for admin approval.', { data: existingPending });
    }

    const subRequest = await prisma.proSubscriptionRequest.create({
      data: {
        djId,
        userId: user.id,
        plan,
        amount: parsedAmount,
        currency,
        proofUrl: proofUrl || 'manual_reference_attached',
        status: 'pending',
        adminNote: paymentReference ? `Reference: ${paymentReference}` : null,
      },
    });

    return ok(res, subRequest, 'Upgrade request submitted successfully! Your subscription is pending admin confirmation.');
  } catch (error) {
    console.error('[User Subscription Request API] Error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/users/:username - Public user profile by username (MUST be last GET route)
router.get('/:username', asyncHandler(async (req, res) => {
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
    return fail(res, 404, 'User not found');
  }

  const publicUser = {
    ...user,
    djProfile: user.role === 'DJ' && user.djProfile?.isPublic ? user.djProfile : null,
  };

  return ok(res, publicUser);
}));

module.exports = router;
