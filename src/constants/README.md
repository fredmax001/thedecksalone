# Frontend Constants (`app/src/constants`)

Static domain taxonomies and role-classification constants shared across upload/edit forms, discovery filters, rule-based smart playlists, and UI access checks.

## Key Files

| File | Primary Export(s) | Purpose |
| --- | --- | --- |
| `genres.ts` | `GENRES` | Canonical list of 19 music and mix genres (`'Salone Mix'`, `'Afrobeats'`, `'Amapiano'`, `'Reggae'`, `'Dancehall'`, `'Palm Wine / Cultural'`, etc.) used in mix upload/edit forms, DJ profiles, discovery filters, and listener taste onboarding. |
| `moods.ts` | `MOODS`, `ENERGIES`, `Mood`, `Energy`, `MOOD_LABELS`, `ENERGY_LABELS` | Mood (`relaxed`, `party`, `romantic`, `uplifting`, `soulful`, `intense`, `nostalgic`) and energy (`low`, `medium`, `high`) taxonomy plus value-to-label lookup maps. Used by DJs tagging mixes and moderators authoring rule-based smart playlists. |
| `roles.ts` | `ADMIN_ROLES`, `AdminRole`, `isAdminRole(role)` | Canonical staff/admin role tuple (`ADMIN`, `SUPER_ADMIN`, `FINANCE_ADMIN`, `SUPPORT_ADMIN`, `VERIFICATION_ADMIN`, `MODERATOR`) and type-safe guard used by role hooks and navigation/UI checks. |

## Conventions & Notes

- Keep `MOODS`, `ENERGIES`, and `ADMIN_ROLES` synchronized with backend Prisma enums and smart-playlist rule validation in `app/api`.
- Geographic constants (`AFRICAN_COUNTRIES`, `SIERRA_LEONE_LOCATIONS`) live in [lib/](../lib/README.md) alongside their lookup/country-detection utilities (`africanCountries.ts`, `sierraLeoneLocations.ts`, `userCountry.ts`).
