const { prisma } = require('./prisma');
const crypto = require('crypto');

const redisModule = require('./redis');
const redisClient = redisModule.default || redisModule.redisClient || null;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// RANK-1: a repeat play of the same mix by the same user/IP within this window
// does not inflate the public play counter.
const PLAY_DEDUP_TTL_SECONDS = 24 * 60 * 60;

// In-memory fallback dedup store (key -> expiry epoch ms) used when Redis is
// unavailable, mirroring the graceful no-Redis pattern in utils/redis.ts.
const memoryDedupStore = new Map<string, number>();
let memoryDedupCleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureMemoryDedupCleanup() {
  if (memoryDedupCleanupTimer) return;
  memoryDedupCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, expiry] of memoryDedupStore) {
      if (expiry <= now) memoryDedupStore.delete(key);
    }
  }, 60 * 60 * 1000);
  if (typeof memoryDedupCleanupTimer.unref === 'function') memoryDedupCleanupTimer.unref();
}

/**
 * Check-and-set play dedup. Returns true if this key was already recorded
 * within the 24h window (i.e. this is a duplicate play). Uses Redis when
 * available; otherwise falls back to a process-local Map with periodic
 * cleanup (single-process approximation). Never throws.
 */
async function wasPlayRecentlyRecorded(dedupKey: string): Promise<boolean> {
  if (redisClient && redisClient.status === 'ready') {
    try {
      const existing = await redisClient.get(dedupKey);
      if (existing) return true;
      await redisClient.setex(dedupKey, PLAY_DEDUP_TTL_SECONDS, '1');
      return false;
    } catch {
      // Redis errored mid-call — fall through to the in-memory store.
    }
  }

  const now = Date.now();
  const expiry = memoryDedupStore.get(dedupKey);
  if (expiry && expiry > now) return true;
  memoryDedupStore.set(dedupKey, now + PLAY_DEDUP_TTL_SECONDS * 1000);
  ensureMemoryDedupCleanup();
  return false;
}

function hashIp(ip?: string): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

function getMixPlayDelegate() {
  const delegate = prisma.mixPlay;
  if (!delegate || typeof delegate.create !== 'function' || typeof delegate.count !== 'function') {
    return null;
  }
  return delegate;
}

async function recordMixPlay(
  mixId: string,
  djId: string,
  options: { userId?: string; ip?: string } = {}
) {
  const mixPlay = getMixPlayDelegate();
  if (!mixPlay) return null;

  return mixPlay.create({
    data: {
      mixId,
      djId,
      userId: options.userId || null,
      ipHash: hashIp(options.ip),
    },
  });
}

async function getMonthlyListeners(djId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
  const mixPlay = getMixPlayDelegate();
  if (!mixPlay || typeof mixPlay.groupBy !== 'function') {
    return 0;
  }

  // RANK-2: count distinct listeners, and never count the DJ's own plays.
  const dj = await prisma.djProfile.findUnique({
    where: { id: djId },
    select: { userId: true },
  }).catch(() => null);
  const ownUserId = dj?.userId;

  // Distinct AUTHENTICATED listeners only (by userId), over the trailing 30
  // days. Anonymous plays are recorded for analytics but are excluded here:
  // only authenticated listeners count toward ranking.
  // NOTE: Prisma's groupBy where rejects AND-combined scalar filters
  // (PrismaClientValidationError at runtime — mocks don't catch this), so
  // the own-user exclusion uses a plain `not` and the anonymous (null)
  // group is dropped after grouping.
  const groups = await mixPlay.groupBy({
    by: ['userId'],
    where: {
      djId,
      createdAt: { gte: thirtyDaysAgo },
      ...(ownUserId ? { userId: { not: ownUserId } } : {}),
    },
  });

  return groups.filter((g: { userId: string | null }) => g.userId !== null).length;
}

async function recalculateMonthlyListeners(djId: string): Promise<number> {
  const mixPlay = getMixPlayDelegate();
  if (!mixPlay) {
    return getMonthlyListeners(djId);
  }

  const count = await getMonthlyListeners(djId);

  await prisma.djProfile.update({
    where: { id: djId },
    data: { monthlyListeners: count },
  }).catch(() => {});

  return count;
}

module.exports = {
  hashIp,
  recordMixPlay,
  wasPlayRecentlyRecorded,
  getMonthlyListeners,
  recalculateMonthlyListeners,
};
