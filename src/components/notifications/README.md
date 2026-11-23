# Notification Components (`app/src/components/notifications/`)

Real-time foreground alert overlays, background task activity pills, and multi-channel notification preference controls. See [components/](../README.md) for `NotificationBell.tsx` and `NotificationPermissionPrompt.tsx`.

## Key Files

| File | Exports | Responsibility |
| --- | --- | --- |
| `PushBannerStack.tsx` | `IncomingPushBannerItem`, `dispatchIncomingPushBanner`, `PushBannerStack` | Top-right floating foreground toast stack (`z-[148]`) listening to the `ds:incoming-notification` window event. Deduplicates by `id`, collapses matching `groupKey` items with `(+N more)`, sorts by priority (`CRITICAL > HIGH > NORMAL > LOW`), caps at 5 alerts (2 visible until expanded), auto-dismisses after 7s, and records opens via `POST /notifications/:id/open`. |
| `LiveActivityPillBar.tsx` | `LiveActivityPillBar` | Bottom-right floating status pills (`z-[142]`) driven by `useLiveActivityStore` for long-running tasks (`mix-upload`, `audio-processing`, `file-download`, `event-publishing`, `booking-processing`), showing percentage progress bars, retry callbacks, and completion deep links. |
| `NotificationPreferencesPanel.tsx` | `NotificationPreferencesPanel` | Settings panel backed by `useNotificationPreferences` / `useUpdateNotificationPreferences`. Provides browser push priming (`POST /notifications/push-token`), a 9-category × 3-channel (In-App, Push, Email) switch matrix with optimistic rollback, and quiet-hours / daily cap (1–20) / weekend delivery controls. |

## Conventions & Notes

- **Safe-area & chrome stacking**: `LiveActivityPillBar` positions itself using CSS custom properties `var(--bottom-nav-height, 0px)` and `var(--mini-player-height, 0px)` plus `env(safe-area-inset-bottom)` so pills never overlap the mobile dock or `MixPlayer`.
- **Event bus decouple**: Server-sent event (SSE) listeners push foreground banners by calling `dispatchIncomingPushBanner(...)` rather than coupling directly to `PushBannerStack` state.
- **Essential security guard**: In `NotificationPreferencesPanel`, the `system` category (`essential: true`) locks its In-App switch enabled so account security and verification alerts cannot be silenced.
