# Moderator Console (`app/src/pages/moderator/`)

Standalone content curation and community moderation portal mounted at `/moderator/*`. Protected in `App.tsx` by `<ProtectedRoute allowedRoles={['ADMIN', 'MODERATOR']} fallback="/login" />`. See [../README.md](../README.md) for top-level routing.

## Key Files

| File | Route | Exports | Responsibility |
| --- | --- | --- | --- |
| `ModeratorLayout.tsx` | `/moderator` *(layout)* | `ModeratorLayout` (named & default) | Sidebar + sticky header shell with 6 navigation items, logout, and secondary role check (`MODERATOR` or `ADMIN`). |
| `ModeratorOverview.tsx` | `/moderator` *(index)* | `ModeratorOverview` (named & default) | Fetches `GET /moderator/stats` and displays platform counts (DJs, mixes, awaiting review, reported items, official playlists), top-ranked DJs, and recent uploads. |
| `ModeratorMixes.tsx` | `/moderator/mixes` | `ModeratorMixes` (named & default) | Paginated mix moderation (`GET /moderator/mixes`) with search, genre/flagged/hidden filters, metadata/curation editor, and flag/report action dialogs. |
| `ModeratorPlaylists.tsx` | `/moderator/playlists` | `ModeratorPlaylists` (named & default), `SmartPlaylistsPanel` (named) | Two-tab playlist manager: curated official playlists (`/moderator/playlists` + bulk mix picker & cover upload) and rule-based smart playlists (`/moderator/smart-playlists` with genre/mood/energy rules and live preview). |
| `ModeratorRankings.tsx` | `/moderator/rankings` | `ModeratorRankings` (named & default) | DJ leaderboard management: view rankings (`GET /moderator/rankings`), trigger full recalculation (`POST /moderator/rankings/recalculate`), manually adjust position/score with required audit reason (`POST /moderator/rankings/adjust`), and toggle `MODERATOR_FEATURE` / `RISING_DJ` flags. |
| `ModeratorReports.tsx` | `/moderator/reports` | `ModeratorReports` (named & default) | Community report queue (`GET /moderator/reports`) filtered by status (`PENDING`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`) with resolution action dialog (`POST /moderator/reports/:id/action`). |
| `ModeratorAuditLogs.tsx` | `/moderator/logs` | `ModeratorAuditLogs` (named & default) | Paginated (`25/page`) immutable audit log (`GET /moderator/audit-logs`) showing moderator actor, action, target, reason, and `previousData`/`newData` JSON diffs. |

## Conventions & Notes

- **Reused inside `AdminDashboard`**: `app/src/pages/AdminDashboard.tsx` directly imports `ModeratorPlaylists` from `./moderator/ModeratorPlaylists` so admins can manage official and smart playlists without leaving `/admin`.
- **Dual role guard quirk**: Both `App.tsx` (`allowedRoles={['ADMIN', 'MODERATOR']}`) and `ModeratorLayout.tsx` (`user?.role === 'MODERATOR' || user?.role === 'ADMIN'`) explicitly check for `ADMIN` and `MODERATOR` only — `SUPER_ADMIN` is not listed in either check.
- **Export style**: Every file exports both a named component and a default export (default exports are consumed by `React.lazy` in `App.tsx`).
- **Direct API usage**: Unlike `dashboard/` and `user/` pages that wrap endpoints in React Query hooks, moderator pages call `api` (`src/lib/api.ts`) directly inside `useEffect` handlers.
