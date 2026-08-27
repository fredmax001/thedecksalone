const cron = require('node-cron');
const { prisma } = require('../utils/prisma');
const { recalculateAllRankingsV2 } = require('../utils/rankingAlgorithm');
const { recalculateAllDiscoveryScores, recalculateStaleDiscoveryScores } = require('./recalculateDiscoveryScores');

const CRON_JOBS = {
  // Weekly full DJ ranking recalculation (Sundays at 02:00 UTC)
  weeklyRankings: '0 2 * * 0',
  // Hourly discovery score refresh for stale/missing mixes
  hourlyDiscovery: '0 * * * *',
  // Daily purge of accounts scheduled for permanent deletion
  dailyAccountPurge: '0 3 * * *',
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

  // Daily hard-delete of accounts whose 30-day grace period has expired
  cron.schedule(CRON_JOBS.dailyAccountPurge, async () => {
    const startedAt = Date.now();
    console.log('[Scheduler] Starting daily account purge...');
    try {
      const usersToPurge = await prisma.user.findMany({
        where: { deletedAt: { lt: new Date() } },
        include: { djProfile: true },
      });

      for (const user of usersToPurge) {
        await prisma.$transaction(async (tx) => {
          const userId = user.id;
          await tx.notification.deleteMany({ where: { userId } });
          await tx.battleVote.deleteMany({ where: { userId } });
          await tx.mixLike.deleteMany({ where: { userId } });
          await tx.follow.deleteMany({ where: { userId } });
          await tx.message.deleteMany({ where: { senderId: userId } });
          await tx.message.deleteMany({ where: { receiverId: userId } });
          await tx.review.deleteMany({ where: { userId } });
          await tx.payment.deleteMany({ where: { clientId: userId } });
          await tx.booking.deleteMany({ where: { clientId: userId } });

          if (user.djProfile) {
            const djId = user.djProfile.id;
            await tx.review.deleteMany({ where: { djId } });
            await tx.payment.deleteMany({ where: { djId } });
            await tx.booking.deleteMany({ where: { djId } });
            await tx.event.deleteMany({ where: { djId } });
            await tx.battleEntry.deleteMany({ where: { djId } });
            await tx.mix.deleteMany({ where: { djId } });
            await tx.djPhoto.deleteMany({ where: { djId } });
            await tx.streamingPlatform.deleteMany({ where: { djId } });
            await tx.rankingHistory.deleteMany({ where: { djId } });
            await tx.gigApplication.deleteMany({ where: { djId } });
            await tx.proSubscriptionRequest.deleteMany({ where: { djId } });
            await tx.oppApplications.deleteMany({ where: { djId } });
            await tx.follow.deleteMany({ where: { djId } });
            await tx.djProfile.delete({ where: { id: djId } });
          }

          await tx.user.delete({ where: { id: userId } });
        });
      }

      console.log(`[Scheduler] Daily account purge completed in ${Date.now() - startedAt}ms. Purged ${usersToPurge.length} accounts.`);
    } catch (error) {
      console.error('[Scheduler] Daily account purge failed:', error);
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
