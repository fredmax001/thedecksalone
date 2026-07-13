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
    const emailPrefKey = `email${type.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join('')}`;
    const pushPrefKey = `push${type.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join('')}`;

    // Default to enabled if not set
    const emailEnabled = prefs[emailPrefKey] !== false;
    const pushEnabled = prefs[pushPrefKey] !== false;

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
