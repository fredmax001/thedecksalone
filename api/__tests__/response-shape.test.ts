import request from 'supertest';
import express from 'express';

// Private DjProfile fields that must never appear in public selects (SOC-1).
const PRIVATE_DJ_FIELDS = [
  'idDocumentUrl',
  'idDocumentType',
  'legalName',
  'nationality',
  'payoutMethod',
  'whatsappNumber',
  'verificationReason',
  'socialProof',
  'blockedDates',
];

jest.mock('../utils/prisma', () => ({
  // Keep the real exported select constants; only prisma itself is mocked.
  ...(jest.requireActual('../utils/prisma') as object),
  prisma: {
    djProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    follow: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
    mix: {
      findMany: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../utils/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  clearCache: jest.fn(),
  withCache: jest.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
}));

jest.mock('../utils/storage', () => ({
  uploadBuffer: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.mock('../utils/imageProcessor', () => ({
  processAvatar: jest.fn(),
  processCover: jest.fn(),
}));

const passthrough = (req: any, res: any, next: any) => next();
jest.mock('../utils/upload', () => ({
  uploadAvatar: { single: () => passthrough },
  uploadCover: { single: () => passthrough },
  uploadDocument: { single: () => passthrough },
  uploadDjProfileImages: passthrough,
}));

jest.mock('../utils/notifications', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../utils/ranking', () => ({
  computeDjScore: jest.fn(),
  recalculateAllRankings: jest.fn(),
}));

jest.mock('../utils/rankingAlgorithm', () => ({
  recalculateAllRankingsV2: jest.fn(),
  getRisingDjs: jest.fn(),
  getBattleLeaders: jest.fn(),
  computeDjScoreV2: jest.fn(),
}));

jest.mock('../utils/mixDiscovery', () => ({
  discoverMixes: jest.fn(),
  getTrendingMixes: jest.fn(),
  getPersonalizedRecommendations: jest.fn(),
  getHallOfFameCandidates: jest.fn(),
}));

jest.mock('../utils/campaignBoost', () => ({
  getActiveCampaigns: jest.fn(async () => []),
  applyCampaignBoost: jest.fn((items: unknown[]) => items),
}));

jest.mock('../utils/email', () => ({
  sendAccountDeletionEmail: jest.fn(),
}));

describe('Response-shape security (SOC-1…SOC-6)', () => {
  let app: express.Application;
  let token: string;
  let userId: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock = () => require('../utils/prisma').prisma as any;

  const expectNoPrivateFields = (select: Record<string, unknown>) => {
    expect(select).toBeDefined();
    for (const field of PRIVATE_DJ_FIELDS) {
      expect(select[field]).toBeUndefined();
    }
    // Public scalars the client relies on must still be selected
    expect(select.id).toBe(true);
    expect(select.stageName).toBe(true);
    expect(select.avatar).toBe(true);
    expect(select.city).toBe(true);
    expect(select.monthlyListeners).toBe(true);
  };

  const fakeDj = () => ({
    id: 'dj1',
    userId: 'dj-user-1',
    stageName: 'DJ Test',
    avatar: null,
    city: 'Freetown',
    monthlyListeners: 0,
    totalStreams: 0,
    user: { id: 'dj-user-1', username: 'djtest' },
    mixes: [],
    streamingPlatforms: [],
    reviews: [],
    photos: [],
    events: [],
    highlights: [],
    reups: [],
    _count: { mixes: 0, reviews: 0, bookingsAsDj: 0, followers: 0, events: 0 },
  });

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signToken } = require('../utils/jwt');
    userId = 'test-user-a';
    token = signToken({ id: userId, email: 'userA@example.com', role: 'DJ' });

    prismaMock().user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === userId) {
        return Promise.resolve({ id: userId, email: 'userA@example.com', role: 'DJ', status: 'ACTIVE' });
      }
      return Promise.resolve(null);
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const djRoutes = require('../routes/djs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const discoverRoutes = require('../routes/discover');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messageRoutes = require('../routes/messages');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const userRoutes = require('../routes/users');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ogRoutes = require('../routes/og');

    app = express();
    app.use(express.json());
    app.use('/api/djs', djRoutes);
    app.use('/api/discover', discoverRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/api/users', userRoutes);
    app.use('/og', ogRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock().user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === userId) {
        return Promise.resolve({ id: userId, email: 'userA@example.com', role: 'DJ', status: 'ACTIVE' });
      }
      return Promise.resolve(null);
    });
  });

  describe('SOC-1: public DJ list/detail queries exclude private fields', () => {
    it('GET /api/djs/ selects only public fields', async () => {
      const p = prismaMock();
      p.djProfile.findMany.mockResolvedValue([fakeDj()]);
      p.djProfile.count.mockResolvedValue(1);

      const res = await request(app).get('/api/djs/');
      expect(res.status).toBe(200);

      const args = p.djProfile.findMany.mock.calls[0][0];
      expect(args.include).toBeUndefined();
      expectNoPrivateFields(args.select);
      // Nested public relations must be preserved
      expect(args.select.user).toEqual({ select: { username: true } });
      expect(args.select.mixes).toBeDefined();
      expect(args.select.streamingPlatforms).toBeDefined();
      expect(args.select._count).toBeDefined();
    });

    it('GET /api/djs/hall-of-fame selects only public fields', async () => {
      const p = prismaMock();
      p.djProfile.findMany
        .mockResolvedValueOnce([]) // no Hall of Fame DJs -> fallback branch
        .mockResolvedValueOnce([fakeDj()]);

      const res = await request(app).get('/api/djs/hall-of-fame');
      expect(res.status).toBe(200);
      expect(p.djProfile.findMany).toHaveBeenCalledTimes(2);

      for (const call of p.djProfile.findMany.mock.calls) {
        expectNoPrivateFields(call[0].select);
        expect(call[0].select.user).toEqual({ select: { username: true } });
      }
    });

    it('GET /api/djs/:identifier selects only public fields', async () => {
      const p = prismaMock();
      p.djProfile.findUnique.mockResolvedValue(fakeDj());

      const res = await request(app).get('/api/djs/dj1');
      expect(res.status).toBe(200);

      const args = p.djProfile.findUnique.mock.calls[0][0];
      expect(args.include).toBeUndefined();
      expectNoPrivateFields(args.select);
      expect(args.select.user).toEqual({ select: { id: true, username: true } });
      expect(args.select.reviews).toBeDefined();
      expect(args.select._count).toBeDefined();
    });

    it('GET /api/discover/djs selects only public fields', async () => {
      const p = prismaMock();
      p.djProfile.findMany
        .mockResolvedValueOnce([]) // promoted DJs
        .mockResolvedValueOnce([fakeDj()]); // regular page
      p.djProfile.count.mockResolvedValue(1);

      const res = await request(app).get('/api/discover/djs');
      expect(res.status).toBe(200);
      expect(p.djProfile.findMany).toHaveBeenCalledTimes(2);

      for (const call of p.djProfile.findMany.mock.calls) {
        expectNoPrivateFields(call[0].select);
        expect(call[0].select.user).toEqual({ select: { username: true } });
      }
    });
  });

  describe('SOC-2: private DJ profiles are not served', () => {
    it('GET /api/djs/:identifier filters isPublic on the id lookup', async () => {
      const p = prismaMock();
      p.djProfile.findUnique.mockResolvedValue(fakeDj());

      const res = await request(app).get('/api/djs/dj1');
      expect(res.status).toBe(200);
      expect(p.djProfile.findUnique.mock.calls[0][0].where).toEqual({ id: 'dj1', isPublic: true });
    });

    it('GET /api/djs/:identifier filters isPublic on the username lookup', async () => {
      const p = prismaMock();
      p.djProfile.findUnique.mockResolvedValue(null);
      p.djProfile.findFirst.mockResolvedValue(fakeDj());

      const res = await request(app).get('/api/djs/djtest');
      expect(res.status).toBe(200);

      const where = p.djProfile.findFirst.mock.calls[0][0].where;
      expect(where.isPublic).toBe(true);
      expect(where.user.username).toEqual({ equals: 'djtest', mode: 'insensitive' });
    });

    it('GET /api/djs/:identifier has no raw userId fallback lookup', async () => {
      const p = prismaMock();
      p.djProfile.findUnique.mockResolvedValue(null);
      p.djProfile.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/djs/user-b-id');
      expect(res.status).toBe(404);

      const allCalls = [...p.djProfile.findUnique.mock.calls, ...p.djProfile.findFirst.mock.calls];
      for (const call of allCalls) {
        expect(call[0].where.userId).toBeUndefined();
      }
    });

    it('OG /og/dj/:identifier filters isPublic', async () => {
      const p = prismaMock();
      p.djProfile.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/og/dj/someone');
      expect(res.status).toBe(404);
      expect(p.djProfile.findFirst.mock.calls[0][0].where.isPublic).toBe(true);
    });
  });

  describe('SOC-3: follower payload has no email/location', () => {
    it('GET /api/djs/me/followers selects no email or location', async () => {
      const p = prismaMock();
      p.djProfile.findUnique.mockResolvedValue({ id: 'dj1' });
      p.follow.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-01-01'),
          user: { id: 'fan1', name: 'Fan One', username: 'fanone', avatar: null, createdAt: new Date('2025-01-01') },
        },
      ]);
      p.follow.count.mockResolvedValue(1);

      const res = await request(app).get('/api/djs/me/followers').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const userSelect = p.follow.findMany.mock.calls[0][0].include.user.select;
      expect(userSelect).toEqual({ id: true, name: true, username: true, avatar: true, createdAt: true });

      const payload = res.body.data[0];
      expect(payload.email).toBeUndefined();
      expect(payload.location).toBeUndefined();
      expect(payload.name).toBe('Fan One');
    });
  });

  describe('SOC-4: conversation partner payload has no email', () => {
    it('GET /api/messages/conversations selects no email for partners', async () => {
      const p = prismaMock();
      p.message.findMany
        .mockResolvedValueOnce([{ receiverId: 'user-b' }])
        .mockResolvedValueOnce([{ senderId: 'user-b' }]);
      const partner = { id: 'user-b', username: 'userb', djProfile: null };
      p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === userId
          ? { id: userId, email: 'userA@example.com', role: 'DJ', status: 'ACTIVE' }
          : partner),
      );
      p.message.findFirst.mockResolvedValue(null);
      p.message.count.mockResolvedValue(0);

      const res = await request(app).get('/api/messages/conversations').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const partnerCall = p.user.findUnique.mock.calls.find((c: any[]) => c[0].where.id === 'user-b');
      const partnerSelect = partnerCall[0].select;
      expect(partnerSelect.email).toBeUndefined();
      expect(partnerSelect).toEqual({ id: true, username: true, djProfile: { select: { stageName: true, avatar: true } } });
      expect(res.body.data[0].name).toBe('userb');
    });

    it('GET /api/messages/:userId selects no email for the partner', async () => {
      const p = prismaMock();
      p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === userId
          ? { id: userId, email: 'userA@example.com', role: 'DJ', status: 'ACTIVE' }
          : { id: 'user-b', username: 'userb', djProfile: null }),
      );
      p.message.findMany.mockResolvedValue([]);
      p.message.updateMany.mockResolvedValue({});

      const res = await request(app).get('/api/messages/user-b').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const partnerCall = p.user.findUnique.mock.calls.find((c: any[]) => c[0].where.id === 'user-b');
      const partnerSelect = partnerCall[0].select;
      expect(partnerSelect.email).toBeUndefined();
      expect(res.body.partner.name).toBe('userb');
    });
  });

  describe('SOC-5: notification feed excludes sender email', () => {
    it('GET /api/users/notifications selects no sender email', async () => {
      const p = prismaMock();
      p.booking.findMany.mockResolvedValue([]);
      p.message.findMany.mockResolvedValue([
        {
          id: 'm1',
          createdAt: new Date('2026-01-01'),
          content: 'hello',
          sender: { id: 'user-b', username: 'userb', djProfile: null },
        },
      ]);
      p.follow.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/users/notifications').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);

      const senderSelect = p.message.findMany.mock.calls[0][0].include.sender.select;
      expect(senderSelect.email).toBeUndefined();
      expect(senderSelect).toEqual({ id: true, username: true, djProfile: { select: { stageName: true, avatar: true } } });

      const msg = res.body.data.find((n: { type: string }) => n.type === 'new_message');
      expect(msg).toBeDefined();
      expect(msg.title).toBe('New message from userb');
    });
  });

  describe('SOC-6: discover users where-clause excludes email', () => {
    it('GET /api/discover/users does not search by email', async () => {
      const p = prismaMock();
      p.user.findMany.mockResolvedValue([]);
      p.user.count.mockResolvedValue(0);

      const res = await request(app).get('/api/discover/users?search=@gmail.com');
      expect(res.status).toBe(200);

      const where = p.user.findMany.mock.calls[0][0].where;
      const orFields = where.OR.map((clause: Record<string, unknown>) => Object.keys(clause)[0]);
      expect(orFields).not.toContain('email');
      expect(orFields).toEqual(expect.arrayContaining(['name', 'username', 'location']));
    });
  });
});
