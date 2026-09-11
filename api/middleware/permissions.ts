import { Request, Response, NextFunction } from 'express';
const { prisma } = require('../utils/prisma');
const { getSubscriptionState, addMonths } = require('../utils/subscription');

/**
 * Subscription tier levels
 */
export enum SubscriptionTier {
    FREE = 'free',
    PRO = 'pro',
    LEGEND = 'legend',
}

/**
 * Feature permission levels
 */
export interface FeatureAccess {
    hasAccess: boolean;
    tier: SubscriptionTier;
    requiredTier: SubscriptionTier;
    message?: string;
}

/**
 * Get user's DJ profile with subscription info
 */
export const getUserSubscription = async (userId: string) => {
    const profile = await prisma.djProfile.findUnique({
        where: { userId },
        select: {
            id: true,
            subscriptionTier: true,
            subscriptionActivatedAt: true,
            subscriptionExpiresAt: true,
            totalMixUploads: true,
            hearThisConnected: true,
            canReceivePayments: true,
            canViewAnalytics: true,
            isVerifiedEligible: true,
            isLegendFeatured: true,
            hasAccountManager: true,
            apiAccessEnabled: true,
        },
    });
    return profile;
};

/**
 * Check if user has required subscription tier
 */
export const hasSubscriptionTier = (
    userTier: SubscriptionTier | string,
    requiredTier: SubscriptionTier
): boolean => {
    const tiers = [SubscriptionTier.FREE, SubscriptionTier.PRO, SubscriptionTier.LEGEND];
    const userTierIndex = tiers.indexOf(userTier as SubscriptionTier);
    const requiredTierIndex = tiers.indexOf(requiredTier);
    return userTierIndex >= requiredTierIndex;
};

/**
 * PERMISSION CHECKS - One per feature
 */

export const canUploadMix = (tier: string | SubscriptionTier): FeatureAccess => {
    return {
        hasAccess: true, // Everyone can upload
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.FREE,
    };
};

export const canUploadUnlimitedMixes = (tier: string | SubscriptionTier): FeatureAccess => {
    const hasTier = hasSubscriptionTier(tier, SubscriptionTier.PRO);
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.PRO,
        message: hasTier ? 'Unlimited mix uploads' : 'Upgrade to Pro for unlimited uploads',
    };
};

export const canCheckMixUploadLimit = (
    tier: string | SubscriptionTier,
    currentUploads: number
): boolean => {
    // Free tier: max 5 mixes
    if (tier === SubscriptionTier.FREE) {
        return currentUploads < 5;
    }
    // Pro & Legend: unlimited
    return true;
};

export const canSyncHearThis = (tier: string | SubscriptionTier): FeatureAccess => {
    const hasTier = hasSubscriptionTier(tier, SubscriptionTier.PRO);
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.PRO,
        message: hasTier
            ? 'Sync your HearThis account'
            : 'Upgrade to Pro to sync HearThis',
    };
};

export const canApplyForOpportunity = (tier: string | SubscriptionTier): FeatureAccess => {
    const hasTier = hasSubscriptionTier(tier, SubscriptionTier.PRO);
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.PRO,
        message: hasTier
            ? 'Apply for opportunities'
            : 'Upgrade to Pro to apply for opportunities',
    };
};

export const canReceiveDirectPayments = (
    tier: string | SubscriptionTier
): FeatureAccess => {
    const hasTier = hasSubscriptionTier(tier, SubscriptionTier.PRO);
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.PRO,
        message: hasTier
            ? 'Receive direct payments'
            : 'Upgrade to Pro to receive direct payments',
    };
};

export const canViewAdvancedAnalytics = (tier: string | SubscriptionTier): FeatureAccess => {
    const hasTier = hasSubscriptionTier(tier, SubscriptionTier.PRO);
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.PRO,
        message: hasTier
            ? 'View advanced analytics'
            : 'Upgrade to Pro to view advanced analytics',
    };
};

export const canGetVerified = (tier: string | SubscriptionTier): FeatureAccess => {
    const hasTier = hasSubscriptionTier(tier, SubscriptionTier.PRO);
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.PRO,
        message: hasTier
            ? 'Apply for verification'
            : 'Upgrade to Pro to apply for verification',
    };
};

export const hasPrioritySearch = (tier: string | SubscriptionTier): FeatureAccess => {
    const hasTier = hasSubscriptionTier(tier, SubscriptionTier.PRO);
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.PRO,
        message: hasTier ? 'Priority search ranking' : 'Upgrade to Pro for priority search',
    };
};

// LEGEND-ONLY FEATURES

export const canAccessPremiumOpportunities = (
    tier: string | SubscriptionTier
): FeatureAccess => {
    const hasTier = hasSubscriptionTier(tier, SubscriptionTier.LEGEND);
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.LEGEND,
        message: hasTier
            ? 'Access exclusive opportunities'
            : 'Upgrade to Pro+ for exclusive opportunities',
    };
};

export const isLegendFeatured = (tier: string | SubscriptionTier): FeatureAccess => {
    const hasTier = tier === SubscriptionTier.LEGEND;
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.LEGEND,
        message: hasTier ? 'Featured on homepage' : 'Pro+ tier only',
    };
};

export const hasApiAccess = (tier: string | SubscriptionTier): FeatureAccess => {
    const hasTier = tier === SubscriptionTier.LEGEND;
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.LEGEND,
        message: hasTier ? 'API access enabled' : 'Pro+ tier only',
    };
};

/**
 * Middleware: Require minimum subscription tier
 */
export const requireSubscriptionTier =
    (minTier: SubscriptionTier) =>
        async (req: Request, res: Response, next: NextFunction) => {
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }

            const profile = await getUserSubscription(userId);
            if (!profile) {
                return res.status(404).json({ success: false, error: 'DJ profile not found' });
            }

            // Lazily enforce expiry: a paid tier whose subscription has lapsed
            // (past the grace period) is downgraded on the spot and denied.
            if (getSubscriptionState(profile) === 'expired') {
                await resetSubscriptionFeatures(userId);
                return res.status(403).json({
                    success: false,
                    error: `This feature requires ${minTier} subscription`,
                    currentTier: SubscriptionTier.FREE,
                    requiredTier: minTier,
                    subscriptionExpired: true,
                });
            }

            if (!hasSubscriptionTier(profile.subscriptionTier, minTier)) {
                return res.status(403).json({
                    success: false,
                    error: `This feature requires ${minTier} subscription`,
                    currentTier: profile.subscriptionTier,
                    requiredTier: minTier,
                });
            }

            // Attach profile to request for use in route handlers
            (req as any).djProfile = profile;
            next();
        };

/**
 * Middleware: Require Pro subscription minimum
 */
export const requirePro = requireSubscriptionTier(SubscriptionTier.PRO);

/**
 * Middleware: Require Legend subscription
 */
export const requireLegend = requireSubscriptionTier(SubscriptionTier.LEGEND);

/**
 * Middleware: Require Pro subscription or any admin role
 */
export const requireProOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const authUser = (req as any).user;
    if (!authUser) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'VERIFICATION_ADMIN', 'MODERATOR'];
    if (adminRoles.includes(authUser.role)) {
        return next();
    }

    const profile = await getUserSubscription(authUser.id);
    if (!profile) {
        return res.status(403).json({ success: false, error: 'DJ profile not found' });
    }

    // Lazily enforce expiry (see requireSubscriptionTier)
    if (getSubscriptionState(profile) === 'expired') {
        await resetSubscriptionFeatures(authUser.id);
        return res.status(403).json({
            success: false,
            error: 'This feature requires Pro subscription or admin access',
            currentTier: SubscriptionTier.FREE,
            requiredTier: SubscriptionTier.PRO,
            subscriptionExpired: true,
        });
    }

    if (!hasSubscriptionTier(profile.subscriptionTier, SubscriptionTier.PRO)) {
        return res.status(403).json({
            success: false,
            error: 'This feature requires Pro subscription or admin access',
            currentTier: profile.subscriptionTier,
            requiredTier: SubscriptionTier.PRO,
        });
    }

    next();
};

/**
 * Update feature access when subscription is activated.
 *
 * Duration: explicit `opts.months` wins; otherwise derived from the plan
 * string (`*_annual` -> 12 months, anything else -> 1 month). `months: 0`
 * grants lifetime (expiresAt = null).
 *
 * Renewal: if the user still has a valid subscription, the new period is
 * stacked on top of the remaining time.
 */
export const activateSubscriptionFeatures = async (
    userId: string,
    tier: SubscriptionTier | string,
    opts?: { months?: number }
) => {
    const normalizedTier = String(tier).includes('legend') ? SubscriptionTier.LEGEND : SubscriptionTier.PRO;

    const months = opts?.months !== undefined
        ? opts.months
        : (String(tier).includes('annual') ? 12 : 1);
    const lifetime = months <= 0;

    // Stack renewal on top of any remaining paid time
    const [existingUser, existingDj] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { subscriptionExpiresAt: true } }),
        prisma.djProfile.findUnique({ where: { userId }, select: { subscriptionExpiresAt: true } }),
    ]);
    const currentExpiryMs = Math.max(
        existingUser?.subscriptionExpiresAt ? new Date(existingUser.subscriptionExpiresAt).getTime() : 0,
        existingDj?.subscriptionExpiresAt ? new Date(existingDj.subscriptionExpiresAt).getTime() : 0,
    );
    const base = new Date(Math.max(Date.now(), currentExpiryMs));
    const expiresAt = lifetime ? null : addMonths(base, months);
    const activatedAt = new Date();

    // Update User table
    await prisma.user.update({
        where: { id: userId },
        data: {
            subscriptionTier: normalizedTier,
            subscriptionActivatedAt: activatedAt,
            subscriptionExpiresAt: expiresAt,
        },
    }).catch((e: any) => console.error('Error updating user subscription:', e));

    // If user has a DJ profile, update DJ features too
    const dj = await prisma.djProfile.findUnique({ where: { userId } });
    if (dj) {
        const updateData: any = {
            subscriptionTier: normalizedTier,
            subscriptionActivatedAt: activatedAt,
            subscriptionExpiresAt: expiresAt,
        };

        if (normalizedTier === SubscriptionTier.PRO || normalizedTier === SubscriptionTier.LEGEND) {
            updateData.canReceivePayments = true;
            updateData.canViewAnalytics = true;
            updateData.isVerifiedEligible = true;
        }

        if (normalizedTier === SubscriptionTier.LEGEND) {
            updateData.isLegendFeatured = true;
            updateData.hasAccountManager = true;
            updateData.apiAccessEnabled = true;
        }

        return prisma.djProfile.update({
            where: { userId },
            data: updateData,
        });
    }
};

/**
 * Reset features when subscription is cancelled
 */
export const resetSubscriptionFeatures = async (userId: string) => {
    await prisma.user.update({
        where: { id: userId },
        data: {
            subscriptionTier: SubscriptionTier.FREE,
            subscriptionActivatedAt: null,
            subscriptionExpiresAt: null,
        },
    }).catch(() => {});

    const dj = await prisma.djProfile.findUnique({ where: { userId } });
    if (dj) {
        return prisma.djProfile.update({
            where: { userId },
            data: {
                subscriptionTier: SubscriptionTier.FREE,
                subscriptionActivatedAt: null,
                subscriptionExpiresAt: null,
                isPro: false,
                canReceivePayments: false,
                canViewAnalytics: false,
                isVerifiedEligible: false,
                isLegendFeatured: false,
                hasAccountManager: false,
                apiAccessEnabled: false,
                hearThisConnected: false,
            },
        });
    }
};
