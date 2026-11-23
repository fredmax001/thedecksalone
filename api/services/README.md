# Services (`app/api/services`)

Domain-layer services encapsulating business logic shared across route handlers, background jobs, and real-time pipelines. Back to [app/api/README.md](../README.md).

## Key Files

| File | Responsibility & Main Exports |
| --- | --- |
| `notificationEngine.ts` | Central intelligent notification orchestrator. Exports `dispatchIntelligentNotification()` (handles idempotency via `NotificationLog.idempotencyKey`, user opt-outs, 24 h frequency caps for `NORMAL`/`LOW` priority, timezone/quiet-hours scheduling via BullMQ, or immediate multi-channel delivery to in-app inbox + SSE + FCM push + optional email), `processInactiveListenersOpportunity()`, `processDjMilestonesOpportunity()`, and `broadcastNewMixToFollowers()`. |
| `timezoneScheduler.ts` | Pure IANA timezone & availability evaluator (default `DEFAULT_TIMEZONE = 'Africa/Freetown'`). Exports `isValidIanaTimezone()`, `sanitizeTimezone()`, `getLocalTimeComponents()`, `parseTimeToMinutes()`, `isInsideQuietHours()`, `isDayOff()`, `localTimeToUtc()`, `evaluateSchedulingWindow()`, `formatLocalTime()`, and `buildIdempotencyKey()`. `CRITICAL` notifications bypass quiet hours and DND; `HIGH` priority can deliver on days off outside quiet hours. |
| `realtimeNotificationService.ts` | Server-Sent Events (SSE) delivery hub with optional Redis Pub/Sub fan-out (`deck-salone:realtime-notifications` channel) across cluster workers. Exports `emitRealtimeNotificationEvent()`, `registerSseClient()` (with 25 s `.unref()` heartbeat), `getActiveRealtimeClientCount()`, and `subscribeLocalRealtimeBus()`. Falls back cleanly to in-process delivery when `REDIS_URL` is unset or in `NODE_ENV=test`. |
| `queue.ts` | Lazy BullMQ queue wrapper over `ioredis` (`QUEUE_NAMES.NOTIFICATIONS` and `QUEUE_NAMES.INTERACTIONS`). Exports `getNotificationQueue()`, `getInteractionQueue()`, `enqueueNotificationJob()`, `enqueueInteractionJob()`, and `getQueueHealth()`. Returns `null` when Redis is unconfigured so callers can execute inline fallbacks. |
| `trackingService.ts` | User behavior & onboarding telemetry service. Exports `ONBOARDING_EVENT_TYPES`, `trackEvent()` (deduplicates one-time onboarding milestones, persists `AppInteractionEvent`, enqueues or runs inline aggregation), `processUserInteraction()` (upserts `UserEngagementProfile` active hours/days, favorite genres, top DJs, play time, and counts), and `updateDailyInactivitySweep()`. Never throws to callers. |
| `smartPlaylist.service.ts` | Rule-based smart playlist curator. Exports `DEFAULT_SMART_PLAYLISTS` (7 curated defaults: Trending Mixes, Fresh Drops, Amapiano Groove, Afrobeats Wave, Dancehall & Reggae Vibez, Salone Heat & Heritage, Club & Party Bangers), `ensureDefaultSmartPlaylists()` (upserts defaults and cleans obsolete legacy playlists), and `generateSmartPlaylistItems()` (strict genre/mood/energy filtering + dynamic DJ avatar cover selection). |
| `dj.service.ts` | Redis-cached DJ lookup service (`DjService`). Static methods: `getDjByStageName()` (15 min cache), `getDjMixCount()`, and `getTopDjs(limit)` (1 h cache). |

## Conventions & Notes

- **Graceful Redis Degradation**: `queue.ts`, `realtimeNotificationService.ts`, and `trackingService.ts` are designed to degrade safely without Redis (`REDIS_URL` absent or unreachable) by falling back to local event delivery or inline processing.
- **Notification Idempotency**: Every intelligent notification computes a deterministic `ruleCode:userId:bucket` key (defaulting `bucket` to `YYYY-MM-DD`, or lifetime keys like `LIFETIME_1K_STREAMS`) checked against `NotificationLog.idempotencyKey` to prevent duplicates.
- **Test Isolation**: `realtimeNotificationService.ts` skips Redis Pub/Sub initialization when `NODE_ENV === 'test'` to avoid open sockets hanging Jest runs.
