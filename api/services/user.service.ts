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
      },
    });

    if (user) {
      await setCache(cacheKey, user, 900);
    }
    return user;
  }

  /**
   * Check if a user is a pro member
   */
  static async isProUser(id: string) {
    const user = await this.getUserById(id);
    return user?.role === 'PRO'; // Assuming PRO is a role or something similar.
  }
}
