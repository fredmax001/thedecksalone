# Home Components (`app/src/components/home/`)

Homepage discovery, spotlight, and curation UI blocks rendered on the Deck Salone landing view. See [components/](../README.md) for the broader component index.

## Key Files

| File | Exports | Responsibility |
| --- | --- | --- |
| `types.ts` | `HomeDJ`, `HomeMix`, `HomeEvent`, `HomeAd`, `HomePlaylist` | Shared TypeScript interfaces for homepage entities (extended by `feed/types.ts`). |
| `HeroBanner.tsx` | `HeroBanner` (default) | Auto-rotating (7s) hero carousel (up to 6 slides) combining `paidAds`, top mix, top DJ, and top event, with a Deck Salone fallback slide. Mix CTAs trigger `usePlayerStore.play`; ad CTAs expand an inline campaign details drawer without navigating away. |
| `CategoryPills.tsx` | `CategoryPills` (default) | Horizontally scrollable genre pill strip navigating to `/mixes?genre=<name>`. |
| `DjCard.tsx` | `DjCard` (default) | DJ card with `variant?: 'portrait' \| 'circle'`. Portrait variant displays `VerifiedBadge` and a quick-play button for `dj.mixes[0]`; circle variant renders a compact avatar tile. |
| `DjCarousel.tsx` | `DjCarousel` (default) | Embla-backed horizontal `DjCard` carousel with desktop prev/next buttons and empty state. |
| `MixCard.tsx` | `MixCard` (default) | Square mix artwork card linking via `getMixUrl` with DJ attribution link, compact play count, and quick-play trigger via `usePlayerStore.play`. |
| `MixCarousel.tsx` | `MixCarousel` (default) | Embla-backed horizontal `MixCard` carousel with responsive column bases (`basis-1/2` to `xl:basis-1/6`). |
| `PlaylistCard.tsx` | `PlaylistCard` (default) | Wraps `PlaylistCoverArt` (`aspect="video"`) linking to `/playlist/:slugOrId`. Quick-play queues preloaded tracks or lazily fetches `/smart-playlists/:id` or `/official-playlists/:id`. |
| `PlaylistGrid.tsx` | `PlaylistGrid` (default) | Responsive 1–4 column grid of `PlaylistCard` items with `SectionHeader` and empty state. |
| `RankingList.tsx` | `RankingList` (default) | Top-5 DJ leaderboard showing rank color coding (gold/silver/bronze), `VerifiedBadge`, stream counts, ranking score, and trend delta, linking to `/rankings`. |
| `AdStrip.tsx` | `AdStrip` (default) | Sponsored campaign carousel (auto-advances every 6s when collapsed) with inline expandable campaign details and optional external sponsor link. |
| `SectionHeader.tsx` | `SectionHeader` (default) | Reusable section title/subtitle row with optional right-aligned action `<Link>` (also reused by `feed/EventCarousel`). |

## Conventions & Notes

- **Media & fallbacks**: Artwork passes through `getMediaUrl` (from `@/lib/api`) and `OptimizedImage` (with `/mix-placeholder.jpg`, `/default-avatar.jpg`, or `/og-banner.png` fallbacks).
- **Inline ad expansion**: Both `HeroBanner` and `AdStrip` pause auto-rotation when a sponsored card is expanded so users can read campaign details in place before following an external `rel="noopener noreferrer"` link.
- **Emoji sanitization**: `DjCard` uses `stripEmojis` (`@/lib/utils`) and `HeroBanner` strips Unicode emoji ranges locally via `cleanText` to keep display typography consistent.
