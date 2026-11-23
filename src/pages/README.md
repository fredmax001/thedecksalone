# Frontend Pages (`app/src/pages/`)

Route-level React views lazy-loaded in `app/src/App.tsx` via `React.lazy` and `Suspense`. Pages are organized into public site views (`Layout`), standalone auth/onboarding and admin consoles, and four role/feature sub-portals. See [app/src/README.md](../README.md) for the broader `src/` architecture.

## Key Files

### Public Discovery, Streaming & Social (`Layout`)

| File | Route(s) | Responsibility |
| --- | --- | --- |
| `Home.tsx` | `/` | Main landing feed: hero banner, category pills, trending mixes, featured DJs, rankings, official playlists, events, and ad strip. Redirects `ADMIN`, `SUPER_ADMIN`, `FINANCE_ADMIN`, and `VERIFICATION_ADMIN` to `/admin` (does not redirect `SUPPORT_ADMIN` or `MODERATOR`). |
| `Discover.tsx` | `/discover`, `/explore` | Searchable DJ & mix discovery directory with location-aware recommendations and `SearchModal`. |
| `Feed.tsx` | `/feed` | Social activity & discovery feed with primary tabs (`following`, `for-you`, `trending`) and content filters (`mixes`, `djs`, `events`, `playlists`). |
| `MixHub.tsx` | `/mixes`, `/sets` | Filterable mix catalog with grid/list views, genre ranks, downloads, embed/share/support modals, and player queueing. |
| `MixDetail.tsx` | `/mix/:id`, `/mixes/:id`, `/mix/:djIdentifier/:slug`, `/mixes/:djIdentifier/:slug`, `/:djIdentifier/:slug` | Single mix page with playback, likes, reposts, comments, recommendations, gated download flow, and report modal. |
| `OfficialPlaylists.tsx` | `/playlists` | Browse curated official playlists and rule-based smart playlists filtered by genre, mood, and energy. |
| `OfficialPlaylistDetail.tsx` | `/playlist/:slug`, `/playlists/:slug` | Tracklist detail view; fetches `/official-playlists/:slug` with fallback to smart playlists and direct queue playback. |
| `Rankings.tsx` | `/rankings` | Public DJ leaderboard with top-3 podium, trend arrows, and quick-play mix previews. |
| `HallOfFame.tsx` | `/hall-of-fame` | Celebrates inducted Hall of Fame DJs, legends, and mixes; includes inline admin management controls for privileged roles. |
| `DjProfile.tsx` | `/dj/:identifier` | Public DJ profile (lookup by username or ID) with mixes, sets, highlights, reups, photos, reviews, ranking chart, support modal, and booking calendar. |
| `UserPublicProfile.tsx` | `/user/:username` | Public listener profile page with bio, avatar, share button, and link to DJ profile if applicable. |
| `Library.tsx` | `/library`, `/my-library` | Personal library tabs: custom playlists (`usePlaylistStore`), liked mixes, followed DJs, and recent listening/social activity. |

### Events, Bookings, Pricing & Account (`Layout` unless noted)

| File | Route(s) | Responsibility |
| --- | --- | --- |
| `Events.tsx` | `/events` | Public event calendar with city/type filters, list/grid views, and soonest/alphabetical sorting. |
| `EventDetail.tsx` | `/events/:id` | Event landing page with countdown, venue info, ticket availability, PayPal & mobile-money checkout, and organizer shortcuts. |
| `Booking.tsx` | `/booking` | Multi-step DJ booking marketplace for browsing available DJs by city/genre/event type and submitting booking requests. |
| `RequestDj.tsx` | `/request-dj` | Open gig request form (`useCreateGig`) for clients to post event details, music styles, equipment needs, and budget. |
| `Pricing.tsx` | `/pricing`, `/subscription` | Fan & DJ subscription tiers (`free`, `pro`, `legend`) with monthly/annual pricing, PayPal checkout, and Sierra Leone mobile-money proof flow. |
| `AccountPage.tsx` | `/account` | Mobile-style account hub showing role-tailored navigation shortcuts for DJs vs. listeners and logout; redirects guests to `/login`. |
| `Opportunities.tsx` | `/dashboard/opportunities` *(mounted in `DashboardLayout`)* | Named export `Opportunities` — DJ gig board with `all` / `applied` / `featured` filters and tier-gated applications. |

### Auth & Onboarding (Standalone)

| File | Route(s) | Responsibility |
| --- | --- | --- |
| `Login.tsx` | `/login` | Email/username + password login, Google OAuth trigger, and `?mode=add_account` multi-account sign-in (`AuthLayout`). |
| `Register.tsx` | `/register` | Multi-role registration (`USER`, `DJ`, `EVENT_ORGANIZER`), password strength meter, Cloudflare Turnstile widget, and UTM attribution (`AuthLayout`). |
| `AuthCallback.tsx` | `/auth/callback` | Handles Google OAuth redirect tokens/errors (query, hash, or state), fetches `/auth/me`, and routes via `redirectAfterAuth`. |
| `ForgotPassword.tsx` | `/forgot-password` | Sends password reset email via `POST /auth/forgot-password` (`AuthLayout`). |
| `ResetPassword.tsx` | `/reset-password` | Validates `?token=` reset link and updates password with Zod `passwordSchema` (`AuthLayout`). |
| `Onboarding.tsx` | `/onboarding` | 4-screen mobile/native first-launch welcome & role selector (`ds_onboarding_step`, `ds_onboarded`); auto-triggered on `/` for first-time mobile/native guests. |
| `RoleOnboardingWizard.tsx` | `/onboarding/setup` *(`ProtectedRoute`)* | Post-signup guided setup wizard for Listeners, DJs, and Event Organizers (`useOnboarding`). |

### Role-Based Admin Consoles (Standalone, `ProtectedRoute`)

| File | Route | Allowed Roles | Responsibility |
| --- | --- | --- | --- |
| `AdminDashboard.tsx` | `/admin` | `ADMIN`, `SUPER_ADMIN` | Full platform operations console (stats, analytics, users, DJs, mixes, bookings, events/ticketing, payments, ads, staff, security logs, system settings; embeds `ModeratorPlaylists`). |
| `FinanceDashboard.tsx` | `/finance` | `FINANCE_ADMIN` | Financial overview, Pro/Legend subscription approval queue, payment transactions, plan grants, and financial reports. |
| `SupportDashboard.tsx` | `/support` | `SUPPORT_ADMIN` | Customer support ticket queue filtered by status (`open`, `pending`, `resolved`, `closed`) with threaded replies. |
| `VerificationDashboard.tsx` | `/verification` | `VERIFICATION_ADMIN` | DJ identity/profile verification review queue, verified roster, rejection log, and policy guidelines. |

### Informational, Developer & Unrouted Pages

| File | Route(s) | Responsibility |
| --- | --- | --- |
| `About.tsx` | `/about` | Platform overview and desktop/mobile feature showcase. |
| `Blog.tsx` | `/blog` | Blog post listing (`GET /blog`) and newsletter subscription (`POST /blog/subscribe`). |
| `Developers.tsx` | `/developers`, `/api` | Public REST API documentation with multi-language code snippets (`curl`, JS, Python, PHP). |
| `Help.tsx` | `/help` | Searchable FAQ accordion and support ticket submission form (`useCreateSupportTicket`). |
| `InstallApp.tsx` | `/install` | Platform-aware PWA installation guide (`beforeinstallprompt`, iOS/Android steps) and notification permission prompt. |
| `Privacy.tsx` | `/privacy` | Deck Salone Privacy Policy. |
| `Terms.tsx` | `/terms` | Deck Salone Terms of Service. |
| `Battles.tsx` | *(not routed)* | Weekly DJ Battles & voting UI (`useBattles`); currently unreferenced by `App.tsx`. |

## Subdirectories

- [dashboard/](./dashboard/README.md) — DJ & Event Organizer studio portal (`/dashboard/*`), wrapped in `DashboardLayout` (except full-screen `TicketScanner`).
- [user/](./user/README.md) — Listener/client account portal (`/user/*`), wrapped in `UserDashboardLayout`.
- [moderator/](./moderator/README.md) — Content moderation & curation console (`/moderator/*`), with its own `ModeratorLayout`.
- [onsite/](./onsite/README.md) — Password-authenticated gate check-in & walk-in ticket portal (`/events/:id/onsite*`).

## Conventions & Notes

- **Catch-all & Hearthis-style slug routing**: `/:djIdentifier/:slug` is placed last inside `Layout` so static public paths match first; any unmatched path hits `<Route path="*" element={<Navigate to="/" replace />} />`.
- **Cross-directory mounts**: `Opportunities.tsx` lives at the root of `pages/` (named export only) but renders inside `DashboardLayout` at `/dashboard/opportunities`. Conversely, `dashboard/EditMix.tsx` is also mounted inside public `Layout` at `/mix/:id/edit` and `/mixes/:id/edit`, and `user/Notifications.tsx` is also mounted standalone at `/notifications`.
- **Route guards**: `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) enforces authentication and `allowedRoles` / `excludeRoles`. Role mismatches on `allowedRoles` redirect to `/`, while unauthenticated or `excludeRoles` hits redirect to `fallback`.
- **Loading & SEO**: Most pages pair `SEOHead` (or `usePageMeta`) with `useDelayedLoading` and skeleton components from `src/components/ui/page-skeletons` to avoid spinner flicker.
