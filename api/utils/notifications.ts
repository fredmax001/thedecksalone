const { prisma } = require('../utils/prisma');

/**
 * Create a notification for a user.
 * Optionally sends an email if the user has email notifications enabled.
 */
async function createNotification({
  userId,
  type,
  title,
  body,
  actionUrl,
  entityId,
  entityType,
  metadata,
  sendEmail = false,
  emailSubject,
  emailBody,
}) {
  try {
    // Check user's notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        notificationPreferences: true,
      },
    });

    if (!user) {
      console.warn(`[Notification] User ${userId} not found`);
      return null;
    }

    // Respect notification preferences
    const prefs = user.notificationPreferences || {};

    // Map notification types to the stored preference keys used by the frontend
    const EMAIL_PREF_MAP: Record<string, string> = {
      BOOKING_CREATED: 'emailBookings',
      BOOKING_STATUS_CHANGED: 'emailBookings',
      COUNTER_OFFER: 'emailBookings',
      PAYMENT_RECEIVED: 'emailBookings',
      PAYMENT_FAILED: 'emailBookings',
      NEW_MESSAGE: 'emailMessages',
      MIX_LIKED: 'emailLikes',
      MIX_REUPPED: 'emailReups',
      MIX_COMMENTED: 'emailComments',
      COMMENT_LIKED: 'emailComments',
      NEW_FOLLOWER: 'emailFollows',
      NEW_MIX: 'emailNewMixes',
      EVENT_REMINDER: 'emailEvents',
      TICKET_PURCHASED: 'emailTickets',
      TICKET_APPROVED: 'emailTickets',
      TICKET_DECLINED: 'emailTickets',
      VERIFICATION_STATUS: 'emailVerifications',
      SUBSCRIPTION_STATUS: 'emailSubscriptions',
      REVIEW_RECEIVED: 'emailReviews',
      SYSTEM: 'emailMessages',
    };
    const PUSH_PREF_MAP: Record<string, string> = {
      BOOKING_CREATED: 'pushBookings',
      BOOKING_STATUS_CHANGED: 'pushBookings',
      COUNTER_OFFER: 'pushBookings',
      PAYMENT_RECEIVED: 'pushBookings',
      PAYMENT_FAILED: 'pushBookings',
      NEW_MESSAGE: 'pushMessages',
      MIX_LIKED: 'pushLikes',
      MIX_REUPPED: 'pushReups',
      MIX_COMMENTED: 'pushComments',
      COMMENT_LIKED: 'pushComments',
      NEW_FOLLOWER: 'pushFollows',
      NEW_MIX: 'pushNewMixes',
      EVENT_REMINDER: 'pushEvents',
      TICKET_PURCHASED: 'pushTickets',
      TICKET_APPROVED: 'pushTickets',
      TICKET_DECLINED: 'pushTickets',
      VERIFICATION_STATUS: 'pushVerifications',
      SUBSCRIPTION_STATUS: 'pushSubscriptions',
      REVIEW_RECEIVED: 'pushReviews',
      SYSTEM: 'pushMessages',
    };

    const emailPrefKey = EMAIL_PREF_MAP[type] || null;
    const pushPrefKey = PUSH_PREF_MAP[type] || null;

    // Default to enabled if not set (or if no specific preference key exists)
    const emailEnabled = emailPrefKey ? prefs[emailPrefKey] !== false : true;
    const pushEnabled = pushPrefKey ? prefs[pushPrefKey] !== false : true;

    let notification = null;

    // Create in-app notification
    if (pushEnabled) {
      notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          actionUrl,
          entityId,
          entityType,
          metadata: metadata || {},
        },
      });
    }

    // Send email if requested and enabled
    if (sendEmail && emailEnabled) {
      try {
        const { sendEmail: sendEmailFn } = require('./email');
        await sendEmailFn({
          to: user.email,
          subject: emailSubject || title,
          text: emailBody || body,
        });
      } catch (emailErr) {
        console.warn('[Notification] Failed to send email:', emailErr.message);
      }
    }

    return notification;
  } catch (error) {
    console.error('[Notification] createNotification error:', error.message);
    return null;
  }
}

/**
 * Create a notification for a DJ (via their user ID).
 */
async function createNotificationForDj({
  djId,
  type,
  title,
  body,
  actionUrl,
  entityId,
  entityType,
  metadata,
  sendEmail = false,
  emailSubject,
  emailBody,
}) {
  const dj = await prisma.djProfile.findUnique({
    where: { id: djId },
    select: { userId: true },
  });

  if (!dj) {
    console.warn(`[Notification] DJ ${djId} not found`);
    return null;
  }

  return createNotification({
    userId: dj.userId,
    type,
    title,
    body,
    actionUrl,
    entityId,
    entityType,
    metadata,
    sendEmail,
    emailSubject,
    emailBody,
  });
}

/**
 * Get unread notification count for a user.
 */
async function getUnreadCount(userId) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

/**
 * Mark all notifications as read for a user.
 */
async function markAllAsRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

/**
 * Delete old read notifications (cleanup).
 */
async function cleanupOldNotifications(days = 30) {
  const cutoff = new Date(Date.now() - days * 86400000);
  return prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: { lt: cutoff },
    },
  });
}

module.exports = {
  createNotification,
  createNotificationForDj,
  getUnreadCount,
  markAllAsRead,
  cleanupOldNotifications,
};
