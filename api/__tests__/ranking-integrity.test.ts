/**
 * Regression tests for RANK-1, RANK-2, RANK-4, RANK-5, RANK-10 / DB-6.
 *
 * RANK-1 (CRITICAL): play endpoint dedupes repeat plays (24h window) and only
 *   authenticated plays feed the ranking economy (MixPlay rows / monthly
 *   listeners). Anonymous plays still bump the public counter.
 * RANK-2: monthlyListeners counts distinct listeners (userId / ipHash) and
 *   excludes the DJ's own plays.
 * RANK-4: battle entry rejects a mixId that does not belong to the entering DJ.
 * RANK-5: battle close atomically claims ACTIVE -> CLOSED; a second close 400s.
 * RANK-10 / DB-6: migration enforces @@unique([djId, week]) on ranking_history
 *   after removing pre-existing duplicate rows.
 */
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

jest.mock('../utils/prisma', () => ({
  ...(jest.requireActual('../utils/prisma') as object),
  prisma: {
    mix: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mixPlay: {
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    djProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    battle: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    battleEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    battleVote: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown) => Promise.all(ops as unknown[])),
  },
}));

jest.mock('../utils/redis', () => {
  const client = { get: jest.fn(), setex: jest.fn(), del: jest.fn(), status: 'ready' };
  return {
    __esModule: true,
    default: client,
    getCache: jest.fn(),
    setCache: jest.fn(),
    clearCache: jest.fn(),
    withCache: jest.fn((_k: string, _t: number, fn: () => Promise<unknown>) => fn()),
  };
});

jest.mock('../utils/cache', () => ({
  withCache: jest.fn((_k: string, _t: number, fn: () => Promise<unknown>) => fn()),
  clearCache: jest.fn(),
}));

jest.mock('../utils/rateLimiter', () => ({
  playLimiter: (req: any, res: any, next: any) => next(),
  voteLimiter: (req: any, res: any, next: any) => next(),
  conditionalSearchLimiter: (req: any, res: any, next: any) => next(),
}));

jest.mock('../utils/ranking', () => ({
  calculateBattleBaseScore: jest.fn().mockResolvedValue(60),
}));

jest.mock('../utils/storage', () => ({
  uploadBuffer: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.mock('../utils/imageProcessor', () => ({
  processMixCover: jest.fn(),
}));

jest.mock('../utils/audioResolver', () => ({
  resolveAudioUrl: jest.fn(),
  resolveHearthisSet: jest.fn(),
}));

jest.mock('../utils/trial', () => ({
  requireTrialOrSubscription: (req: any, res: any, next: any) => next(),
  calculateTrialStatus: jest.fn(() => ({ hasFeatureAccess: true })),
}));

jest.mock('../utils/notifications', () => ({
  createNotification: jest.fn(),
  createNotificationForDj: jest.fn(),
}));

const passthrough = (req: any, res: any, next: any) => next();
jest.mock('../utils/upload', () => ({
  uploadMix: passthrough,
  uploadMixAudio: { single: () => passthrough },
  uploadMixCover: { single: () => passthrough },
  extFromMime: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock = () => require('../utils/prisma').prisma as any;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const redisClientMock = () => require('../utils/redis').default as { get: jest.Mock; setex: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { signToken } = require('../utils/jwt');

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('RANK-1: play dedup + authenticated ranking input', () => {
  let app: express.Application;

  const mix = { id: 'mix1', djId: 'dj1', plays: 41 };

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mixRoutes = require('../routes/mixes');
    app = express();
    app.use(express.json());
    app.use('/api/mixes', mixRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('duplicate play within the 24h window returns current count without incrementing', async () => {
    redisClientMock().get.mockResolvedValue('1'); // dedup key already present
    prismaMock().mix.findUnique.mockResolvedValue(mix);

    const res = await request(app).post('/api/mixes/mix1/play');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plays).toBe(41);
    expect(prismaMock().mix.update).not.toHaveBeenCalled();
    expect(prismaMock().mixPlay.create).not.toHaveBeenCalled();
    expect(redisClientMock().setex).not.toHaveBeenCalled();
  });

  it('anonymous play increments the public counter but skips MixPlay and monthly-listener recount', async () => {
    redisClientMock().get.mockResolvedValue(null);
    prismaMock().mix.findUnique.mockResolvedValue(mix);
    prismaMock().mix.update.mockResolvedValue({ plays: 42 });

    const res = await request(app).post('/api/mixes/mix1/play');
    expect(res.status).toBe(200);
    expect(res.body.data.plays).toBe(42);
    expect(prismaMock().mix.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'mix1' }, data: { plays: { increment: 1 } } })
    );
    // dedup key recorded with 24h TTL
    expect(redisClientMock().setex).toHaveBeenCalledWith(
      expect.stringMatching(/^playdedup:mix1:/),
      24 * 60 * 60,
      '1'
    );
    await flushAsync();
    // anonymous plays must not feed the ranking economy
    expect(prismaMock().mixPlay.create).not.toHaveBeenCalled();
    expect(prismaMock().djProfile.update).not.toHaveBeenCalled();
  });

  it('authenticated play records a MixPlay row and triggers the monthly-listener recount', async () => {
    redisClientMock().get.mockResolvedValue(null);
    prismaMock().user.findUnique.mockResolvedValue({ id: 'listener-1', role: 'USER', status: 'ACTIVE' });
    prismaMock().mix.findUnique.mockResolvedValue(mix);
    prismaMock().mix.update.mockResolvedValue({ plays: 42 });
    prismaMock().mixPlay.groupBy.mockResolvedValue([]);
    prismaMock().djProfile.findUnique.mockResolvedValue({ userId: 'dj-user-1' });
    prismaMock().djProfile.update.mockResolvedValue({});

    const token = signToken({ id: 'listener-1', role: 'USER' });
    const res = await request(app)
      .post('/api/mixes/mix1/play')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plays).toBe(42);

    await flushAsync();
    expect(prismaMock().mixPlay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mixId: 'mix1', djId: 'dj1', userId: 'listener-1' }),
      })
    );
    // recalculateMonthlyListeners ran (groupBy-based distinct recount)
    expect(prismaMock().mixPlay.groupBy).toHaveBeenCalled();
  });
});

describe('RANK-2: monthlyListeners counts distinct listeners, excludes self-plays', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sums distinct authenticated userIds and distinct anonymous ipHashes', async () => {
    const p = prismaMock();
    p.djProfile.findUnique.mockResolvedValue({ userId: 'dj-user-1' });
    p.mixPlay.groupBy
      .mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }]) // 2 distinct authenticated
      .mockResolvedValueOnce([{ ipHash: 'h1' }]);                   // 1 distinct anonymous

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMonthlyListeners } = require('../utils/monthlyListeners');
    const count = await getMonthlyListeners('dj1');
    expect(count).toBe(3);

    // No longer a raw row count
    expect(p.mixPlay.count).not.toHaveBeenCalled();

    const authCall = p.mixPlay.groupBy.mock.calls[0][0];
    expect(authCall.by).toEqual(['userId']);
    expect(authCall.where.djId).toBe('dj1');
    expect(authCall.where.createdAt.gte).toBeInstanceOf(Date);
    // excludes null userIds AND the DJ's own userId
    expect(authCall.where.userId).toEqual({ AND: [{ not: null }, { not: 'dj-user-1' }] });

    const anonCall = p.mixPlay.groupBy.mock.calls[1][0];
    expect(anonCall.by).toEqual(['ipHash']);
    expect(anonCall.where.userId).toBeNull();
    expect(anonCall.where.ipHash).toEqual({ not: null });
  });

  it('does not exclude any userId when the DJ profile has no linked user', async () => {
    const p = prismaMock();
    p.djProfile.findUnique.mockResolvedValue(null);
    p.mixPlay.groupBy.mockResolvedValue([]);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMonthlyListeners } = require('../utils/monthlyListeners');
    const count = await getMonthlyListeners('dj1');
    expect(count).toBe(0);
    const authCall = p.mixPlay.groupBy.mock.calls[0][0];
    expect(authCall.where.userId).toEqual({ AND: [{ not: null }] });
  });
});

describe('RANK-4 / RANK-5: battle entry ownership + atomic close', () => {
  let app: express.Application;

  const djToken = () => signToken({ id: 'dj-user-1', role: 'DJ' });
  const adminToken = () => signToken({ id: 'admin-1', role: 'ADMIN' });

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const battleRoutes = require('../routes/battles');
    app = express();
    app.use(express.json());
    app.use('/api/battles', battleRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RANK-4: enter validates mix ownership', () => {
    beforeEach(() => {
      prismaMock().user.findUnique.mockResolvedValue({ id: 'dj-user-1', role: 'DJ', status: 'ACTIVE' });
      prismaMock().djProfile.findUnique.mockResolvedValue({ id: 'dj1', userId: 'dj-user-1' });
      prismaMock().battle.findUnique.mockResolvedValue({ id: 'b1', status: 'ACTIVE', entries: [] });
    });

    it('rejects another DJ\'s mixId with 400', async () => {
      prismaMock().mix.findUnique.mockResolvedValue({ id: 'mix-x', djId: 'dj2' });

      const res = await request(app)
        .post('/api/battles/b1/enter')
        .set('Authorization', `Bearer ${djToken()}`)
        .send({ mixId: 'mix-x' });
      expect(res.status).toBe(400);
      expect(prismaMock().battleEntry.create).not.toHaveBeenCalled();
    });

    it('rejects a nonexistent mixId with 400', async () => {
      prismaMock().mix.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/battles/b1/enter')
        .set('Authorization', `Bearer ${djToken()}`)
        .send({ mixId: 'mix-missing' });
      expect(res.status).toBe(400);
      expect(prismaMock().battleEntry.create).not.toHaveBeenCalled();
    });

    it('accepts the entering DJ\'s own mix', async () => {
      prismaMock().mix.findUnique.mockResolvedValue({ id: 'mix-own', djId: 'dj1' });
      prismaMock().battleEntry.create.mockResolvedValue({ id: 'e1' });

      const res = await request(app)
        .post('/api/battles/b1/enter')
        .set('Authorization', `Bearer ${djToken()}`)
        .send({ mixId: 'mix-own' });
      expect(res.status).toBe(201);
      expect(prismaMock().battleEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ battleId: 'b1', djId: 'dj1', mixId: 'mix-own' }),
        })
      );
    });
  });

  describe('RANK-5: close claims the battle atomically', () => {
    const battle = {
      id: 'b1',
      status: 'ACTIVE',
      entries: [
        { id: 'e1', djId: 'dj1', finalScore: 90, votes: 5, dj: { id: 'dj1', stageName: 'A' }, votesCast: [{ id: 'v1' }] },
        { id: 'e2', djId: 'dj2', finalScore: 80, votes: 3, dj: { id: 'dj2', stageName: 'B' }, votesCast: [] },
      ],
    };

    beforeEach(() => {
      prismaMock().user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', status: 'ACTIVE' });
      prismaMock().battle.findUnique.mockResolvedValue(battle);
      prismaMock().djProfile.update.mockResolvedValue({});
    });

    it('first close performs the atomic ACTIVE -> CLOSED claim and awards badges', async () => {
      prismaMock().battle.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/api/battles/b1/close')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(prismaMock().battle.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', status: 'ACTIVE' },
        data: { status: 'CLOSED' },
      });
      // badge/score updates run inside a transaction
      expect(prismaMock().$transaction).toHaveBeenCalled();
      expect(prismaMock().djProfile.update).toHaveBeenCalledTimes(2);
      expect(res.body.data.winners).toHaveLength(2);
    });

    it('second close gets 400 from the updateMany count === 0 path and awards nothing', async () => {
      prismaMock().battle.updateMany.mockResolvedValue({ count: 0 });

      const res = await request(app)
        .post('/api/battles/b1/close')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already closed/i);
      expect(prismaMock().djProfile.update).not.toHaveBeenCalled();
      expect(prismaMock().$transaction).not.toHaveBeenCalled();
    });
  });
});

describe('RANK-10 / DB-6: ranking_history unique (djId, week) migration', () => {
  it('migration exists and removes duplicate rows before adding the unique index', () => {
    const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
    const dir = fs
      .readdirSync(migrationsDir)
      .find((d) => d.endsWith('_add_ranking_history_unique_dj_week'));
    expect(dir).toBeTruthy();

    const sql = fs.readFileSync(path.join(migrationsDir, dir as string, 'migration.sql'), 'utf8');
    const deleteIdx = sql.indexOf('DELETE FROM "ranking_history"');
    const uniqueIdx = sql.indexOf('CREATE UNIQUE INDEX "ranking_history_djId_week_key"');
    expect(deleteIdx).toBeGreaterThanOrEqual(0);
    expect(uniqueIdx).toBeGreaterThanOrEqual(0);
    expect(deleteIdx).toBeLessThan(uniqueIdx);
  });
});
