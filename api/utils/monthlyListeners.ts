const { prisma } = require('./prisma');
const crypto = require('crypto');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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
  if (!mixPlay) {
    return 0;
  }

  return mixPlay.count({
    where: {
      djId,
      createdAt: { gte: thirtyDaysAgo },
    },
  });
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
  getMonthlyListeners,
  recalculateMonthlyListeners,
};
