# Frontend Utils (`app/src/utils`)

Pure standalone frontend calculation utilities. General-purpose formatting, URL, storage, and platform helpers live in [lib/](../lib/README.md).

## Key Files

| File | Primary Export(s) | Purpose |
| --- | --- | --- |
| `mixRanking.ts` | `computeGenreRanks(mixes: any[]): Record<string, number>` | Groups an array of mixes by normalized genre (`(m.genre \|\| m.category \|\| 'General').toLowerCase().trim()`), sorts each genre bucket descending by `plays`, and returns a map of `mix.id` → 1-based rank (`1`–`5`) for the top 5 mixes in each genre. |

## Conventions & Notes

- `computeGenreRanks` safely returns `{}` for non-array inputs and ignores items missing `id`.
- Keep new general infrastructure/formatting helpers in [lib/](../lib/README.md) to match the existing module layout; reserve `utils/` for pure domain computation helpers.
