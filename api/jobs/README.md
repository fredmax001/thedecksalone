# Background Jobs (`app/api/jobs`)

Scheduled cron tasks and batch scoring jobs invoked from `startBackgroundJobs()` in `../server.ts`. Back to [app/api/README.md](../README.md).

## Key Files

| File | Exports & Responsibility |
| --- | --- |
| `scheduler.ts` | Manages `node-cron` task lifecycle via `startScheduledJobs()` and `stopScheduledJobs()`. Registers four cron schedules (plus a 30 s delayed startup backfill of rankings + discovery scores) and stores task handles in `cronTasks` so stopping and restarting never double-registers jobs. |
| `recalculateDiscoveryScores.ts` | Cursor-batched (`BATCH_SIZE = 200`) mix discovery score calculators using `computeMixScore()` from `utils/mixDiscovery.ts` and raw SQL `CASE` batch `UPDATE "mixes"` statements. Exports `recalculateAllDiscoveryScores()` (all public mixes) and `recalculateStaleDiscoveryScores()` (public mixes with `discoveryScore IS NULL` or `discoveryScoredAt` older than 24 h). |

## Scheduled Cron Cadence (`scheduler.ts`)

| Job | Cron Expression (UTC) | Action |
| --- | --- | --- |
| `weeklyRankings` | `0 2 * * 0` (Sundays 02:00) | Runs `recalculateAllRankingsV2({ sendNotifications: true })` from `utils/rankingAlgorithm.ts` (current composite DJ ranking algorithm). |
| `hourlyDiscovery` | `0 * * * *` (Top of every hour) | Runs `recalculateStaleDiscoveryScores()`. |
| `dailyAccountPurge` | `0 3 * * *` (Daily 03:00) | Hard-deletes `User` accounts whose `deletedAt < now()` inside a Prisma transaction. |
| `dailySubscriptionExpiry` | `30 3 * * *` (Daily 03:30) | Runs `processSubscriptionExpirations()` (`utils/subscriptionExpiry.ts`) to downgrade subscribers past their 3-day grace window (`free` < `pro` < `legend` [Pro+]) and send renewal warnings. |
| Startup backfill | 30 s after `startScheduledJobs()` | Runs `recalculateAllRankingsV2({ sendNotifications: false })` followed by `recalculateAllDiscoveryScores()`. |

## Conventions & Notes

- **Single-Process Execution**: In production cluster mode (`cluster.ts`), `startBackgroundJobs()` (and therefore `startScheduledJobs()`) runs **only on the primary process** so cron jobs do not fire once per CPU worker.
- **Financial Ledger Integrity During Account Purge**: The daily account purge never deletes `Payment` rows; it anonymizes them by setting `clientId = null` / `djId = null`. It also explicitly deletes `SupportTicketReply` and `SupportTicket` rows before `user.delete()` because `SupportTicket.user` does not cascade delete.
- **Clean Lifecycle**: `stopScheduledJobs()` stops every tracked `node-cron` handle and resets `jobsStarted = false` (verified by `__tests__/hardening.test.ts`).
- **Additional Interval Jobs**: Trial notifications (6 h), daily bug-report digest (24 h), and 30-day read notification cleanup (24 h) are registered directly via `setInterval` inside `startBackgroundJobs()` in `server.ts`, not in `scheduler.ts`.
