# Operational Scripts (`app/api/scripts`)

One-off operational, data-backfill, security-remediation, and destructive cleanup scripts run manually against PostgreSQL via `node` or `npx ts-node` from `app/api/`. Back to [app/api/README.md](../README.md).

## Key Files

### Backfills & Migrations

| File | Purpose |
| --- | --- |
| `backfill-dj-profiles.ts` | Creates public `DjProfile` records for any `User` with `role = 'DJ'` missing a profile. |
| `backfill-mix-covers.ts` | Populates empty/null `Mix.coverImage` fields using the owning DJ's avatar (or user avatar). |
| `backfill-mix-slugs.ts` | Exports and runs `backfillMixSlugs()` to generate unique slugs for mixes with null/empty `slug` (preferring HearThis URL slugs when imported). |
| `backfill-usernames.js` | Generates unique, non-reserved usernames for users missing a username, derived from email prefixes. |
| `migrateVerified.ts` | Updates legacy `DjProfile` rows with `verified: true` and `verificationStatus: 'unverified'` to `verificationStatus: 'approved'` and `isPublic: true`. |
| `smart-playlist-seed.ts` | One-off Smart Playlists launch helper: infers default `mood`/`energy` tags on untagged mixes by genre regex and seeds starter `SmartPlaylist` records. |

### Admin, Security Remediation & Verification

| File | Purpose |
| --- | --- |
| `create-admin.js` | Creates an `ADMIN` user (or promotes an existing user by email). Accepts CLI args `[email] [password]`. |
| `rotate-onsite-passwords.js` | `SEC-1` remediation script: rotates all non-null `Event.onsitePassword` values to new random 10-character passwords hashed with bcrypt (cost 12) and prints plaintext temporary passwords for owner notification. |
| `test-smart-generator.ts` | Scratch verification script that creates temporary test DJ/mix rows and exercises `generateSmartPlaylistItems()` from `services/smartPlaylist.service.ts`. |

### Destructive Cleanup Scripts (Use With Caution)

| File | Purpose |
| --- | --- |
| `delete-user-by-email.ts` | Hard-deletes a single user (passed via `argv[2]`) and their related records across tables. |
| `delete_users.ts` | Hard-deletes all users except those listed in `KEEP_EMAILS` (`ADMIN_EMAIL`/`SEED_ADMIN_EMAIL` and `KEEP_EMAIL`). |
| `wipe-demo-data.ts` | Transactional wipe of demo tables while preserving the admin user (`ADMIN_EMAIL`, default `admin@soundit.sl`). |
| `wipe_demo_data.ts` | Sequential (non-transactional) variant of demo data wipe preserving the admin user (`ADMIN_EMAIL`/`SEED_ADMIN_EMAIL`). |

## Conventions & Notes

- **Destructive Scripts Bypass Ledger Retention**: Several legacy cleanup scripts (`delete-user-by-email.ts`, `delete_users.ts`, `wipe-demo-data.ts`, `wipe_demo_data.ts`) call `prisma.payment.deleteMany()`. Do **not** run them against production databases where financial ledger preservation (`DB-3`) is required.
- **Environment Loading**: Scripts load `DATABASE_URL` from `app/api/.env` or `app/.env` (when running inside Docker, invoke via `docker exec <container> node ...` with container env vars already present).
- **Duplicate Naming**: Both `wipe-demo-data.ts` (kebab-case, transactional) and `wipe_demo_data.ts` (snake_case, sequential) exist from earlier iterations; review the target tables before running either.
