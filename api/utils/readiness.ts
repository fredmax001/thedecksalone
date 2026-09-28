import { prisma } from './prisma';
import redisClient from './redis';

/**
 * GET /health/readiness (D4 / 3b): cheap, unauthenticated readiness probe used
 * by the compose healthcheck. Reports DB (SELECT 1) AND Redis (client status /
 * PING) independently; 200 only when both are healthy. The existing /health
 * endpoint is intentionally left untouched.
 */
export async function readinessHandler(req: any, res: any) {
  let db = true;
  let redis = true;

  try {
    await (prisma as any).$queryRaw`SELECT 1`;
  } catch {
    db = false;
  }

  try {
    if (!redisClient || redisClient.status !== 'ready') {
      redis = false;
    } else {
      await redisClient.ping();
    }
  } catch {
    redis = false;
  }

  if (db && redis) {
    return res.status(200).json({ status: 'ready', db: true, redis: true });
  }
  return res.status(503).json({ status: 'not_ready', db, redis });
}
