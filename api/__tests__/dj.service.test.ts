import { DjService } from '../services/dj.service';
import { prisma } from '../utils/prisma';
import { getCache, setCache } from '../utils/redis';

// Mock dependencies
jest.mock('../utils/prisma', () => ({
  prisma: {
    djProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    mix: {
      count: jest.fn(),
    },
  },
}));

jest.mock('../utils/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

describe('DjService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDjByStageName', () => {
    it('should return from cache if available', async () => {
      const mockDj = { id: '1', stageName: 'DJ Test' };
      (getCache as jest.Mock).mockResolvedValueOnce(mockDj);

      const result = await DjService.getDjByStageName('DJ Test');
      
      expect(result).toEqual(mockDj);
      expect(getCache).toHaveBeenCalledWith('dj_profile_dj test');
      expect(prisma.djProfile.findUnique).not.toHaveBeenCalled();
    });

    it('should query db and set cache if not in cache', async () => {
      const mockDj = { id: '1', stageName: 'DJ DB' };
      (getCache as jest.Mock).mockResolvedValueOnce(null);
      (prisma.djProfile.findUnique as jest.Mock).mockResolvedValueOnce(mockDj);

      const result = await DjService.getDjByStageName('DJ DB');
      
      expect(result).toEqual(mockDj);
      expect(prisma.djProfile.findUnique).toHaveBeenCalledWith({
        where: { stageName: 'DJ DB' },
        include: { user: { select: { isPro: true } } },
      });
      expect(setCache).toHaveBeenCalledWith('dj_profile_dj db', mockDj, 900);
    });
  });

  describe('getTopDjs', () => {
    it('should query top DJs correctly', async () => {
      const mockDjs = [{ id: '1', stageName: 'Top DJ' }];
      (getCache as jest.Mock).mockResolvedValueOnce(null);
      (prisma.djProfile.findMany as jest.Mock).mockResolvedValueOnce(mockDjs);

      const result = await DjService.getTopDjs(5);
      
      expect(result).toEqual(mockDjs);
      expect(prisma.djProfile.findMany).toHaveBeenCalledWith({
        where: { isPublic: true, rankingPosition: { not: null } },
        orderBy: { rankingPosition: 'asc' },
        take: 5,
        select: expect.any(Object),
      });
    });
  });
});
