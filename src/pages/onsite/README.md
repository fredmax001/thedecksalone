# Onsite Event Gate Portal (`app/src/pages/onsite/`)

Mobile-first gate staff portal for event check-in, QR scanning, walk-in ticket sales, and live attendance stats. Designed for temporary door staff who do not need a personal Deck Salone user account. See [../README.md](../README.md) for top-level routing.

## Key Files

| File | Route | Responsibility |
| --- | --- | --- |
| `OnsiteLogin.tsx` | `/events/:id/onsite` | Gate staff login screen. Accepts an event URL, ID, or code (pre-filled from `:id`), staff username (defaults to `staff`), and organizer-set password. Authenticates via `POST /events/:eventId/ticketing/onsite/auth` and stores the issued token in `sessionStorage`. |
| `OnsiteTools.tsx` | `/events/:id/onsite/tools` | Multi-view gate operations console gated by `sessionStorage.getItem('onsite_token_${eventId}')`. Includes `OnsiteHeader` / `SubViewHeader` (portal share & logout), `HomeView` (event card & live summary), and four sub-views: `ScannerTab` (`@zxing/browser` QR camera + manual entry), `GuestsTab` (defaults to All Guests with Checked In / Pending Arrival / Pending Approval filters & manual check-in/undo), `WalkinTab` (door sales with offline queueing), and `StatsTab` (live attendance & revenue breakdown). |

## Conventions & Notes

- **Standalone session auth (not `ProtectedRoute`)**: Both routes are mounted inside public `Layout` in `App.tsx` without `ProtectedRoute`. Authentication is scoped per-event in `sessionStorage` under `onsite_token_${eventId}` and `onsite_user_${eventId}`, completely separate from `useAuthStore`. Organizers set or rotate the staff username/password from `EventDashboard` (`/dashboard/events/:id`).
- **Offline walk-in queue with idempotency**: `WalkinTab` generates a `crypto.randomUUID()` `idempotencyKey` per sale. When a mutation fails with `isNetworkError(err)`, the sale is persisted via `src/lib/offline-queue.ts` (`enqueueWalkinSale`) and automatically drained in order (`drainWalkinQueue`) once connectivity returns; server-side HTTP rejections are surfaced as errors and never queued.
- **Ticketing hooks**: `OnsiteTools.tsx` relies on `useOnsiteDashboard`, `useOnsiteGuests`, `useOnsiteCheckin`, `useOnsiteWalkin`, and `useEventAvailability` from `src/hooks/useEventTicketing.ts`.
