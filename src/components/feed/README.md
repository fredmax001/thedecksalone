# Feed Components (`app/src/components/feed/`)

Activity feed cards, rows, carousels, and hero spotlights for mixes, DJs, events, and playlists. See [components/](../README.md) for top-level shared components and [home/](../home/README.md) for the base entity types.

## Key Files

| File | Exports | Responsibility |
| --- | --- | --- |
| `types.ts` | `FeedDJ`, `FeedMix`, `FeedEvent`, `FeedPlaylist` | Extends `HomeDJ`, `HomeMix`, `HomeEvent`, and `HomePlaylist` with feed counts (`_count`, `likes`, `downloads`), tier/exclusivity flags (`djTier`, `isExclusive`, `promotedUntil`), and timestamps. |
| `FeedHero.tsx` | `FeedHero` (default) | Polymorphic spotlight banner accepting `mix`, `event`, or `dj` (checked in that precedence order), with a default "Welcome to the Feed" banner when none are supplied. Integrates with `usePlayerStore` for mix playback. |
| `MixFeedRow.tsx` | `MixFeedRow` (default) | Primary mix list item supporting `variant?: 'waveform' \| 'compact'`. Waveform variant includes interactive `WaveformPlayer` seeking, timestamped emoji reactions (`POST /mixes/:id/reactions`), gated downloads (`POST /mixes/:id/download` → `MixDownloadModal`), inline `MixComments` drawer, `AddToPlaylistModal`, play queue addition, `RepostButton`, `ReupButton` (for DJs/admins), `ShareButton`, and owner/admin edit & promote actions. |
| `DjFeedRow.tsx` | `DjFeedRow` (default) | Numbered horizontal DJ directory row with avatar, verified check, `PRO+` badge (`subscriptionTier === 'legend'`), genre/location metadata, mix/follower counts, and profile link. |
| `EventCard.tsx` | `EventCard` (default) | Vertical event card with `OptimizedImage` flyer, formatted date pill, venue/city, and "Get Tickets" link to `/events/:id`. |
| `EventCarousel.tsx` | `EventCarousel` (default) | Embla horizontal carousel of `EventCard` items using `home/SectionHeader` and desktop scroll controls. |
| `EventFeedRow.tsx` | `EventFeedRow` (default) | Compact horizontal event row with flyer thumbnail, location, date badge, and link to `/events/:id`. |
| `PlaylistFeedRow.tsx` | `PlaylistFeedRow` (default) | Square playlist card wrapping `playlists/PlaylistCoverArt` with quick-play support (uses preloaded `items` or fetches `/smart-playlists/:slug` / `/official-playlists/:slug`). |

## Conventions & Notes

- **Player synchronization**: `MixFeedRow` subscribes selectively to `usePlayerStore` (`currentTrack?.id === mix.id`) to minimize re-renders across long feeds, and routes VIP/exclusive mixes (`mix.isExclusive && !isOwner`) to `onOpenDjSupport` instead of playing.
- **Download gating**: `MixFeedRow` inspects HTTP `401` / `403` error payloads (`requiresRepost`, `requiresFollow`, `requiresSubscription`) to open `MixDownloadModal` in the matching mode, then retries the download on `onActionComplete`.
- **Role-conditional actions**: Owner/admin controls (`Edit2`, `Reach more listeners!`) replace the listener `Comment` button in `MixFeedRow`, while `ReupButton` is shown in the `+ Add` menu only when `isDjUser` is true.
