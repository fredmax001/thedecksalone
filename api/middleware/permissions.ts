import { Request, Response, NextFunction } from 'express';
const { prisma } = require('../utils/prisma');

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
            : 'Upgrade to Legend for exclusive opportunities',
    };
};

export const isLegendFeatured = (tier: string | SubscriptionTier): FeatureAccess => {
    const hasTier = tier === SubscriptionTier.LEGEND;
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.LEGEND,
        message: hasTier ? 'Featured on homepage' : 'Legend tier only',
    };
};

export const hasApiAccess = (tier: string | SubscriptionTier): FeatureAccess => {
    const hasTier = tier === SubscriptionTier.LEGEND;
    return {
        hasAccess: hasTier,
        tier: tier as SubscriptionTier,
        requiredTier: SubscriptionTier.LEGEND,
        message: hasTier ? 'API access enabled' : 'Legend tier only',
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
 * Update feature access when subscription is activated
 */
export const activateSubscriptionFeatures = async (
    userId: string,
    tier: SubscriptionTier
) => {
    const updateData: any = {
        subscriptionTier: tier,
        subscriptionActivatedAt: new Date(),
    };

    if (tier === SubscriptionTier.PRO || tier === SubscriptionTier.LEGEND) {
        updateData.canReceivePayments = true;
        updateData.canViewAnalytics = true;
        updateData.isVerifiedEligible = true;
    }

    if (tier === SubscriptionTier.LEGEND) {
        updateData.isLegendFeatured = true;
        updateData.hasAccountManager = true;
        updateData.apiAccessEnabled = true;
    }

    return prisma.djProfile.update({
        where: { userId },
        data: updateData,
    });
};

/**
 * Reset features when subscription is cancelled
 */
export const resetSubscriptionFeatures = async (userId: string) => {
    return prisma.djProfile.update({
        where: { userId },
        data: {
            subscriptionTier: SubscriptionTier.FREE,
            subscriptionActivatedAt: null,
            canReceivePayments: false,
            canViewAnalytics: false,
            isVerifiedEligible: false,
            isLegendFeatured: false,
            hasAccountManager: false,
            apiAccessEnabled: false,
            hearThisConnected: false,
        },
    });
};
