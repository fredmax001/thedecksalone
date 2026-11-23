# Frontend Components (`app/src/components/`)

Shared React UI components for the Deck Salone web and Capacitor mobile frontend, spanning shell layouts, persistent audio playback, social/creator modals, monetization/gating, auth/security widgets, and system prompts. See [app/src/](../README.md) for the frontend overview.

## Key Files

### Layouts & Navigation

| File | Responsibility |
| --- | --- |
| `Layout.tsx` | Public app shell with desktop sidebar (`Browse` + DJ `Studio` links), top bar (`SearchModal`, `NotificationBell`, `UserDropdownMenu`), `BottomNav`, `Footer`, `PWAInstallPrompt`, scroll-to-top, and route-based fallback `document.title`. |
| `DashboardLayout.tsx` | Creator shell switching between DJ (`djNavItems`) and Event Organiser (`organizerNavItems`) sidebars with collapsible width (`<1280px`), badge counts (`useNotificationBadges`), `TrialBanner`, `UpgradeModal` (`useUpgradeModalStore`), and `MobileTabBar`; redirects `MODERATOR` users to `/moderator`. |
| `UserDashboardLayout.tsx` | Listener/fan account shell (`/user/*`) with collapsible sidebar, unread badge counts, and `BottomNav`. |
| `AuthLayout.tsx` | Two-column auth shell pairing a decorative left panel (`/login-bg.jpg`, `WaveformAnimation`, quote/stats) with a centered right form column. |
| `BottomNav.tsx` | Mobile floating dock adapting items for DJs vs. listeners; hidden on `/admin`, `/moderator`, `/onboarding`, and `/edit`, `/scanner`, `/onsite` routes, and publishes `--bottom-nav-height` via `ResizeObserver`. |
| `MobileTabBar.tsx` | Scrollable mobile tab bar for dashboard layouts; hides on `/edit` and `/scanner`, shows notification badges, and also updates `--bottom-nav-height`. |
| `Footer.tsx` | Desktop/tablet footer with platform navigation, legal/resource links (including brand logo ZIP download), and social channels. |
| `UserDropdownMenu.tsx` | Avatar dropdown showing tier-styled ring (`free`/`pro`/`legend`), role-aware links, multi-account switcher (`savedAccounts`, `switchAccount`, `removeSavedAccount`), and logout. |

### Audio Playback & Discovery

| File | Responsibility |
| --- | --- |
| `MixPlayer.tsx` | Global persistent audio engine (desktop mini-bar + expandable fullscreen player, re-exports `MixTrack`). Supports direct streams, embed fallbacks (`youtube`, `soundcloud`, `mixcloud`, excluding `hearthis`), MediaSession lock-screen controls, `play-mix` window event listener, likes, downloads, queue/shuffle/repeat, Capacitor haptics, and publishes `--mini-player-height`. |
| `WaveformPlayer.tsx` | Deterministic 100-bar canvas-free waveform seeker seeded by `trackId`, with hover time preview and timestamped `ReactionMarker` badges. |
| `WaveformAnimation.tsx` | Memoized 40-bar ambient Framer Motion background equalizer (used in `AuthLayout`). |
| `ResumeListeningModal.tsx` | Prompts authenticated users once per session to resume `usePlayerStore.lastSession` (between 10s and 95% progress) if no track is playing. |
| `MixRecommendations.tsx` | Fetches `GET /mixes/:id/recommendations` to display `similar` and `moreFromDj` playable rails. |
| `SearchModal.tsx` | Modal search across mixes and DJs (`useMixes`, `useDJs`, genre filters, sort controls, grid/list toggle, quick play). |

### Modals, Social & Creator Actions

| File | Responsibility |
| --- | --- |
| `AddToPlaylistModal.tsx` | Adds a `MixTrack` to an existing/new user playlist (`usePlaylistStore`) or to the play queue. |
| `EmbedMixModal.tsx` | Generates and copies an `<iframe>` snippet pointing to `/embed/mix/:id`. |
| `MixComments.tsx` | Threaded mix comments (`GET/POST/DELETE /mixes/:id/comments`, likes, long-press actions via `useLongPress`, `ModeratorBadge`, creator badge). |
| `MixDownloadModal.tsx` | Multi-mode download gate modal (`'auth' \| 'subscribe' \| 'repost' \| 'follow'`) handling `POST /mixes/:id/repost` and `POST /djs/:id/follow` before invoking `onActionComplete`. |
| `RepostButton.tsx` | Authenticated mix repost toggle (`useRepostStatus`, `useRepostMix`, `useUnrepostMix`). |
| `ReupButton.tsx` | DJ-only Pro-gated mix re-up button (`useReupStatus`, `useFeatureAccess`); fans see a disabled read-only count, non-Pro DJs trigger `UpgradeModal`. |
| `ShareButton.tsx` | Multi-channel share popover exporting `DjPreview`, `MixPreview`, `EventPreview`, `UserPreview`, `HallOfFamePreview`, and `SharePreview`; opens `StoryPosterModal`. |
| `StoryPosterModal.tsx` | Customizable share-card generator (`story` / `square` / `wide` formats, color themes, embedded `QRCodeSVG`, image download/share). |
| `ReportModal.tsx` | Compliance/abuse reporting dialog (`POST /reports`) for users, mixes, events, or comments with optimistic close. |
| `BookingCalendar.tsx` | DJ availability calendar exporting `STANDARD_TIME_SLOTS` (`MORNING`, `AFTERNOON`, `EVENING_NIGHT`) and `TimeSlotOption`. |
| `NotificationBell.tsx` | Header notification dropdown (`useNotifications` hooks, mark-read/delete/clear-all confirmation) exporting `notificationConfig` icon/color mappings. |
| `ProfileCompletionCard.tsx` | 5-step DJ profile strength checklist reading `user.profileCompletion`; hides at 100%. |
| `ReferralCard.tsx` | DJ referral progress banner (`useDJReferral`) with copy-link and WhatsApp share actions toward a 5-referral Pro+ reward. |

### Monetization, Payouts & Tier Gating

| File | Responsibility |
| --- | --- |
| `FeatureLock.tsx` | Exports `FeatureLock` (blurred overlay lock checking `useFeatureAccess.hasTier`) and `FullPageLock` for `'pro' \| 'legend'` tier gating. |
| `UpgradeModal.tsx` | Plan comparison dialog (`Pro` 250 SLE vs. `Pro+` / `legend` 750 SLE) routing to subscription checkout. |
| `TrialBanner.tsx` | DJ-only banner rendering `subscription_grace`, `subscription_expired`, active 14-day trial, or trial-expired notices from `user.trialStatus`. |
| `PayPalButton.tsx` | Reusable PayPal JS SDK v5 button fetching `/payments/paypal/config` and loading the SDK on demand; hides cleanly when PayPal is disabled. |
| `DjSupportModal.tsx` | Tip/support modal supporting instant PayPal capture (`/payments/paypal/support-order`, `/payments/paypal/capture-support`) and manual receipt upload (`POST /djs/:id/support`). |
| `PayoutMethodModal.tsx` | Configures DJ payout rails (`ORANGE_MONEY`, `AFRIMONEY`, `BANK_TRANSFER` with exported `SL_BANKS`) via `/djs/me/payout-method`. |
| `RequestPayoutModal.tsx` | Withdrawal request dialog (`POST /djs/me/payout-requests`, minimum SLE 50, checks configured payout method and available balance). |
| `ReachListenersModal.tsx` | Mix promotion dialog for Pro/Pro+ DJs spending promotion points (`/djs/me/promotion-points`, `POST /mixes/:id/promote`). |

### Auth, Security & Badges

| File | Responsibility |
| --- | --- |
| `ProtectedRoute.tsx` | Route guard reading `useAuthStore` with `allowedRoles`, `excludeRoles`, loading spinner, and `fallback` redirect (default `/login`). |
| `PhoneOtpForm.tsx` | Two-step SMS OTP auth form (`POST /auth/phone/send-otp`, `POST /auth/phone/verify`) with 60s resend timer and `devCode` support. |
| `PasswordStrength.tsx` | Memoized 4-segment password strength meter (`Too weak` → `Strong`). |
| `TurnstileWidget.tsx` | Explicit-render Cloudflare Turnstile CAPTCHA loader (`VITE_TURNSTILE_SITE_KEY`, dark theme, cleans up widget on unmount). |
| `VerifiedBadge.tsx` | SVG checkmark badge rendering gold (`#FACC15`) for gold/yellow/Pro/Pro+ verified DJs and gray (`#9CA3AF`) for standard verified DJs. |
| `ModeratorBadge.tsx` | Pill badge rendered only for `MODERATOR` or `ADMIN` users (or unconditionally when `user` prop is omitted). |

### SEO, Prompts & System Utilities

| File | Responsibility |
| --- | --- |
| `SEOHead.tsx` | Syncs `document.title` (via exported `formatPageTitle`), meta description, OpenGraph, Twitter cards, `robots` (`noIndex`), and canonical `<link>` (`https://decksalone.com`). |
| `GlobalErrorFallback.tsx` | ErrorBoundary fallback UI that immediately calls `hideSplashScreen(0)` and shows error messages only in `import.meta.env.DEV`. |
| `PopupManager.tsx` | Renders admin-managed `BANNER`, `MODAL`, and `SHEET` popups from `useActivePopups` with per-session dismissal. |
| `CookieConsent.tsx` | Web-only (disabled in Capacitor native) GDPR/GPC cookie banner updating Google Consent Mode v2 (`updateGoogleConsent`, `getCookieConsent`, key `decksalone_cookie_consent_v2`). |
| `TermsAcceptanceModal.tsx` | First-visit terms acceptance gate stored in `deck-salone-terms-accepted`. |
| `LocationPrompt.tsx` | Delayed geolocation prompt (`deck-salone-location-preference` → `useLocationStore`) that defers whenever a track is playing or any `.fixed.inset-0` modal is open. |
| `NotificationPermissionPrompt.tsx` | Authenticated-only push/local notification prompt (supports Capacitor `LocalNotifications` and Web `Notification` API) with 7-day snooze; waits until a location preference is recorded. |
| `PWAInstallPrompt.tsx` | Mobile web-only PWA install guide (suppressed in Capacitor/WebView/standalone mode, 7-day dismiss TTL). |
| `UpdatesSection.tsx` | Settings card (`@/lib/appUpdates`) showing installed version/build and manual update checks on native builds. |
| `CountdownTimer.tsx` | Memoized 1-second `dd hh mm ss` countdown display. |
| `FadeIn.tsx` | Scroll-triggered Framer Motion entrance wrapper (`useInView`). |

## Subdirectories

### Feature Subdirectories

- [home/](./home/README.md) — Homepage hero banner, DJ/mix/ad carousels, rankings, playlists, and shared `Home*` entity types.
- [feed/](./feed/README.md) — Feed hero spotlight, waveform/compact `MixFeedRow`, DJ/event/playlist rows, and `Feed*` types.
- [onboarding/](./onboarding/README.md) — Animated splash intro, role selector, sign-up screen, pagination, and post-signup activation checklist.
- [notifications/](./notifications/README.md) — Foreground `PushBannerStack`, `LiveActivityPillBar`, and multi-channel `NotificationPreferencesPanel`.
- [events/](./events/README.md) — Scannable QR `DigitalTicket` pass and organizer `TicketTypeBuilder`.
- [ui/](./ui/README.md) — Stock shadcn/Radix primitives plus custom Deck Salone design-system composites, `OptimizedImage`, and page skeletons.

### Leaf Subdirectories (1–2 Files)

- `admin/` — `AdminOnboardingAndNotificationAnalytics.tsx` (`AdminOnboardingAndNotificationAnalytics`): admin dashboard panel fetching `/admin/notification-intelligence/onboarding-analytics` and `/admin/notification-intelligence/analytics` across `7d`/`30d`/`90d`/`all` ranges with role funnels and privacy-safe delivery metrics.
- `playlists/` — `PlaylistCoverArt.tsx` (`PlaylistCoverArt`, default): dynamic playlist artwork card resolving cover art in order `topDjAvatar → coverImage → dynamicCover → topMixCover → /images/genres/salone-mix.jpg`, with DJ attribution, mix count, and optional quick-play button.
- `profile/` — `HighlightsTab.tsx` (`HighlightsTab`) and `ReupsTab.tsx` (`ReupsTab`): DJ public profile tabs displaying up to 4 highlighted mixes or Pro DJ re-upped mixes; both dispatch `window.dispatchEvent(new CustomEvent('play-mix', ...))` to trigger `MixPlayer` with a track queue.

## Conventions & Notes

- **Floating chrome coordination**: `BottomNav` and `MobileTabBar` write `--bottom-nav-height`, and `MixPlayer` writes `--mini-player-height` on `document.documentElement`. Floating overlays (`LiveActivityPillBar`, modals) offset themselves with these variables and `env(safe-area-inset-bottom)`.
- **Playback triggers**: Most components call `usePlayerStore.play(...)` directly, while legacy/profile views (`profile/HighlightsTab`, `profile/ReupsTab`) dispatch the `play-mix` `CustomEvent` handled by `MixPlayer`.
- **Native Capacitor awareness**: `CookieConsent`, `PWAInstallPrompt`, `NotificationPermissionPrompt`, and `UpdatesSection` branch on Capacitor native detection so web-only prompts do not appear inside mobile WebViews.
- **Role/tier naming**: The internal tier string `'legend'` maps to the user-facing **Pro+** brand tier across `UpgradeModal`, `FeatureLock`, `DashboardLayout`, `UserDropdownMenu`, and `DjFeedRow`.
