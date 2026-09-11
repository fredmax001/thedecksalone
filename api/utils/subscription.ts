/**
 * Pure subscription date/tier helpers shared by middleware, trial logic and
 * cron jobs. No DB dependencies so the logic is unit-testable in isolation.
 *
 * Semantics of `subscriptionExpiresAt` on a pro/legend record:
 *  - future date  -> active
 *  - past date    -> grace for SUBSCRIPTION_GRACE_DAYS days, then expired
 *  - null         -> lifetime (only for explicit admin lifetime grants)
 */

export const SUBSCRIPTION_GRACE_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type SubscriptionState = 'active' | 'grace' | 'expired' | 'none';

export interface SubscriptionLike {
    subscriptionTier?: string | null;
    subscriptionExpiresAt?: Date | string | null;
    isPro?: boolean | null;
}

export function addMonths(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
}

export function getSubscriptionState(
    profile?: SubscriptionLike | null,
    now: Date = new Date()
): SubscriptionState {
    if (!profile) return 'none';
    const tier = profile.subscriptionTier;
    const isPaidTier = tier === 'pro' || tier === 'legend' || profile.isPro === true;
    if (!isPaidTier) return 'none';

    // null expiry on a paid tier = lifetime grant
    if (!profile.subscriptionExpiresAt) return 'active';

    const expiresMs = new Date(profile.subscriptionExpiresAt).getTime();
    const nowMs = now.getTime();
    if (nowMs < expiresMs) return 'active';
    if (nowMs < expiresMs + SUBSCRIPTION_GRACE_DAYS * MS_PER_DAY) return 'grace';
    return 'expired';
}

/** End of the grace window that starts at `expiresAt`. */
export function getGraceEndDate(expiresAt: Date | string): Date {
    return new Date(new Date(expiresAt).getTime() + SUBSCRIPTION_GRACE_DAYS * MS_PER_DAY);
}

/** Whole days from `now` until expiry (0 once expired). */
export function daysUntilExpiry(expiresAt: Date | string, now: Date = new Date()): number {
    const diffMs = new Date(expiresAt).getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / MS_PER_DAY));
}

/** Whole days from `now` until the grace period ends (0 once grace is over). */
export function daysUntilGraceEnd(expiresAt: Date | string, now: Date = new Date()): number {
    const diffMs = getGraceEndDate(expiresAt).getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / MS_PER_DAY));
}
