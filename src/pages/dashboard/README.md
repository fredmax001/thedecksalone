# DJ & Organizer Dashboard (`app/src/pages/dashboard/`)

Protected studio and operations pages for DJs and Event Organizers under `/dashboard/*`. Mounted inside `ProtectedRoute excludeRoles={['USER']} fallback="/user/dashboard"` and `DashboardLayout` (except `TicketScanner`, which renders full-screen without the sidebar). See [../README.md](../README.md) for top-level routing.

## Key Files

### Core Studio & Content

| File | Route | Responsibility |
| --- | --- | --- |
| `Overview.tsx` | `/dashboard` | Studio home: KPI cards (streams, mixes, bookings, followers, ranking), Recharts ranking history, onboarding checklist, recent bookings/reviews/events. |
| `Mixes.tsx` | `/dashboard/mixes` | Mix library management: audio upload, HearThis.at (third-party audio host) import (`useImportHearthis`), highlight pinning (`useMyHighlights`), sharing, visibility, and deletion. |
| `EditMix.tsx` | `/dashboard/mixes/:id/edit` *(also `/mix/:id/edit`, `/mixes/:id/edit`)* | Tabbed mix editor (`basic`, `detail`, `sets`, `premium`) covering metadata, genres, mood/energy, tags, privacy/download gates, and deletion. |
| `Sets.tsx` | `/dashboard/sets` | Create and manage curated DJ sets (grouped collections of mixes with cover art, ordering, and public/private visibility). |
| `Photos.tsx` | `/dashboard/photos` | DJ photo gallery manager (`GET /photos/me`, `POST /photos`, `DELETE /photos/:id`) capped at 10 photos. |
| `Profile.tsx` | `/dashboard/profile` | Comprehensive DJ/Organizer profile editor: bio, location (African countries / Sierra Leone cities & communities), genres, languages, equipment, social links, avatar, and verification documents. |

### Bookings, Messaging & Growth

| File | Route | Responsibility |
| --- | --- | --- |
| `Bookings.tsx` | `/dashboard/bookings` | Booking request inbox with list and `BookingCalendar` views, status filters, counter-offers, confirmation/cancellation, and client chat jump-links. |
| `Messages.tsx` | `/dashboard/messages` | Direct messaging inbox with conversation search, new-chat modal, read receipts, polling refresh, and `location.state.contactUserId` deep-linking. |
| `Analytics.tsx` | `/dashboard/analytics` | Performance dashboard with Recharts bar, line, area, and pie charts for streams, bookings, genres, and ranking; advanced metrics gated via `FeatureLock`. |
| `Earnings.tsx` | `/dashboard/earnings` | Payment history, monthly bar chart, payout method configuration (`PayoutMethodModal`), and payout requests (`RequestPayoutModal`). |
| `Followers.tsx` | `/dashboard/followers` | Paginated follower directory (`20/page`) with persisted grid/list layout toggle (`localStorage` key `dj-followers-layout`). |
| `Campaigns.tsx` | `/dashboard/campaigns` | Self-serve promotional ad campaigns (`useCampaigns`) targeting a DJ profile, mix, or battle with creative uploads and campaign analytics. |
| `Subscription.tsx` | `/dashboard/subscription` | Subscription management (`free` < `pro` < `legend` [branded **Pro+**], 3-day grace window): monthly/annual plans, automated PayPal checkout, or Sierra Leone mobile-money receipt upload for manual admin approval. |
| `Settings.tsx` | `/dashboard/settings` | Tabbed account settings: email/SMS/push notification toggles (`NotificationPreferencesPanel`), password/email security, app updates (`UpdatesSection`), and account deactivation/deletion. |

### Events, Ticketing & Door Scanning

| File | Route | Responsibility |
| --- | --- | --- |
| `DjEvents.tsx` | `/dashboard/events` | Event creation and management (`TicketTypeBuilder`, publish/draft toggle, ticketing & mobile-money settings, capacity, age/refund policies). |
| `EventDashboard.tsx` | `/dashboard/events/:id` | Per-event operations hub: KPI cards, publish toggle, ticket controls, and onsite staff credential rotation (username + write-only password). |
| `EventTicketManagement.tsx` | `/dashboard/events/:id/tickets` | Ticket order & customer tables with status filters, payment-proof inspection, individual/bulk approve/reject/check-in actions, QR display, and manual guest addition. |
| `EventAnalytics.tsx` | `/dashboard/events/:id/analytics` | Per-event revenue, check-in attendance, conversion rate, and Recharts daily/hourly sales visualizations. |
| `ScannerLanding.tsx` | `/dashboard/scanner` *(Pro+)* | Redirector that looks up the DJ's ticketed events and navigates straight to `/dashboard/events/:eventId/scan` (or shows an empty-state CTA). |
| `TicketScanner.tsx` | `/dashboard/events/:eventId/scan` *(Pro+, standalone)* | Full-screen `@zxing/browser` camera QR scanner with camera switching, manual ticket code entry, event switcher, and `POST /events/:eventId/ticketing/scan` validation states. |

## Conventions & Notes

- **Dual-persona layout**: `DashboardLayout` switches sidebar items based on `useUserRole().isOrganizer` (`EVENT_ORGANIZER` sees Events/Scanner/Post DJ Gigs first; `DJ` sees Mixes/Sets/Photos/Followers).
- **Non-local child route**: `/dashboard/opportunities` is mounted inside `DashboardLayout` in `App.tsx`, but its component lives at [../Opportunities.tsx](../Opportunities.tsx).
- **Tier & role gates**:
  - `ProtectedRoute excludeRoles={['USER']}` evaluates primary `user.role` (so `DJ` and `EVENT_ORGANIZER` accounts are admitted even if `User.roles[]` includes additional roles).
  - `RequireProRoute` in `App.tsx` gates `/dashboard/scanner` and `/dashboard/events/:eventId/scan` to `pro`/`legend` (UI brand **Pro+**) DJs, `EVENT_ORGANIZER`, and admin/moderator roles (unauthenticated visitors redirect to `/login`; other signed-in users redirect to `/dashboard/events`).
  - Individual pages (`Overview`, `Bookings`, `Analytics`, `Earnings`, `Profile`, `ScannerLanding`) also call `useRequireDj()` (`src/hooks/useRequireDj.ts`) and `FeatureLock` / `useFeatureAccess()` for tier-specific capabilities.
- **Public edit alias caveat**: `EditMix.tsx` is mounted under both `/dashboard/mixes/:id/edit` (protected) and `/mix/:id/edit` + `/mixes/:id/edit` (public `Layout`, for direct deep links), relying on backend ownership checks for authorization.
- **Write-only onsite password**: Per `EventDashboard.tsx`, the API never returns the onsite gate password (only `onsitePasswordSet`), so organizers enter a fresh password whenever rotating staff credentials.
