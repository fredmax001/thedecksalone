# Frontend Stores (`app/src/stores`)

Global Zustand client-state stores for Deck Salone (see [app/src/README.md](../README.md)). Server state is managed via TanStack React Query in [hooks/](../hooks/README.md); this directory holds cross-cutting session, playback, UI, and device-local state.

## Key Files

| File | Primary Export(s) | Responsibility & Persistence |
| --- | --- | --- |
| `authStore.ts` | `useAuthStore`, `User`, `UserRole`, `SavedAccount` | Authentication session, JWT token, user/DJ profile, and multi-account switching (`savedAccounts`, `switchAccount`, `removeSavedAccount`, `login`, `register`, `setAuth`, `fetchMe`, `logout(all?)`, `init`). Persists `{ token, savedAccounts }` to `decksalone-auth` via `safeLocalStorage` and migrates legacy `soundit-auth` keys (from Deck Salone's former **SoundIt** name) on `init()`. |
| `playerStore.ts` | `usePlayerStore`, `MixTrack`, `SavedPosition` | Global audio playback state (`currentTrack`, `isPlaying`, `volume`, `isMuted`, `progress`, `currentTime`, `duration`), queue management (`queue`, `currentIndex`, `setQueue`, `addToQueue`, `next`, `prev`), and per-user resume tracking (`history`, `lastSession`, `savePlaybackPosition`, `getPlaybackPosition`, `setCurrentUserId`). Manually persists user-scoped `localStorage` keys (`decksalone_playback_history_<userId>`, `decksalone_last_session_<userId>`). Calls `recordMixPlaybackTaste(track)` ([lib/recommendations.ts](../lib/recommendations.ts)) on `setTrack` to update local genre/DJ taste weights. |
| `playlistStore.ts` | `usePlaylistStore`, `UserPlaylist` | Device-local user playlists (`createPlaylist`, `deletePlaylist`, `renamePlaylist`, `addTrackToPlaylist`, `removeTrackFromPlaylist`, `getPlaylist`). Persisted via Zustand `persist` under `decksalone_user_playlists`. |
| `locationStore.ts` | `useLocationStore`, `findNearestSierraLeoneCity` | Active Sierra Leone city filter (`selectedCity`, defaults to `'All Cities'`), `availableCities` (from `SIERRA_LEONE_CITIES`), GPS `coords`, and community lookup (`getCommunitiesForCity`). Persists `deck-salone-selected-city` and `deck-salone-location` in `localStorage` and computes nearest city across 16 Sierra Leone city coordinate centroids. |
| `liveActivityStore.ts` | `useLiveActivityStore`, `LiveActivityKind`, `LiveActivityStatus`, `LiveActivityItem` | Ephemeral in-memory tracker (capped at 5 items) for background operations (`mix-upload`, `audio-processing`, `file-download`, `event-publishing`, `booking-processing`). Drives `<LiveActivityPillBar />` via `upsertActivity`, `updateProgress`, `completeActivity` (default 4500ms auto-dismiss), `failActivity` (optional `onRetry`), and `dismissActivity`. |
| `upgradeModalStore.ts` | `useUpgradeModalStore` | Ephemeral state (`isOpen`, `feature`, `requiredTier: 'pro' \| 'legend'` [where `legend` is branded **Pro+**], `open`, `close`) controlling `<UpgradeModal />`, triggered by `useFeatureAccess`. |

## Conventions & Notes

- **Cross-account data isolation**: Every session boundary in `authStore` (`setAuth`, `login`, `register`, `switchAccount`, `logout`, failed `fetchMe`) purges both in-memory and disk React Query caches (`queryClient.clear()` + `clearPersistedQueryCache()`) and updates `usePlayerStore.getState().setCurrentUserId(...)`. `logout()` also fires best-effort `unregisterPushTokens()` and preserves `ds_onboarded = '1'` so signing out does not re-trigger first-install onboarding.
- **User-scoped playback resume**: `playerStore.savePlaybackPosition` and `getPlaybackPosition` are no-ops when `currentUserId` is `null` (guests do not persist resume positions); saved positions are returned only while `progress < 0.96` and `currentTime >= 2`. Transitioning `null → userId` (guest logs in) keeps the current public track playing while loading that user's private history; switching `userA → userB` resets active playback and queue.
- **Storage quirks**:
  - `authStore` routes through `safeLocalStorage` ([lib/safeStorage.ts](../lib/safeStorage.ts)) to avoid Safari Private Browsing crashes; `playlistStore` uses Zustand's default `localStorage` persister and is not scoped per user ID.
  - `locationStore` holds GPS coordinate centroids for 16 Sierra Leone cities, while `SIERRA_LEONE_CITIES` in [lib/sierraLeoneLocations.ts](../lib/sierraLeoneLocations.ts) exposes 10 cities with curated community lists (the remaining 6 cities still resolve for city-level filtering but return an empty community list).
- **Store outside `stores/`**: `useUpdateStore` (native Google Play update state) is co-located in [lib/appUpdates.ts](../lib/appUpdates.ts).
