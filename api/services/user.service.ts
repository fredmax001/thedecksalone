import { prisma } from '../utils/prisma';
import { getCache, setCache } from '../utils/redis';

export class UserService {
  /**
   * Fetch a single user by ID
   */
  static async getUserById(id: string) {
    const cacheKey = `user_${id}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        djProfile: {
          select: {
            id: true,
            isPro: true,
            subscriptionTier: true,
          },
        },
      },
    });

    if (user) {
      await setCache(cacheKey, user, 900);
    }
    return user;
  }

  /**
   * Check if a user is a pro member (via DJ profile subscription)
   */
  static async isProUser(id: string): Promise<boolean> {
    const user = await this.getUserById(id);
    if (!user || !user.djProfile) return false;
    const tier = user.djProfile.subscriptionTier?.toLowerCase();
    return Boolean(user.djProfile.isPro || tier === 'pro' || tier === 'legend');
  }
}

