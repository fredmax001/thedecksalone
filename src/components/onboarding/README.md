# Onboarding Components (`app/src/components/onboarding/`)

First-run splash intro, role selection, account creation, and post-signup activation checklists for Listeners (`USER`), DJs (`DJ`), and Event Organisers (`EVENT_ORGANIZER`). See [components/](../README.md) for the parent index.

## Key Files

| File | Exports | Responsibility |
| --- | --- | --- |
| `AnimatedSplashScreen.tsx` | `AnimatedSplashScreen` (default) | 5-stage fullscreen brand intro (`#000000` canvas, `/deck.webp` / `/deck.svg` logo reveal, yellow soundwave pulse, `"MUSIC • DJS • EVENTS"` tagline, fade-out). Tap-to-skip enabled; respects `useReducedMotion` (600ms shortcut). |
| `AccountTypeSelector.tsx` | `OnboardingAccountType`, `AccountTypeSelector` (default) | Role picker presenting `USER` (Listener / Fan), `DJ` (DJ / Creator), and `EVENT_ORGANIZER` (Event Organiser) cards before authentication. |
| `AuthenticationScreen.tsx` | `AuthenticationScreen` (default) | Role-aware sign-up screen supporting email/password registration (`useAuthStore.register`), optional DJ stage name (auto-bootstraps initial profile via `POST /djs`), optional phone field, Google OAuth (`openGoogleAuth`), and an Apple placeholder toast. Sets `ds_onboarded` and routes to `/onboarding/setup?role=...`. |
| `OnboardingChecklistCard.tsx` | `OnboardingChecklistCard` | Persistent dashboard/home activation widget powered by `useOnboardingStatus` and `useUpdateOnboardingState`. Includes multi-role tab switching, progress bar, "Recommended Next Step" coach mark, interactive role-specific Product Tour modal, and contextual notification permission priming modal. |
| `OnboardingPagination.tsx` | `OnboardingPagination` (default) | Accessible `role="tablist"` dot pagination indicator for multi-step onboarding slides. |

## Conventions & Notes

- **Storage keys**: `AuthenticationScreen` writes `ds_onboarded` (and `ds_preferred_role` before Google OAuth) and clears `ds_onboarding_step` / `ds_onboarding_role` via `@/lib/safeStorage`.
- **Auto-hiding checklist**: `OnboardingChecklistCard` returns `null` once a role is activated (`isActivated`, `progressPercent >= 100`, `completedRoles[activeRole]`, or all required items done) or dismissed (`checklistDismissedByRole[activeRole]`).
- **DJ bootstrap resilience**: During DJ sign-up in `AuthenticationScreen`, failure of the default `POST /djs` bootstrap is caught and logged as a warning so account creation still proceeds into `/onboarding/setup?role=DJ&step=identity`.
