import { useAuthStore } from '@/stores/authStore';
import { useCallback } from 'react';
import { useUpgradeModalStore } from '@/stores/upgradeModalStore';

/**
 * useFeatureAccess - Check tier access and manage upgrade modals
 *
 * Usage:
 * const { tier, isPro, isLegend, checkFeature, hasTier } = useFeatureAccess();
 *
 * if (!checkFeature('pro', 'Advanced Analytics')) return null;
 * // Feature is allowed, proceed...
 */
export const useFeatureAccess = () => {
    const user = useAuthStore((s) => s.user);
    const { open: openUpgradeModal, close: closeUpgradeModal, ...upgradeModal } = useUpgradeModalStore();

    // Get current tier (default to 'free' if no profile)
    const rawTier = (user?.djProfile?.subscriptionTier || 'free') as 'free' | 'pro' | 'legend';

    // A paid tier whose subscription has lapsed (past the grace period)
    // behaves as free — mirrors SUBSCRIPTION_GRACE_DAYS on the backend.
    const GRACE_DAYS = 3;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    let tier = rawTier;
    if (rawTier === 'pro' || rawTier === 'legend') {
      const expiresAt = user?.djProfile?.subscriptionExpiresAt
        ? new Date(user.djProfile.subscriptionExpiresAt).getTime()
        : null; // null = lifetime
      if (expiresAt !== null && Date.now() > expiresAt + GRACE_DAYS * MS_PER_DAY) {
        tier = 'free';
      }
    }

    // Tier levels for comparison: free < pro < legend
    const tierLevels = { free: 0, pro: 1, legend: 2 };

    /**
     * Check if user has required tier
     * Returns true if allowed, false if blocked (and opens modal)
     */
    const checkFeature = useCallback(
        (requiredTier: 'pro' | 'legend', featureName: string): boolean => {
            const userLevel = tierLevels[tier];
            const requiredLevel = tierLevels[requiredTier];

            if (userLevel >= requiredLevel) {
                return true; // User has access
            }

            // Show upgrade modal
            openUpgradeModal(featureName, requiredTier);
            return false; // User blocked
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tier, openUpgradeModal]
    );

    /**
     * Silently check if user has tier (no modal)
     */
    const hasTier = useCallback(
        (requiredTier: 'pro' | 'legend'): boolean => {
            const userLevel = tierLevels[tier];
            const requiredLevel = tierLevels[requiredTier];
            return userLevel >= requiredLevel;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tier]
    );

    return {
        // Current tier
        tier,

        // Quick checks
        isPro: tier === 'pro' || tier === 'legend',
        isLegend: tier === 'legend',
        isFree: tier === 'free',

        // Feature checking functions
        checkFeature,
        hasTier,

        // Can Pro/Legend feature be accessed?
        canAccessPro: tierLevels[tier] >= tierLevels['pro'],
        canAccessLegend: tierLevels[tier] >= tierLevels['legend'],

        // Global modal management
        upgradeModal,
        openUpgradeModal,
        closeUpgradeModal,
        setUpgradeModal: ({ isOpen, feature, requiredTier }: { isOpen: boolean; feature: string; requiredTier: 'pro' | 'legend' }) => {
            if (isOpen) openUpgradeModal(feature, requiredTier);
            else closeUpgradeModal();
        },
    };
};

/**
 * Helper hook to require a tier (returns hasAccess bool)
 */
export const useRequiresTier = (requiredTier: 'pro' | 'legend') => {
    const { tier } = useFeatureAccess();
    const tierLevels = { free: 0, pro: 1, legend: 2 };
    return {
        hasAccess: tierLevels[tier] >= tierLevels[requiredTier],
    };
};
