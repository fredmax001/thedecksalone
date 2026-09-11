const { prisma } = require('./prisma');
const { logger } = require('./logger');
const { createNotification } = require('./notifications');
const { resetSubscriptionFeatures } = require('../middleware/permissions');
const {
    SUBSCRIPTION_GRACE_DAYS,
    daysUntilExpiry,
    daysUntilGraceEnd,
} = require('./subscription');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN', 'SUPPORT_ADMIN'];

/**
 * Daily subscription maintenance:
 *  1. Downgrades paid tiers whose expiry + grace period has passed.
 *  2. Sends "expiring soon" / "final grace reminder" notifications.
 * Idempotent: both steps de-dupe against existing notifications.
 */
async function processSubscriptionExpirations(now: Date = new Date()) {
    // ── 1. Downgrade subscriptions past their grace period ──────────────
    // Match on the user row OR the djProfile row: legacy activations only
    // wrote one of the two, so checking both keeps the sweep honest.
    const graceCutoff = new Date(now.getTime() - SUBSCRIPTION_GRACE_DAYS * MS_PER_DAY);

    const expiredUsers = await prisma.user.findMany({
        where: {
            role: { notIn: ADMIN_ROLES },
            OR: [
                {
                    subscriptionTier: { in: ['pro', 'legend'] },
                    subscriptionExpiresAt: { lt: graceCutoff },
                },
                {
                    djProfile: {
                        is: {
                            subscriptionTier: { in: ['pro', 'legend'] },
                            subscriptionExpiresAt: { lt: graceCutoff },
                        },
                    },
                },
            ],
        },
        select: { id: true, name: true, username: true, email: true, subscriptionTier: true },
    });

    for (const user of expiredUsers) {
        await resetSubscriptionFeatures(user.id);

        const existing = await prisma.notification.findFirst({
            where: {
                userId: user.id,
                type: 'SYSTEM',
                title: { contains: 'Subscription Expired' },
            },
        });

        if (!existing) {
            await createNotification({
                userId: user.id,
                type: 'SYSTEM',
                title: '🔒 Subscription Expired',
                body: 'Your Pro/Pro+ subscription has ended and the grace period is over. Renew now to restore unlimited uploads, DJ sets, and ticketing.',
                actionUrl: '/dashboard/subscription',
                sendEmail: true,
                emailSubject: 'Your Deck Salone subscription has expired',
                emailBody: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #d4af37;">Your Subscription Has Expired</h2>
                <p>Hello ${user.name || user.username || 'DJ'},</p>
                <p>Your <strong>Deck Salone</strong> subscription has ended. Renew now to keep unlimited mix uploads, DJ sets, event ticketing, and all Pro features.</p>
                <a href="https://decksalone.com/dashboard/subscription" style="display: inline-block; padding: 12px 24px; background: #d4af37; color: #000; font-weight: bold; text-decoration: none; border-radius: 25px; margin-top: 15px;">Renew Your Subscription</a>
              </div>
            `,
            }).catch((e: any) => logger.error('[SubscriptionExpiry] Failed to send expiry notification:', { error: e.message }));
        }

        logger.info(`[SubscriptionExpiry] Downgraded expired subscriber ${user.id} (${user.email})`);
    }

    // ── 2. Warn subscribers whose expiry is near or in grace ────────────
    const warnFrom = new Date(now.getTime() - SUBSCRIPTION_GRACE_DAYS * MS_PER_DAY);
    const warnTo = new Date(now.getTime() + SUBSCRIPTION_GRACE_DAYS * MS_PER_DAY);

    const warningCandidates = await prisma.user.findMany({
        where: {
            role: { notIn: ADMIN_ROLES },
            OR: [
                {
                    subscriptionTier: { in: ['pro', 'legend'] },
                    subscriptionExpiresAt: { gte: warnFrom, lte: warnTo },
                },
                {
                    djProfile: {
                        is: {
                            subscriptionTier: { in: ['pro', 'legend'] },
                            subscriptionExpiresAt: { gte: warnFrom, lte: warnTo },
                        },
                    },
                },
            ],
        },
        select: {
            id: true,
            name: true,
            username: true,
            email: true,
            subscriptionExpiresAt: true,
            djProfile: { select: { subscriptionExpiresAt: true } },
        },
    });

    for (const user of warningCandidates) {
        const rawExpiry = user.subscriptionExpiresAt || user.djProfile?.subscriptionExpiresAt;
        if (!rawExpiry) continue;
        const expiresAt = new Date(rawExpiry);
        const inGrace = expiresAt.getTime() <= now.getTime();

        const dedupeWindow = new Date(now.getTime() - 5 * MS_PER_DAY);
        const existing = await prisma.notification.findFirst({
            where: {
                userId: user.id,
                type: 'SYSTEM',
                title: { contains: 'Subscription Expiring' },
                createdAt: { gte: dedupeWindow },
            },
        });
        if (existing) continue;

        const daysLeft = inGrace ? daysUntilGraceEnd(expiresAt, now) : daysUntilExpiry(expiresAt, now);
        const title = inGrace
            ? `⏰ Final Reminder: ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'} Left on Your Subscription`
            : `⏰ Subscription Expiring in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'}`;

        await createNotification({
            userId: user.id,
            type: 'SYSTEM',
            title,
            body: inGrace
                ? `Your subscription expired on ${expiresAt.toDateString()}. Renew within ${daysLeft} day(s) to avoid losing Pro features.`
                : `Your subscription expires on ${expiresAt.toDateString()}. Renew now to keep uninterrupted access to all Pro features.`,
            actionUrl: '/dashboard/subscription',
            sendEmail: true,
            emailSubject: title,
            emailBody: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #d4af37;">${inGrace ? 'Your Grace Period Is Ending' : 'Your Subscription Is Expiring Soon'}</h2>
                <p>Hello ${user.name || user.username || 'DJ'},</p>
                <p>${inGrace
                    ? `Your subscription expired on <strong>${expiresAt.toDateString()}</strong> and you have <strong>${daysLeft} day(s)</strong> of grace remaining. Renew now to avoid losing unlimited uploads, DJ sets, and ticketing.`
                    : `Your subscription expires on <strong>${expiresAt.toDateString()}</strong> (${daysLeft} day(s) from now). Renew now for uninterrupted access to all Pro features.`}</p>
                <a href="https://decksalone.com/dashboard/subscription" style="display: inline-block; padding: 12px 24px; background: #d4af37; color: #000; font-weight: bold; text-decoration: none; border-radius: 25px; margin-top: 15px;">Renew Your Subscription</a>
              </div>
            `,
        }).catch((e: any) => logger.error('[SubscriptionExpiry] Failed to send warning notification:', { error: e.message }));

        logger.info(`[SubscriptionExpiry] Sent ${inGrace ? 'grace' : 'expiry'} warning to user ${user.id} (${daysLeft} days left)`);
    }

    return { downgraded: expiredUsers.length, warned: warningCandidates.length };
}

module.exports = {
    processSubscriptionExpirations,
};
