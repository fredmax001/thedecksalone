import type { MixTrack } from '@/stores/playerStore';

const TASTE_KEY = 'decksalone_user_taste_profile';
const LAST_FEED_KEY = 'decksalone_last_feed_visit';

export interface UserTasteProfile {
  genrePlays: Record<string, number>;
  djPlays: Record<string, number>;
  recentMixIds: string[];
  totalPlaysRecorded: number;
}

export function getUserTasteProfile(): UserTasteProfile {
  try {
    const raw = localStorage.getItem(TASTE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {
    genrePlays: {},
    djPlays: {},
    recentMixIds: [],
    totalPlaysRecorded: 0,
  };
}

export function recordMixPlaybackTaste(track?: MixTrack | null) {
  if (!track || !track.id) return;
  try {
    const current = getUserTasteProfile();

    // 1. Record Genre
    const g = (track.genre || '').trim();
    if (g && g.toLowerCase() !== 'unknown' && g.toLowerCase() !== 'mix') {
      current.genrePlays[g] = (current.genrePlays[g] || 0) + 1;
    }

    // 2. Record DJ
    const dj = (track.djId || track.dj || '').trim();
    if (dj) {
      current.djPlays[dj] = (current.djPlays[dj] || 0) + 1;
    }

    // 3. Record Recent Mix ID (up to 30)
    current.recentMixIds = [track.id, ...current.recentMixIds.filter((id) => id !== track.id)].slice(0, 30);
    current.totalPlaysRecorded += 1;

    localStorage.setItem(TASTE_KEY, JSON.stringify(current));
  } catch {
    // silent failure
  }
}

export function getTopFavoriteGenres(limit = 3): string[] {
  const profile = getUserTasteProfile();
  return Object.entries(profile.genrePlays)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([g]) => g);
}

export function getLastFeedVisit(): string {
  try {
    const stored = localStorage.getItem(LAST_FEED_KEY);
    if (stored) return stored;
  } catch {}
  // Default: 3 days ago
  const defaultDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  localStorage.setItem(LAST_FEED_KEY, defaultDate);
  return defaultDate;
}

export function markFeedAsSeenNow(): string {
  const now = new Date().toISOString();
  try {
    localStorage.setItem(LAST_FEED_KEY, now);
  } catch {}
  return now;
}
