import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { queryClient } from './queryClient';

export const QUERY_CACHE_STORAGE_KEY = 'decksalone-query-cache';

/**
 * Query keys allowed on disk. EXACT first-element match — a query is persisted
 * only if queryKey[0] is in this set. Anything user-specific, private, or
 * high-churn (DMs, notifications, bookings, tickets, earnings, admin data,
 * feeds, battles) is excluded BY CONSTRUCTION. Do not add to this list without
 * asking whether the data is public, low-churn, and safe on a shared device.
 */
const PERSISTED_QUERY_KEYS = new Set([
  // Home / discovery (public, hours-level churn)
  'featuredDJs',
  'rankings',
  'rankingsOverview',
  'rankingHistory',
  'currentBattle',
  // Taxonomy (near-static)
  'mixCategories',
  'mixGenres',
  'djGenres',
  'djCities',
  'eventTypes',
  // Public content details
  'mix',
  'event',
  'dj',
  'reviews',
  'public-user',
  'officialPlaylists',
  // Hall of fame (static; 'hallOfFameLegendsAdmin' is a different exact key and stays excluded)
  'hallOfFameLegends',
  'hallOfFameDJs',
  'hallOfFameMixes',
]);

const storagePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: QUERY_CACHE_STORAGE_KEY,
});

export function setupQueryPersistence() {
  persistQueryClient({
    queryClient,
    persister: storagePersister,
    maxAge: 1000 * 60 * 60 * 24, // 24h — older than this, render skeletons and refetch
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        PERSISTED_QUERY_KEYS.has(String(query.queryKey[0])),
    },
  });
}

/**
 * Wipes the persisted on-disk query cache. MUST be called wherever
 * queryClient.clear() is called on session changes (logout / login /
 * register / setAuth) so the next account on this device cannot read the
 * previous account's cached responses.
 */
export function clearPersistedQueryCache() {
  try {
    window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
  } catch (e) {
    // storage unavailable (private mode etc.) — nothing persisted, nothing to clear
  }
}
