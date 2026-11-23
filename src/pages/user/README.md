# User Dashboard (`app/src/pages/user/`)

Authenticated listener and client account pages under `/user/*`. Wrapped in `ProtectedRoute fallback="/login"` and `UserDashboardLayout` (collapsible desktop sidebar + mobile `BottomNav`). See [../README.md](../README.md) for top-level routing.

## Key Files

| File | Route(s) | Responsibility |
| --- | --- | --- |
| `UserDashboard.tsx` | `/user/dashboard` | Personalized listener home: quick links, unread counts (messages & notifications), onboarding/profile completion cards, recommended DJs, trending mixes, For You playlists, and upcoming events. |
| `MyBookings.tsx` | `/user/bookings` | Client booking history with status filter/search, expandable details, DJ counter-offer responses (`useRespondToCounterOffer`), PayPal payment checkout (`PayPalButton`), and post-event DJ review dialog. |
| `MyTickets.tsx` | `/user/tickets` | Purchased event ticket wallet using `DigitalTicket` plus standalone HTML print/PDF export with inline `QRCodeSVG` (`DS-TICKET:<id>:<ticketNumber>`). |
| `Messages.tsx` | `/user/messages` | Direct messaging inbox for chatting with DJs, starting new conversations, and handling `location.state.contactUserId` deep links. |
| `Following.tsx` | `/user/following` | Followed DJs list with unfollow controls (`useFollowDj`), search, and persisted grid/list toggle (`localStorage` key `following-layout`). |
| `Activity.tsx` | `/user/activity` | Chronological activity feed (`useUserActivity`) filterable by action type (`LIKE_MIX`, `REPOST_MIX`, `RATE_DJ`, `BATTLE_VOTE`, `SAVE_EVENT`, `FOLLOW_DJ`, `BOOKING_CREATED`). |
| `Notifications.tsx` | `/user/notifications`, `/notifications` *(standalone)* | Categorized notification center (`BOOKING`, `MIX`, `SOCIAL`, `EVENT`, `MESSAGE`, `ACCOUNT`, `SYSTEM`) grouped by time (`Today`, `Yesterday`, `Earlier this week`, `Older`) with mark-read, delete, and clear-all actions. |
| `UserProfile.tsx` | `/user/profile` | Listener profile viewer and tabbed editor (`profile`, `details`, `social`, `preferences`) for avatar/cover upload, bio, location, favorite genres, and social handles. |
| `UserSettings.tsx` | `/user/settings` | Account preferences: granular email/SMS/push notifications (`NotificationPreferencesPanel`), password/email security, app updates (`UpdatesSection`), subscription/role actions, and account deletion. |

## Conventions & Notes

- **Dual mount for notifications**: `Notifications.tsx` renders both inside `UserDashboardLayout` at `/user/notifications` and as a standalone protected route at `/notifications` (used by notification bells and mobile/native deep links).
- **Accessible to any signed-in role**: Unlike `/dashboard/*` (which excludes `USER`), `/user/*` only requires authentication (`<ProtectedRoute fallback="/login" />`), so DJs and admins can also inspect their personal tickets, bookings, or notifications here.
- **Data layer**: Pages primarily consume React Query hooks from `src/hooks/useUserDashboard.ts`, `src/hooks/useEventTicketing.ts`, `src/hooks/useNotifications.ts`, and `src/hooks/useRecommendations.ts`.
- **Client-side printable tickets**: `MyTickets.tsx` uses `react-dom/server` (`renderToStaticMarkup`) to embed a static `QRCodeSVG` into a Blob HTML tab with HTML-escaped fields and auto-print trigger.
