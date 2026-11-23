# API Routes (`app/api/routes`)

Express route modules mounted in `../server.ts` (see [app/api/README.md](../README.md)). Each file exports an Express `Router` focused on a single API domain, using shared middleware from [middleware/](../middleware/README.md) and helpers from [utils/](../utils/README.md).

## Key Files

### Auth, Users & Onboarding

| File | Mount Path(s) | Responsibility |
| --- | --- | --- |
| `auth.ts` | `/api/auth`, `/api/v1/auth` | Registration (Turnstile + `authLimiter`), login (`loginRateLimiter` + lockout), phone/email OTP send & verify, password forgot/reset/change, Google OAuth web & mobile callbacks, `/me` profile & email-change confirmation, `/platform-config`. |
| `users.ts` | `/api/users` | Authenticated profile, avatar/cover upload, password update, settings, account soft-deletion, liked mixes, activity, following feed, user notifications, `/search`, `/subscription/*` status/request/cancel/restore, and public profile lookups (`/:username`, `/public/:username`). |
| `onboarding.ts` | `/api/onboarding` | Authenticated multi-role onboarding (`USER`, `DJ`, `EVENT_ORGANIZER`): `/status`, `/roles`, `/listener/preferences`, `/activate-listener`, `/dj/profile`, `/organiser/profile`, `/state`. |

### DJs, Mixes, Sets & Media

| File | Mount Path(s) | Responsibility |
| --- | --- | --- |
| `djs.ts` | `/api/djs` | Public DJ directory, cities/locations/genres, Hall of Fame, profile detail (`/:identifier`), DJ creation & `/switch-to-dj`, profile/cover updates, KYC verification requests, follow/unfollow, highlights CRUD/reorder, and Pro DJ sets listing. |
| `mixes.ts` | `/api/mixes` | Mix listing, search, trending, Hall of Fame, HearThis import, CRUD & reorder, likes, deduplicated play tracking (`POST /:id/play`), Pro re-ups, reposts, emoji reactions, point promotions, gated audio streaming (`GET /:id/audio`), downloads (`/:id/download`, `/:id/download-file`), recommendations, and nested comments/likes. |
| `sets.ts` | `/api/sets` | DJ-curated mix sets (`/mine`, `/dj/:djId`, `/:id`, CRUD, add/remove mixes, reorder); creating sets requires active trial or paid subscription. |
| `photos.ts` | `/api/photos` | DJ gallery photo uploads (`uploadLimiter`), `/me`, public `/dj/:identifier`, and deletion. |

### Discovery, Playlists, Rankings & Battles

| File | Mount Path(s) | Responsibility |
| --- | --- | --- |
| `discover.ts` | `/api/discover` | Discovery feeds for mixes (`/mixes`, `/mixes/trending`, `/mixes/for-you`, `/mixes/hall-of-fame`), DJs (`/djs`, `/djs/rising`, `/djs/recommended`, `/djs/battle-leaders`), users, personalized playlists, feed stats, DJ ranking score breakdown, and staff recalculation trigger. |
| `rankings.ts` | `/api/rankings` | Public DJ leaderboard (`/`), `/overview`, and per-DJ historical ranking trends (`/:djId/history`). |
| `battles.ts` | `/api/battles` | Weekly DJ battles list, `/current`, detail, battle creation, DJ entry, rate-limited community voting (`voteLimiter`), and atomic battle close. |
| `officialPlaylists.ts` | `/api/official-playlists` | Public listing and slug detail for staff-curated `OfficialPlaylist` collections. |
| `smartPlaylists.ts` | `/api/smart-playlists` | Public listing and slug detail for auto-curated `SmartPlaylist` collections (backed by `services/smartPlaylist.service.ts`). |
| `hallOfFame.ts` | `/api/hall-of-fame` | Sierra Leone DJ history `/timeline` and Hall of Fame `/legends` public reads + staff CRUD. |

### Bookings, Gigs, Events, Ticketing & Opportunities

| File | Mount Path(s) | Responsibility |
| --- | --- | --- |
| `bookings.ts` | `/api/bookings` | Client/guest DJ booking creation (`bookingLimiter`), DJ availability lookup, `/my-requests`, counter-offers, status transitions, and post-booking reviews. |
| `gigs.ts` | `/api/gigs` | Public client gig request posting (`bookingLimiter`), DJ/admin gig browsing, DJ matching (`/:id/matches`), applications, and application status updates. |
| `opportunities.ts` | `/api/opportunities` | Mounted with `authMiddleware`; paid-tier DJ opportunities listing/detail, DJ applications, and admin creation + accept/reject decisions. |
| `events.ts` | `/api/events` | Event listing/types/detail, CRUD with image upload, SoundIt Salone sync, open-slot DJ applications, RSVPs, and multi-photo event galleries. |
| `tickets.ts` | `/api/events/:id/tickets` | Legacy/simple event ticket purchase with payment screenshot upload, organizer approval/decline, `/my` tickets, and QR scan. |
| `eventTicketing.ts` | `/api/events/:id/ticketing` | Pro+/Organizer ticketing suite: ticket types CRUD, publish/unpublish, public availability, purchase (`purchaseLimiter`), organizer dashboard/analytics, guest list, single/bulk approve, reject/cancel, QR reissue, attendee edit, customer CSV export, and onsite staff auth (`/onsite/auth`) + check-in/scanning. |
| `userTickets.ts` | `/api/user/tickets` | Authenticated attendee wallet: list tickets, inspect detail/QR, and resend ticket email. |

### Payments, Campaigns & Support

| File | Mount Path(s) | Responsibility |
| --- | --- | --- |
| `payments.ts` | `/api/payments` | Pro/Legend manual subscription config, current status, proof submission (`purchaseLimiter`), cancel/restore, plus booking payment ledger CRUD and admin/finance process & refund endpoints. |
| `paypal.ts` | `/api/payments/paypal` | PayPal `/config` and create/capture order flows for subscriptions, event tickets, DJ bookings, and DJ support tips. |
| `campaigns.ts` | `/api/campaigns` | Public `/home-board` and `/stats` for active ad campaigns; authenticated DJ ad campaign targets and CRUD with creative upload. |
| `reviews.ts` | `/api/reviews` | Public DJ reviews listing and authenticated review creation/deletion. |
| `messages.ts` | `/api/messages` | Mounted with `authMiddleware`; direct messaging `/conversations`, thread view (`/:userId`), sending (`messageLimiter`), and read receipts. |
| `support.ts` | `/api/support` | Mounted with `authMiddleware`; user support ticket creation/listing/replies and `SUPPORT_ADMIN`/`ADMIN` queue, counts, and status management. |
| `reports.ts` | `/api/reports`, `/api/v1/reports` | Content/user violation reporting (`softAuthMiddleware` + `reportLimiter`). |

### Notifications, Telemetry & Dashboards

| File | Mount Path(s) | Responsibility |
| --- | --- | --- |
| `notifications.ts` | `/api/notifications` | Real-time SSE stream (`/stream` via `sseAuthMiddleware`), unread counts & badges, push token register/remove, inbox CRUD/read/dismiss/open, timezone sync, and notification preferences. |
| `tracking.ts` | `/api/tracking` | Interaction telemetry ingestion (`POST /event` with `optionalAuthMiddleware`) and authenticated `UserEngagementProfile` fetch (`GET /profile`). |
| `analytics.ts` | `/api/analytics` | Public/soft-auth page visit logging (`POST /visit`, `analyticsVisitLimiter`). |
| `dashboard.ts` | `/api/dashboard` | Mounted with `authMiddleware`; unified DJ/user dashboard overview and stats. |

### Admin, Moderation & Platform Utilities

| File | Mount Path(s) | Responsibility |
| --- | --- | --- |
| `admin.ts` | `/api/admin` | Mounted with `authMiddleware`; role-gated admin console covering stats, users/roles/status, DJ KYC verification, bookings, mixes/sets/Hall of Fame, rankings, analytics/geography, payments, Pro subscription approvals, promo/plan grants, ads/campaigns, popups, reports, event moderation/scan logs, system errors, emails/nudges/birthdays, subscription config, and platform config. |
| `adminNotifications.ts` | `/api/admin/notification-intelligence` | `ADMIN`/`SUPER_ADMIN` notification & onboarding analytics, `NotificationRule` management, and manual engagement sweep trigger. |
| `moderator.ts` | `/api/moderator` | `MODERATOR`/`ADMIN` console: stats, mix editing/flagging, `OfficialPlaylist` & `SmartPlaylist` CRUD/items/reorder, ranking overview/adjust/recalculate, DJ featuring, violation report actions, and moderator audit logs. |
| `popups.ts` | `/api/popups` | Public `GET /active` promotional/system popups. |
| `blog.ts` | `/api/blog` | Blog post listing/slug view, newsletter subscribe, and `ADMIN`/`MODERATOR` publishing. |
| `developers.ts` | `/api/developers` | Public developer API access application (`developerApplyLimiter`) and status check. |
| `appVersion.ts` | `/api/app` | Mobile app version metadata (`/version`) and APK/app download tracking (`/download`). |
| `og.ts` | `/og` | Server-rendered Open Graph HTML cards for DJs, mixes, users, and playlists. |
| `sitemap.ts` | `/sitemap.xml` | Dynamic XML sitemap generation for public pages, DJs, mixes, and events. |

## Conventions & Notes

- **Response Envelope**: Routes standardize JSON responses around `{ success: true, data, ... }` and `{ success: false, error }` via `ok()`/`fail()` in `utils/response.ts`.
- **Mount-Level vs. Route-Level Auth**: `/api/dashboard`, `/api/admin`, `/api/messages`, `/api/support`, and `/api/opportunities` enforce `authMiddleware` in `server.ts`. `admin.ts` further restricts routes by granular staff roles (`SUPER_ADMIN`, `ADMIN`, `FINANCE_ADMIN`, `VERIFICATION_ADMIN`, and `MODERATOR` on `/reports/*`).
- **Dual-Version Mounts**: `auth.ts` and `reports.ts` are mounted under both `/api/*` and `/api/v1/*` for backward/mobile compatibility.
- **Public-Safe Selects**: Unauthenticated DJ endpoints use `DJ_PROFILE_PUBLIC_SELECT` from `utils/prisma.ts` so KYC, payout, and private fields never leak; local mix audio URLs are always rewritten through `toPublicAudioUrl()` to `/api/mixes/:id/audio`.
