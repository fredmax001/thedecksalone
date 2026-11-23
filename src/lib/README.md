# Frontend Core Library (`app/src/lib`)

Core frontend infrastructure for Deck Salone: Axios HTTP client and auth-token guards, React Query configuration and disk persistence, safe Web Storage fallbacks, Capacitor native bridges, offline walk-in queue, and shared domain/formatting helpers. See [app/src/README.md](../README.md).

## Key Files

### API, Auth & Caching

| File | Primary Export(s) | Responsibility |
| --- | --- | --- |
| `api.ts` | `api` (default & named), `isCapacitorNative`, `getMediaUrl`, `getAuthToken`, `withAuthToken`, `shouldAttachToken`, `downloadMixFile` | Shared Axios client. Resolves `baseURL` to `https://decksalone.com/api` inside Capacitor native WebViews (and non-`decksalone.com` prod origins) or `/api` on same-origin web. Request interceptor attaches `Authorization: Bearer <token>` and removes `Content-Type` for `FormData`. Response interceptor clears auth storage, `queryClient`, and `playerStore` on `401` and redirects to `/login` (skipping redirect for `/auth/me`). `getMediaUrl(path, width?)` normalizes localhost/http URLs to HTTPS and adds `?w=` for `/uploads/` image endpoints. `downloadMixFile` downloads external audio via `<a>` and same-origin gated files via authenticated `blob` fetch. |
| `shouldAttachToken.ts` | `shouldAttachToken(url, origin)` | Same-origin security predicate (UPL-9) ensuring `withAuthToken` only appends `?token=<JWT>` to relative paths or `origin` / `https://decksalone.com` / `https://www.decksalone.com` URLs under `/uploads/` or `/api/mixes/`. Kept free of `import.meta` for direct Node unit testing. |
| `apiErrors.ts` | `getApiErrorMessage(err, fallback)` | Extracts `err?.response?.data?.error` with a caller-supplied fallback message. |
| `queryClient.ts` | `queryClient` | Singleton TanStack `QueryClient` (`staleTime: 5m`, `gcTime: 15m`, `refetchOnWindowFocus: false`, `refetchOnMount: false`, `refetchOnReconnect: true`, `retry: 1`). |
| `queryPersistence.ts` | `setupQueryPersistence`, `clearPersistedQueryCache`, `QUERY_CACHE_STORAGE_KEY` | Syncs an explicit allowlist of 18 public, low-churn root query keys (`PERSISTED_QUERY_KEYS`) to `safeLocalStorage` under `decksalone-query-cache` (24h `maxAge`). Private/user-specific queries are excluded by construction. |
| `safeStorage.ts` | `safeLocalStorage`, `safeSessionStorage`, `safeGetItem`, `safeSetItem`, `safeRemoveItem` | Feature-detects Web Storage and transparently falls back to an in-memory `MemoryStorage` so Safari Private Browsing, restricted WebViews, and quota errors never throw unhandled exceptions. |
| `googleAuth.ts` | `openGoogleAuth` | Opens `/api/v1/auth/google/mobile?device_id=<id>` in Capacitor `Browser` (Chrome Custom Tab / Safari View Controller) on native, or redirects to `/api/v1/auth/google` on web. |
| `navigation.ts` | `redirectAfterAuth(role, navigate, opts?)` | Routes authenticated users by `UserRole` (`/admin`, `/finance`, `/support`, `/verification`, `/moderator`, `/dashboard`, or `/discover`; DJs land on `/discover` on `< 768px` mobile). |
| `schemas.ts` | `passwordSchema` | Shared Zod password schema (≥8 chars, lowercase, uppercase, digit). |

### Capacitor Native Bridges, Mobile UX & Offline Sync

| File | Primary Export(s) | Responsibility |
| --- | --- | --- |
| `offline-queue.ts` | `initOfflineQueue`, `enqueueWalkinSale`, `drainWalkinQueue`, `getWalkinQueue`, `getQueuedWalkinsForEvent`, `removeQueueItem`, `updateQueueItem`, `subscribeToQueueChanges`, `isNetworkError` | Walk-in ticket sale offline write queue (`decksalone-offline-queue`, max 20 items) with client-generated `idempotencyKey`. Replays in order on `online` via `POST /events/:eventId/ticketing/onsite/walkin` with `X-Onsite-Token`; server rejections stay visible in `'rejected'` state for door-staff cash reconciliation. |
| `keyboardManager.ts` | `initKeyboardManager`, `useKeyboardStatus` | Tracks `visualViewport`, input focus, and Capacitor `Keyboard` events to toggle `html[data-keyboard-open]` / `html[data-input-focused]`, update `--keyboard-height` / `--keyboard-offset`, and smooth-center focused text inputs on mobile. |
| `performanceAdaptation.ts` | `initPerformanceAdaptation`, `applyPerformanceAdaptation`, `isConstrainedNetwork`, `isLowPowerDevice` | Inspects Network Information API (`saveData`, `slow-2g`/`2g`/`3g`, `rtt > 500`, `downlink < 1`) and hardware (`hardwareConcurrency <= 4`, `deviceMemory <= 4`) to toggle `html[data-network-constrained]` and `html[data-low-power]`. |
| `splashScreen.ts` | `hideSplashScreen(delayMs = 0)` | Fades out `#deck-salone-splash` DOM overlay and native Capacitor `SplashScreen` with a 2500ms force-hide safety net. |
| `haptics.ts` | `triggerHaptic`, `triggerNotificationHaptic`, `triggerSelectionHaptic` | Wraps `@capacitor/haptics` with `navigator.vibrate` fallback on web. |
| `systemNotifications.ts` | `initSystemNotifications`, `requestNotificationPermission`, `showSystemNotification`, `syncUnreadSystemNotifications` | Android local notification channel (`deck_salone_notifications`), tap deep-linking, permission prompts, and unread notification sync deduplicated via `deck_salone_shown_notifications_v1` (max 200 IDs). |
| `pushNotifications.ts` | `initPushNotifications`, `unregisterPushTokens` | Native FCM registration & logout token cleanup. **Currently disabled via `FCM_ENABLED = false`** until `google-services.json` is added (calling FCM without Firebase initialized crashes Android on login). |
| `appUpdates.ts` | `useUpdateStore`, `isUpdateCheckSupported`, `getInstalledVersionInfo`, `checkForUpdate`, `openUpdatePage`, `markUpdateToastShown`, `wasUpdateToastShown` | Native Google Play version checker comparing `CapacitorApp.getInfo().build` against `GET /app/version` (1-hour throttle) and launching `market://details?id=decksalone.com` with HTTPS fallback. |

### Formatting, URLs, Geography & Telemetry

| File | Primary Export(s) | Responsibility |
| --- | --- | --- |
| `utils.ts` | `cn`, `imageFallback`, `mixImageFallback`, `eventImageFallback`, `getAvatarUrl`, `getAvatarImageUrl`, `stripEmojis` | Tailwind class merge (`clsx` + `tailwind-merge`), image `onError` fallbacks, avatar resizing helper, and emoji sanitizer. |
| `formatting.ts` | `formatCompactNumber`, `formatCurrency`, `formatCount` | Compact number formatting and currency display (defaults to `'SLE'`). |
| `dateTime.ts` | `formatDate`, `formatTime`, `formatDateTime`, `formatEventDate` | Null-safe `Date` display formatters. |
| `slug.ts` | `slugify`, `getMixUrl`, `getMixShareUrl`, `MixUrlSource` | Builds Hearthis-style mix paths (`/:djUsername/:mixSlug`) and absolute share URLs (defaults missing DJ identifier to `djfredmax`). |
| `url.ts` | `buildQueryString(filters)` | Serializes non-empty query parameters into `?k=v` strings. |
| `notify.ts` | `notify` (`success`, `error`, `info`), `NotifyOptions` | `sonner` wrapper with duplicate suppression (3s window; 2s for errors) and `onUndo` / custom action support. |
| `recommendations.ts` | `getUserTasteProfile`, `recordMixPlaybackTaste`, `getTopFavoriteGenres`, `getLastFeedVisit`, `markFeedAsSeenNow` | Local playback taste counters (`decksalone_user_taste_profile`, last 30 mix IDs) and feed-seen watermark (`decksalone_last_feed_visit`, defaults to 3 days ago). |
| `utm.ts` | `captureUtmParameters`, `getStoredUtmParameters`, `UtmParameters` | Captures `utm_*` query params and `document.referrer` into `sessionStorage['decksalone_utm_params']`. |
| `africanCountries.ts` | `AFRICAN_COUNTRIES`, `isAfricanCountry` | Alphabetical list of all 54 African countries supported on registration/profiles. |
| `sierraLeoneLocations.ts` | `SIERRA_LEONE_LOCATIONS`, `SIERRA_LEONE_CITIES`, `CITY_TO_COMMUNITIES` | 10 Sierra Leone cities mapped to curated neighborhoods/communities. |
| `userCountry.ts` | `getUserCountry`, `isSierraLeoneUser` | Resolves a user's country from `djProfile.country` or `user.location` (defaults unknown legacy accounts to `'Sierra Leone'` so Orange Money / Afrimoney vs PayPal payment gating remains backwards-compatible). |

## Conventions & Notes

- Always call `clearPersistedQueryCache()` alongside `queryClient.clear()` on auth transitions so shared devices never expose prior-user cache entries.
- Do not enable `FCM_ENABLED` in `pushNotifications.ts` until `app/android/app/google-services.json` is provisioned in the native Android project.
- Use `safeStorage.ts` helpers instead of raw `localStorage` in boot-path code so iOS Private Browsing / embedded WebViews cannot abort React mount.
