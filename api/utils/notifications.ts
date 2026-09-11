const { prisma } = require('../utils/prisma');
const { sendSentDmSms } = require('./sms');

/**
 * Detect whether a string looks like HTML markup.
 */
function looksLikeHtml(content: string): boolean {
  if (typeof content !== 'string') return false;
  return /<\s*(div|p|h[1-6]|table|ul|ol|li|br|strong|span|a|body|html|img|hr|blockquote)[\s>]/i.test(content);
}

/**
 * Crude HTML → plain-text fallback for the `text` part of a multipart email.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table|ul|ol)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
  sendSms = true,
  smsBody,
}) {
  try {
    // Check user's notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        phoneVerified: true,
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

    // SMS is only offered for a small, high-value set of notification types
    // (SMS costs money per message). All sms* prefs default to false (opt-in).
    const SMS_PREF_MAP: Record<string, string> = {
      BOOKING_CREATED: 'smsBookings',
      BOOKING_STATUS_CHANGED: 'smsBookings',
      COUNTER_OFFER: 'smsBookings',
      PAYMENT_RECEIVED: 'smsPayments',
      TICKET_PURCHASED: 'smsTickets',
      TICKET_APPROVED: 'smsTickets',
    };

    const emailPrefKey = EMAIL_PREF_MAP[type] || null;
    const pushPrefKey = PUSH_PREF_MAP[type] || null;
    const smsPrefKey = SMS_PREF_MAP[type] || null;

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
        const content = emailBody || body || '';
        const isHtml = looksLikeHtml(content);
        await sendEmailFn({
          to: user.email,
          subject: emailSubject || title,
          text: isHtml ? htmlToText(content) : content,
          html: isHtml ? content : undefined,
        });
      } catch (emailErr) {
        console.warn('[Notification] Failed to send email:', emailErr.message);
      }
    }

    // Send SMS if requested, user has a verified phone, and the sms pref is enabled.
    // The sms* preference itself is the switch (opt-in, default false).
    const smsEnabled = smsPrefKey ? prefs[smsPrefKey] === true : false;
    const sentDmConfigured = Boolean(
      process.env.SENTDM_API_KEY || process.env.SENT_DM_API_KEY || process.env.SENT_API_KEY
    );
    if (sendSms && smsEnabled && user.phoneVerified && user.phone && sentDmConfigured) {
      try {
        const rawBody = smsBody || body || title || '';
        const textBody = smsBody
          ? rawBody
          : `${String(rawBody).substring(0, 140)} — Deck Salone`;
        // Fire-and-forget: mirror otp.ts sendSentDmSms usage (template body var `var_1`)
        sendSentDmSms({
          to: user.phone,
          parameters: {
            var_1: textBody,
          },
        }).catch((smsErr) => {
          console.warn('[Notification] Failed to send SMS:', smsErr?.message || smsErr);
        });
      } catch (smsErr) {
        console.warn('[Notification] Failed to send SMS:', smsErr.message);
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
  sendSms = true,
  smsBody,
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
    sendSms,
    smsBody,
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
  looksLikeHtml,
  htmlToText,
};
