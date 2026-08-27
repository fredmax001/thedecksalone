const cron = require('node-cron');
const { recalculateAllRankingsV2 } = require('../utils/rankingAlgorithm');
const { recalculateAllDiscoveryScores, recalculateStaleDiscoveryScores } = require('./recalculateDiscoveryScores');

const CRON_JOBS = {
  // Weekly full DJ ranking recalculation (Sundays at 02:00 UTC)
  weeklyRankings: '0 2 * * 0',
  // Hourly discovery score refresh for stale/missing mixes
  hourlyDiscovery: '0 * * * *',
};

let jobsStarted = false;

export function startScheduledJobs() {
  if (jobsStarted) {
    console.log('[Scheduler] Jobs already started; skipping.');
    return;
  }
  jobsStarted = true;

  console.log('[Scheduler] Starting background cron jobs...');

  // Weekly DJ ranking recalculation
  cron.schedule(CRON_JOBS.weeklyRankings, async () => {
    const startedAt = Date.now();
    console.log('[Scheduler] Starting weekly ranking recalculation...');
    try {
      await recalculateAllRankingsV2({ sendNotifications: true });
      console.log(`[Scheduler] Weekly rankings completed in ${Date.now() - startedAt}ms`);
    } catch (error) {
      console.error('[Scheduler] Weekly ranking recalculation failed:', error);
    }
  });

  // Hourly discovery score recalculation (stale/missing only)
  cron.schedule(CRON_JOBS.hourlyDiscovery, async () => {
    const startedAt = Date.now();
    console.log('[Scheduler] Starting hourly discovery score refresh...');
    try {
      await recalculateStaleDiscoveryScores();
      console.log(`[Scheduler] Hourly discovery scores completed in ${Date.now() - startedAt}ms`);
    } catch (error) {
      console.error('[Scheduler] Hourly discovery score refresh failed:', error);
    }
  });

  // Run an initial ranking + discovery score backfill on startup in the background
  // so ranking/discovery endpoints can switch to stored scores immediately.
  setTimeout(() => {
    console.log('[Scheduler] Running initial ranking recalculation...');
    recalculateAllRankingsV2({ sendNotifications: false })
      .then(() => {
        console.log('[Scheduler] Initial rankings complete; starting discovery score backfill...');
        return recalculateAllDiscoveryScores();
      })
      .catch((error: any) => {
        console.error('[Scheduler] Initial backfill failed:', error);
      });
  }, 30_000);

  console.log('[Scheduler] Cron jobs registered.');
}

export function stopScheduledJobs() {
  // node-cron tasks are stopped automatically when the process exits.
  // This function is provided for explicit future use.
  jobsStarted = false;
}
