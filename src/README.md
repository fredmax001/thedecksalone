# Frontend Source (`app/src`)

React 19 + TypeScript SPA source root for Deck Salone (see parent [app/README.md](../README.md)). A single codebase targets desktop/mobile web, installable PWA, and Capacitor native iOS/Android builds.

## Key Files

| File | Responsibility |
| --- | --- |
| `main.tsx` | Entry point. On native Capacitor (`isCapacitorNative()`), unregisters legacy Service Workers and clears all Cache API caches; on web, defers `virtual:pwa-register` registration (`immediate: true`, auto-refresh on `onNeedRefresh`) until `window` `load`. Clears non-`uploads` caches whenever `CURRENT_BUILD_VERSION` is bumped on a breaking asset deploy. Runs `setupQueryPersistence`, `initPerformanceAdaptation`, `initKeyboardManager`, `initOfflineQueue`, and `useAuthStore.getState().init()` before mounting `<ErrorBoundary>` → `<QueryClientProvider>` → `<App />`. |
| `App.tsx` | Root `<BrowserRouter>` route table (all pages code-split with `React.lazy` + `Suspense`) plus global lifecycle managers and persistent overlays. |
| `index.css` | Local `Inter` font, Tailwind layers, core design tokens (`--gold: #FFF559`, `--bg-page: #000000`, shadcn HSL vars), Liquid Glass classes, `html[data-theme="light"]` overrides, press-feedback helpers, low-power/constrained-network CSS (`data-network-constrained`, `data-low-power`), dynamic viewport helpers (`.h-dvh`), and mobile safe-area/keyboard clearance utilities. |
| `vite-env.d.ts` | Ambient Vite and `vite-plugin-pwa/client` TypeScript type references. |

### `App.tsx` Lifecycle Managers & Global Overlays

- **Lifecycle managers** (rendered inside `<BrowserRouter>`):
  - `AuthInitializer` — runs `useAuthStore.init()` and `captureUtmParameters()` on mount.
  - `FirstTimeOnboardingDetector` — redirects first-launch unauthenticated mobile/native visitors on `/` or `/index.html` to `/onboarding` unless `ds_onboarded === '1'` or saved accounts/tokens exist.
  - `VisitTracker` — sends `POST /analytics/visit` with `x-deck-platform: app | mobile | web` on route changes.
  - `DeepLinkHandler` — native-only Capacitor `appUrlOpen` listener for `decksalone://auth/callback`, closes the system browser tab, validates `/auth/me`, or falls back to `/auth/callback`.
  - `UpdateChecker` — native-only Google Play version check on launch and `appStateChange` resume, surfacing a `sonner` update toast.
  - `SystemNotificationManager` — initializes Android local notification channels/tap handlers, polls unread notifications every 45s when authenticated, and mounts `useRealtimeNotifications()` SSE.
  - `PushNotificationManager` — triggers `initPushNotifications(navigate)` on authentication (native only).
  - `AnimatedSplashScreen` & `hideSplashScreen(0)` — dismisses native/HTML splash immediately and plays the in-app intro once per session on `/` (`sessionStorage['ds_intro_session']`).
- **Global overlays**: `<PopupManager />`, `<MixPlayer />`, `<PushBannerStack />`, `<LiveActivityPillBar />`, `<ResumeListeningModal />`, `<NotificationPermissionPrompt />`, `<CookieConsent />`, and `<Toaster />` (`sonner`, dark theme, `zIndex: 99999`).

### `App.tsx` Route Architecture

- **Auth & standalone**: `/index.html` (redirects to `/`), `/auth/callback`, `/onboarding`, `/login`, `/register`, `/forgot-password`, `/reset-password`, plus auth-gated `/notifications` and `/onboarding/setup`.
- **Staff consoles** (`ProtectedRoute` with `allowedRoles`): `/admin` (`ADMIN`, `SUPER_ADMIN`), `/finance` (`FINANCE_ADMIN`), `/support` (`SUPPORT_ADMIN`), `/verification` (`VERIFICATION_ADMIN`), and `/moderator/*` (`ADMIN`, `MODERATOR` — `mixes`, `playlists`, `rankings`, `reports`, `logs`).
- **DJ & Event Organizer dashboard** (`ProtectedRoute excludeRoles={['USER']}` → `/user/dashboard`, checking primary `user.role`): nested under `<DashboardLayout />` at `/dashboard/*` (studio, mixes/sets/photos, bookings/messages, events/ticketing/analytics, earnings, followers, profile, subscription, opportunities, campaigns, settings), plus `RequireProRoute`-gated `/dashboard/scanner` and full-screen `/dashboard/events/:eventId/scan`.
- **Listener dashboard** (`ProtectedRoute` + `<UserDashboardLayout />`): `/user/dashboard`, `/user/bookings`, `/user/tickets`, `/user/messages`, `/user/following`, `/user/activity`, `/user/notifications`, `/user/profile`, `/user/settings`.
- **Public site** (`<Layout />`): discovery & audio (`/`, `/discover`, `/explore`, `/feed`, `/rankings`, `/hall-of-fame`, `/dj/:identifier`, `/mixes`, `/sets`, `/mix/:id`, `/mixes/:id`, `/mix/:djIdentifier/:slug`, `/mixes/:djIdentifier/:slug`, `/:djIdentifier/:slug` [direct mix URL modeled after HearThis.at], `/playlists`, `/playlist/:slug`, `/playlists/:slug`, `/library`, `/my-library`), events & commerce (`/events`, `/events/:id`, `/events/:id/onsite`, `/events/:id/onsite/tools`, `/booking`, `/request-dj`, `/pricing`, `/subscription`), profiles & info (`/user/:username`, `/account`, `/install`, `/developers`, `/api`, `/terms`, `/privacy`, `/help`, `/blog`, `/about`), and catch-all `*` → `/`.

## Subdirectories

- [components/](./components/README.md) — Layouts, route guards, persistent audio player, modals, notifications, onboarding, feed/home modules, and `ui/` primitives.
- [pages/](./pages/README.md) — Lazy-loaded route screens for public site, auth, DJ/organizer `dashboard/`, listener `user/`, `moderator/`, and `onsite/` door tools.
- [stores/](./stores/README.md) — Global Zustand client-state stores (auth, audio player, local playlists, Sierra Leone location, live activities, upgrade modal).
- [hooks/](./hooks/README.md) — TanStack React Query data hooks and UI/role/tier utility hooks.
- [lib/](./lib/README.md) — Axios API client, caching/storage wrappers, Capacitor native bridges, offline walk-in queue, and domain utilities.
- [constants/](./constants/README.md) — Static taxonomies (`GENRES`, `MOODS`, `ENERGIES`, `ADMIN_ROLES`).
- [utils/](./utils/README.md) — Pure domain calculation helpers (`mixRanking.ts`).

## Conventions & Notes

- **Path alias**: `@/` resolves to `app/src/`.
- **Role & tier gating**: `ProtectedRoute` checks primary `user.role` (not `User.roles[]`), so `DJ` and `EVENT_ORGANIZER` accounts pass `excludeRoles={['USER']}`. `RequireProRoute` in `App.tsx` redirects unauthenticated visitors to `/login`, grants access to `pro`/`legend` (UI brand **Pro+**) DJs, `EVENT_ORGANIZER`, and all admin/moderator roles, and redirects other signed-in users to `/dashboard/events` (canonical tier hierarchy: `free` < `pro` < `legend`, defined in `hooks/useFeatureAccess.ts` and `api/middleware/permissions.ts`).
- **Dynamic layout CSS variables**: `--bottom-nav-height`, `--mini-player-height`, `--sticky-cta-height`, `--keyboard-height`, and `--keyboard-offset` are synchronized at runtime so floating navigation, mini-player, and sticky CTAs avoid overlapping the mobile virtual keyboard.
- **Public mix edit aliases**: `/mix/:id/edit` and `/mixes/:id/edit` are mounted inside the public `<Layout />` alongside `/dashboard/mixes/:id/edit` for direct deep links; ownership/auth enforcement happens inside `EditMix` and the API.
