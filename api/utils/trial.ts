const { prisma } = require('./prisma');
const { createNotification } = require('./notifications');

/**
 * Calculates 14-day trial status for a user/DJ profile.
 */
function calculateTrialStatus(user: any, djProfile?: any) {
  const isProSubscriber = djProfile
    ? (djProfile.subscriptionTier === 'pro' || djProfile.subscriptionTier === 'legend' || djProfile.isPro === true)
    : false;

  if (isProSubscriber) {
    return {
      isSubscribed: true,
      isTrialActive: false,
      hasFeatureAccess: true,
      daysLeft: 0,
      status: 'active_subscription',
    };
  }

  const createdAt = user?.createdAt ? new Date(user.createdAt).getTime() : Date.now();
  const trialDurationMs = 14 * 24 * 60 * 60 * 1000;
  const trialEndMs = createdAt + trialDurationMs;
  const nowMs = Date.now();
  const diffMs = trialEndMs - nowMs;
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isTrialActive = diffMs > 0;

  return {
    isSubscribed: false,
    isTrialActive,
    hasFeatureAccess: isTrialActive,
    daysLeft,
    trialEnd: new Date(trialEndMs),
    status: isTrialActive ? 'trial_active' : 'trial_expired',
  };
}

/**
 * Middleware to enforce trial or active subscription on major features:
 * - Mix Uploads
 * - DJ Sets
 * - Events & Ticket Management
 */
async function requireTrialOrSubscription(req: any, res: any, next: any) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { djProfile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const trial = calculateTrialStatus(user, user.djProfile);

    if (!trial.hasFeatureAccess) {
      return res.status(403).json({
        success: false,
        error: 'Your 14-day free trial has expired. Upgrade to Pro or Pro+ to access this feature.',
        requiresSubscription: true,
        trialStatus: trial,
      });
    }

    req.trialStatus = trial;
    next();
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Checks all free users and sends trial warning (4 days left) and trial expiry notifications.
 */
async function checkAndSendTrialNotifications() {
  try {
    const freeUsers = await prisma.user.findMany({
      where: {
        role: 'DJ',
        OR: [
          { djProfile: { is: null } },
          { djProfile: { isPro: false, subscriptionTier: 'free' } },
        ],
      },
      include: { djProfile: true },
    });

    const now = Date.now();

    for (const user of freeUsers) {
      const trial = calculateTrialStatus(user, user.djProfile);

      // Check if 4 days warning notification should be sent (daysLeft === 4)
      if (trial.isTrialActive && trial.daysLeft === 4) {
        const existingWarning = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: 'SYSTEM',
            title: { contains: '4 Days Left' },
          },
        });

        if (!existingWarning) {
          await createNotification({
            userId: user.id,
            type: 'SYSTEM',
            title: '⏰ 4 Days Left in Your Free Trial!',
            body: 'Your 14-day free trial ends in 4 days. Upgrade to Pro or Legend now to maintain unlimited mix uploads, DJ sets, and booking features!',
            actionUrl: '/dashboard/subscription',
            sendEmail: true,
            emailSubject: '⏰ 4 Days Left in Your Deck Salone Free Trial',
            emailBody: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #d4af37;">Your Free Trial Ends in 4 Days!</h2>
                <p>Hello ${user.name || user.username || 'DJ'},</p>
                <p>Your 14-day free trial on <strong>Deck Salone</strong> ends in <strong>4 days</strong>.</p>
                <p>Upgrade to <strong>Pro</strong> or <strong>Legend (Pro+)</strong> now to keep unlimited access to:</p>
                <ul>
                  <li>Unlimited Mix Uploads</li>
                  <li>Custom DJ Sets & Playlists</li>
                  <li>Event Ticket Sales & Live Camera Scanner</li>
                  <li>Direct WhatsApp & Social Media handles on your profile</li>
                </ul>
                <a href="https://decksalone.com/dashboard/subscription" style="display: inline-block; padding: 12px 24px; background: #d4af37; color: #000; font-weight: bold; text-decoration: none; border-radius: 25px; margin-top: 15px;">Upgrade Your Account</a>
              </div>
            `,
          });
        }
      }

      // Check if trial has expired and notification not yet sent
      if (!trial.isTrialActive && trial.daysLeft <= 0) {
        const existingExpiry = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: 'SYSTEM',
            title: { contains: 'Free Trial Expired' },
          },
        });

        if (!existingExpiry) {
          await createNotification({
            userId: user.id,
            type: 'SYSTEM',
            title: '🔒 Free Trial Expired - Upgrade to Pro',
            body: 'Your 14-day free trial has ended. Subscribe to Pro or Legend to unlock mix uploads, DJ sets, event ticketing, and full platform access.',
            actionUrl: '/dashboard/subscription',
            sendEmail: true,
            emailSubject: '🔒 Your Deck Salone 14-Day Free Trial Has Ended',
            emailBody: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #d4af37;">Your 14-Day Free Trial Has Ended</h2>
                <p>Hello ${user.name || user.username || 'DJ'},</p>
                <p>Your 14-day free trial period on <strong>Deck Salone</strong> has ended.</p>
                <p>To continue uploading mixes, creating DJ set playlists, selling event tickets, and featuring your contact info, please choose a subscription plan:</p>
                <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #d4af37;">
                  <p style="margin:0; font-weight:bold;">Pro Plan — SLE 150/mo</p>
                  <p style="margin:5px 0 0 0; font-size:13px; color:#666;">Unlimited mix uploads, DJ sets, direct WhatsApp handles, booking system</p>
                </div>
                <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #000;">
                  <p style="margin:0; font-weight:bold;">Legend (Pro+) — SLE 350/mo</p>
                  <p style="margin:5px 0 0 0; font-size:13px; color:#666;">All Pro features + Live Ticket Scanner camera app + Featured badge</p>
                </div>
                <a href="https://decksalone.com/dashboard/subscription" style="display: inline-block; padding: 12px 24px; background: #d4af37; color: #000; font-weight: bold; text-decoration: none; border-radius: 25px; margin-top: 15px;">Subscribe Now</a>
              </div>
            `,
          });
        }
      }
    }
  } catch (err: any) {
    console.error('[TrialNotifier] Error checking trials:', err.message);
  }
}

module.exports = {
  calculateTrialStatus,
  requireTrialOrSubscription,
  checkAndSendTrialNotifications,
};
