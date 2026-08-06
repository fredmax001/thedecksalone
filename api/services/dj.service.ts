import { prisma } from '../utils/prisma';
import { getCache, setCache } from '../utils/redis';

export class DjService {
  /**
   * Fetch a single DJ by their stageName
   */
  static async getDjByStageName(stageName: string) {
    const cacheKey = `dj_profile_${stageName.toLowerCase()}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const dj = await prisma.djProfile.findFirst({
      where: { stageName },
      include: {
        user: { select: { role: true } },
      },
    });

    if (dj) {
      // Cache for 15 minutes
      await setCache(cacheKey, dj, 900);
    }
    return dj;
  }

  /**
   * Fetch a DJ's total mix count
   */
  static async getDjMixCount(djId: string) {
    return prisma.mix.count({
      where: { djId, isPublic: true },
    });
  }

  /**
   * Fetch top ranked DJs
   */
  static async getTopDjs(limit: number = 10) {
    const cacheKey = `top_djs_${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const djs = await prisma.djProfile.findMany({
      where: { isPublic: true, rankingPosition: { not: null } },
      orderBy: { rankingPosition: 'asc' },
      take: limit,
      select: {
        id: true,
        stageName: true,
        avatar: true,
        city: true,
        country: true,
        genres: true,
        verified: true,
        rankingPosition: true,
        averageRating: true,
        totalFollowers: true,
        totalMixes: true,
      },
    });

    await setCache(cacheKey, djs, 3600); // 1 hour cache
    return djs;
  }
}
