const cron = require('node-cron');
const { prisma } = require('../utils/prisma');
const { recalculateAllRankingsV2 } = require('../utils/rankingAlgorithm');
const { recalculateAllDiscoveryScores, recalculateStaleDiscoveryScores } = require('./recalculateDiscoveryScores');
const { processSubscriptionExpirations } = require('../utils/subscriptionExpiry');
const logger = require('../utils/logger').default || require('../utils/logger').logger;

const CRON_JOBS = {
  // Weekly full DJ ranking recalculation (Sundays at 02:00 UTC)
  weeklyRankings: '0 2 * * 0',
  // Hourly discovery score refresh for stale/missing mixes
  hourlyDiscovery: '0 * * * *',
  // Daily purge of accounts scheduled for permanent deletion
  dailyAccountPurge: '0 3 * * *',
  // Daily subscription expiry sweep (downgrades + renewal warnings)
  dailySubscriptionExpiry: '30 3 * * *',
};

let jobsStarted = false;
// D5 (INFRA-18/RANK-13): keep node-cron task handles so stopScheduledJobs()
// actually stops the tasks — without this a stop→start cycle double-fires jobs.
const cronTasks: Array<{ stop: () => void }> = [];

export function startScheduledJobs() {
  if (jobsStarted) {
    logger.info('[Scheduler] Jobs already started; skipping.');
    return;
  }
  jobsStarted = true;

  logger.info('[Scheduler] Starting background cron jobs...');

  // Weekly DJ ranking recalculation
  cronTasks.push(cron.schedule(CRON_JOBS.weeklyRankings, async () => {
    const startedAt = Date.now();
    logger.info('[Scheduler] Starting weekly ranking recalculation...');
    try {
      await recalculateAllRankingsV2({ sendNotifications: true });
      logger.info(`[Scheduler] Weekly rankings completed in ${Date.now() - startedAt}ms`);
    } catch (error) {
      logger.error('[Scheduler] Weekly ranking recalculation failed:', error);
    }
  }));

  // Hourly discovery score recalculation (stale/missing only)
  cronTasks.push(cron.schedule(CRON_JOBS.hourlyDiscovery, async () => {
    const startedAt = Date.now();
    logger.info('[Scheduler] Starting hourly discovery score refresh...');
    try {
      await recalculateStaleDiscoveryScores();
      logger.info(`[Scheduler] Hourly discovery scores completed in ${Date.now() - startedAt}ms`);
    } catch (error) {
      logger.error('[Scheduler] Hourly discovery score refresh failed:', error);
    }
  }));

  // Daily hard-delete of accounts whose 30-day grace period has expired
  cronTasks.push(cron.schedule(CRON_JOBS.dailyAccountPurge, async () => {
    const startedAt = Date.now();
    logger.info('[Scheduler] Starting daily account purge...');
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
          // DB-3: payments are the financial ledger — never erase rows.
          // Anonymize by detaching the purged user instead of deleting.
          await tx.payment.updateMany({ where: { clientId: userId }, data: { clientId: null } });
          await tx.booking.deleteMany({ where: { clientId: userId } });

          if (user.djProfile) {
            const djId = user.djProfile.id;
            await tx.review.deleteMany({ where: { djId } });
            // DB-3: anonymize the ledger instead of destroying it.
            await tx.payment.updateMany({ where: { djId }, data: { djId: null } });
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

          // DB-4: SupportTicket.user has ON DELETE RESTRICT (no cascade), so
          // deleting a user who ever filed a support ticket would FK-violate and
          // roll back the whole purge transaction — permanently sticking the
          // purge queue. Detach replies (they cascade off the ticket, but we
          // delete explicitly for safety) then the tickets BEFORE user.delete().
          await tx.supportTicketReply.deleteMany({
            where: { ticket: { userId } },
          });
          await tx.supportTicket.deleteMany({ where: { userId } });

          await tx.user.delete({ where: { id: userId } });
        });
      }

      logger.info(`[Scheduler] Daily account purge completed in ${Date.now() - startedAt}ms. Purged ${usersToPurge.length} accounts.`);
    } catch (error) {
      logger.error('[Scheduler] Daily account purge failed:', error);
    }
  }));

  // Daily subscription expiry: downgrade past-grace subscribers, warn expiring ones
  cronTasks.push(cron.schedule(CRON_JOBS.dailySubscriptionExpiry, async () => {
    const startedAt = Date.now();
    logger.info('[Scheduler] Starting subscription expiry sweep...');
    try {
      const result = await processSubscriptionExpirations();
      logger.info(`[Scheduler] Subscription expiry sweep completed in ${Date.now() - startedAt}ms. Downgraded: ${result.downgraded}, warned: ${result.warned}`);
    } catch (error) {
      logger.error('[Scheduler] Subscription expiry sweep failed:', error);
    }
  }));

  // Run an initial ranking + discovery score backfill on startup in the background
  // so ranking/discovery endpoints can switch to stored scores immediately.
  setTimeout(() => {
    logger.info('[Scheduler] Running initial ranking recalculation...');
    recalculateAllRankingsV2({ sendNotifications: false })
      .then(() => {
        logger.info('[Scheduler] Initial rankings complete; starting discovery score backfill...');
        return recalculateAllDiscoveryScores();
      })
      .catch((error: any) => {
        logger.error('[Scheduler] Initial backfill failed:', error);
      });
  }, 30_000);

  logger.info('[Scheduler] Cron jobs registered.');
}

export function stopScheduledJobs() {
  // D5: actually stop the node-cron tasks and clear the handle array so a
  // later startScheduledJobs() can't double-fire jobs.
  cronTasks.forEach((task) => {
    try {
      task.stop();
    } catch {
      // ignore individual stop failures
    }
  });
  cronTasks.length = 0;
  jobsStarted = false;
}
