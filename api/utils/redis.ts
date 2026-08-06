import Redis from 'ioredis';
import logger from './logger';

const redisUrl = process.env.REDIS_URL;

let redisClient: Redis | null = null;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.error('Redis connection failed permanently');
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
  }
} else {
  logger.warn('REDIS_URL not provided. Running without Redis caching.');
}

/**
 * Cache utility that uses Redis if available, otherwise just executes the function.
 */
export async function withCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  if (!redisClient || redisClient.status !== 'ready') {
    return await fetcher();
  }

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    const data = await fetcher();
    await redisClient.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  } catch (error) {
    logger.error(`Cache error for key ${key}:`, error);
    // Fallback to fetcher if Redis errors out
    return await fetcher();
  }
}

export function clearCache(pattern: string) {
  if (!redisClient || redisClient.status !== 'ready') return;
  redisClient.del(pattern).catch((err) => logger.error(`Failed to clear cache key ${pattern}:`, err));
}

export async function getCache(key: string): Promise<any> {
  if (!redisClient || redisClient.status !== 'ready') return null;
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

export async function setCache(key: string, data: any, ttlSeconds: number = 3600): Promise<void> {
  if (!redisClient || redisClient.status !== 'ready') return;
  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
  }
}

export default redisClient;
