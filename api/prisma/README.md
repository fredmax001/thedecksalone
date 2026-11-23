# Prisma Database Layer (`app/api/prisma`)

PostgreSQL data model (`schema.prisma`), versioned SQL migrations, demo database seeding, and Prisma maintenance helpers for Deck Salone. Back to [app/api/README.md](../README.md).

## Key Files

| File | Responsibility |
| --- | --- |
| `schema.prisma` | PostgreSQL Prisma schema (`binaryTargets: ["native", "debian-openssl-3.0.x"]`) defining 46 models and 9 enums across all platform domains. |
| `seed.ts` | Destructive demo seeder (run via `npm run db:seed` from `app/`). Clears existing core tables and creates 12 regular users, 11 verified Sierra Leonean DJ profiles with streaming links, 32 mixes, events, reviews, 1 active DJ battle (scored by plays/votes), 1 sample booking with deposit/pending payments, and 1 `ADMIN` account (`admin@soundit.sl` — legacy domain from Deck Salone's former **SoundIt** name). Requires `SEED_ADMIN_PASSWORD` env var (`SEED_DEMO_PASSWORD` optional; random hex fallback). |
| `re-resolve-hearthis.ts` | Queries `Mix` rows imported from **HearThis.at** (third-party audio host), calls `https://api-v2.hearthis.at/:artist/:slug`, follows redirects up to 5 hops, and refreshes `audioUrl`, `duration`, `coverImage`, and `description`. |
| `reset-dj-password.ts` | Legacy one-off password reset helper for a hardcoded user ID (`cmr8qx8zn0000o3b3vr1271js`) using `RESET_PASSWORD` env var (bcrypt cost 12). |
| `wipe-all.ts` | Destructive cleanup script that deletes all platform records in FK order while preserving and resetting the profile of the admin user (`ADMIN_EMAIL` / `SEED_ADMIN_EMAIL`, default `admin@soundit.sl`). |

## Schema Model Domains (`schema.prisma`)

- **Accounts & Identity**: `User` (primary `role` plus multi-role `roles[]` across `USER`, `DJ`, `EVENT_ORGANIZER`, `MODERATOR`, and `*ADMIN` roles; `tokenVersion`, OTP/reset fields, onboarding state, timezone & notification window prefs, soft-delete `deletedAt`), `Role`, `UserStatus`, `Gender`, `AuditLog`.
- **DJs, Social & Catalog**: `DjProfile` (KYC verification, subscription tier `free`/`pro`/`legend`, scores, badges, promos, payout method), `Follow`, `StreamingPlatform`, `DjPhoto`, `DjHighlight`, `DjSet`, `DjSetItem`, `Mix`, `MixComment`, `MixCommentLike`, `MixLike`, `MixPlay`, `MixReup` (DJ-only Pro catalog boost), `MixRepost` (listener/social reshare), `MixReaction`.
- **Discovery, Playlists, Rankings & Battles**: `RankingHistory` (unique `[djId, week]`), `Battle`, `BattleEntry`, `BattleVote` (competitive DJ mix contests scored by plays/votes), `OfficialPlaylist`, `OfficialPlaylistItem`, `SmartPlaylist`, `HallOfFameLegend` (inducted Sierra Leone DJ pioneers).
- **Bookings, Gigs & Opportunities**: `Booking` (direct client-to-DJ hire, `BookingStatus`), `Gig` & `GigApplication` (open client event requests DJs apply to), `Opportunity` & `OppApplications` (curated paid-tier DJ gig board), `Message`, `Review`.
- **Events & Ticketing**: `Event` (publish/ticketing/onsite gate staff credentials), `EventTicketType`, `EventTicket` (encrypted `qrPayload`, `ticketNumber`, `idempotencyKey`), `EventScanLog`, `EventRSVP`, `EventPhoto`, `EventApplication`.
- **Payments, Subscriptions & Promotions**: `Payment` (`PaymentType`, `PaymentStatus`), `PayPalPayment`, `ProSubscriptionRequest` (manual Sierra Leone mobile-money receipt approval), `PromoGrant` (admin-comped subscription grant), `DjSupport` (fan tips via PayPal or receipt upload), `PayoutRequest`, `AdCampaign`.
- **Notifications, Engagement & Operations**: `Notification` (`NotificationType`, `NotificationPriority`), `PushToken`, `UserEngagementProfile`, `AppInteractionEvent`, `NotificationRule`, `NotificationLog`, `SupportTicket`, `SupportTicketReply`, `ViolationReport` (`ReportStatus`), `ModeratorAuditLog`, `SystemConfig`, `SystemErrorLog`, `SiteVisit`, `AppDownload`, `Popup`.

## Subdirectories

- `migrations/` — 25 timestamped Prisma SQL migration folders (plus `migration_lock.toml`) applied in production via `prisma migrate deploy`.

## Conventions & Notes

- **Financial Ledger Retention**: `Payment` (`booking`, `client`), `PayPalPayment` (`user`), and `PayoutRequest` (`dj`) use `onDelete: SetNull` so account purges and booking deletions detach rather than erase financial records.
- **Explicit Cascade Caveat**: `SupportTicket.user` does not cascade delete; any user hard-deletion must remove `SupportTicketReply` and `SupportTicket` rows before deleting `User`.
- **Indexing Strategy**: Array fields (`favoriteGenres`, `genres`, `tags`, `secondaryGenres`, `awards`, `equipment`, `badges`, `eventTypes`, `languages`) use PostgreSQL `Gin` indexes; hot query paths use composite indexes across `isPublic`, `status`, `createdAt`, `rankingScore`, and `discoveryScore`.
- **Migrations Over `db push`**: Production deploys apply migrations from `migrations/` rather than `prisma db push --accept-data-loss` (enforced by `__tests__/infra-drift.test.ts`).
