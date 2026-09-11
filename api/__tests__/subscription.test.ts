import {
  getSubscriptionState,
  addMonths,
  daysUntilExpiry,
  daysUntilGraceEnd,
  SUBSCRIPTION_GRACE_DAYS,
} from '../utils/subscription';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-11T12:00:00.000Z');

describe('getSubscriptionState', () => {
  it('returns none for free tier or missing profile', () => {
    expect(getSubscriptionState(null, NOW)).toBe('none');
    expect(getSubscriptionState({ subscriptionTier: 'free' }, NOW)).toBe('none');
  });

  it('returns active when expiry is in the future', () => {
    expect(getSubscriptionState({ subscriptionTier: 'pro', subscriptionExpiresAt: new Date(NOW.getTime() + 10 * DAY_MS) }, NOW)).toBe('active');
    expect(getSubscriptionState({ subscriptionTier: 'legend', subscriptionExpiresAt: new Date(NOW.getTime() + 300 * DAY_MS) }, NOW)).toBe('active');
  });

  it('returns grace within the grace window after expiry', () => {
    expect(getSubscriptionState({ subscriptionTier: 'pro', subscriptionExpiresAt: new Date(NOW.getTime() - 1 * DAY_MS) }, NOW)).toBe('grace');
    expect(
      getSubscriptionState(
        { subscriptionTier: 'legend', subscriptionExpiresAt: new Date(NOW.getTime() - SUBSCRIPTION_GRACE_DAYS * DAY_MS + 1000) },
        NOW
      )
    ).toBe('grace');
  });

  it('returns expired once the grace period has passed', () => {
    expect(getSubscriptionState({ subscriptionTier: 'pro', subscriptionExpiresAt: new Date(NOW.getTime() - 4 * DAY_MS) }, NOW)).toBe('expired');
    expect(getSubscriptionState({ subscriptionTier: 'legend', subscriptionExpiresAt: new Date(NOW.getTime() - 100 * DAY_MS) }, NOW)).toBe('expired');
  });

  it('treats null expiry on a paid tier as lifetime (active)', () => {
    expect(getSubscriptionState({ subscriptionTier: 'pro', subscriptionExpiresAt: null }, NOW)).toBe('active');
  });

  it('handles the legacy isPro flag', () => {
    // Grandfathered legacy flag without an expiry date = lifetime
    expect(getSubscriptionState({ subscriptionTier: 'free', isPro: true, subscriptionExpiresAt: null }, NOW)).toBe('active');
    // ...but a real expiry date still wins
    expect(getSubscriptionState({ subscriptionTier: 'free', isPro: true, subscriptionExpiresAt: new Date(NOW.getTime() - 10 * DAY_MS) }, NOW)).toBe('expired');
  });
});

describe('addMonths', () => {
  it('adds whole months', () => {
    expect(addMonths(new Date('2026-01-15T00:00:00Z'), 1).toISOString().slice(0, 7)).toBe('2026-02');
    expect(addMonths(new Date('2026-09-11T00:00:00Z'), 12).toISOString().slice(0, 7)).toBe('2027-09');
  });
});

describe('day counters', () => {
  it('counts whole days until expiry', () => {
    expect(daysUntilExpiry(new Date(NOW.getTime() + 2.2 * DAY_MS), NOW)).toBe(3);
    expect(daysUntilExpiry(new Date(NOW.getTime() - DAY_MS), NOW)).toBe(0);
  });

  it('counts whole days until grace end', () => {
    expect(daysUntilGraceEnd(new Date(NOW.getTime() - 1 * DAY_MS), NOW)).toBe(2);
  });
});
