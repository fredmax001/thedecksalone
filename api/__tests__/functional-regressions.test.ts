/**
 * Functional regression tests for adversarial re-review findings C3–C6.
 *
 * C3: moderator ranking adjustment writes RankingHistory rows with the required
 *   `week` field (previously missing → insert threw → silently swallowed).
 * C4: admin hall-of-fame endpoints accept an absolute boolean `value` so retries
 *   are idempotent (previously a retried toggle flipped state back).
 * C5: /customers/export bounds its findMany with take: 10000.
 * C6: GET /ticketing/dashboard destructures 12 Promise.all values into 12 names
 *   (previously 11, so the scan-log count landed in `typeBreakdown` and
 *   typeBreakdown.map threw a 500 for every organizer).
 */
import request from 'supertest';
import express from 'express';

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    djProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    mix: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    rankingHistory: {
      create: jest.fn(),
    },
    moderatorAuditLog: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
    eventTicket: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    eventTicketType: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    eventScanLog: {
      count: jest.fn(),
      create: jest.fn(),
    },
    eventRSVP: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../utils/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  clearCache: jest.fn(),
}));

jest.mock('../utils/storage', () => ({
  uploadBuffer: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.mock('../utils/email', () => ({
  sendTicketApprovalEmail: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock = () => require('../utils/prisma').prisma as any;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { signToken } = require('../utils/jwt');

const users: Record<string, any> = {
  'admin-1': { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
  'moderator-1': { id: 'moderator-1', email: 'mod@example.com', role: 'MODERATOR', status: 'ACTIVE' },
  'owner-user': {
    id: 'owner-user',
    email: 'owner@example.com',
    role: 'DJ',
    status: 'ACTIVE',
    djProfile: { id: 'owner-dj', subscriptionTier: 'pro' },
  },
};

const auth = (id: string) => ({
  Authorization: `Bearer ${signToken({ id, email: users[id].email, role: users[id].role })}`,
});

describe('C3: moderator ranking adjustment records RankingHistory with a week value', () => {
  let app: express.Application;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authMiddleware } = require('../middleware/auth');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const moderatorRoutes = require('../routes/moderator');

    app = express();
    app.use(express.json());
    app.use('/api/moderator', authMiddleware, moderatorRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock().user.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(users[where.id] || null)
    );
    prismaMock().djProfile.findUnique.mockResolvedValue({
      id: 'dj1',
      stageName: 'DJ One',
      rankingPosition: 5,
      rankingScore: 42,
    });
    prismaMock().djProfile.update.mockResolvedValue({ id: 'dj1', rankingPosition: 3, rankingScore: 55 });
    prismaMock().moderatorAuditLog.create.mockResolvedValue({});
  });

  it('creates the RankingHistory row with a defined Date week', async () => {
    prismaMock().rankingHistory.create.mockResolvedValue({ id: 'rh1' });

    const res = await request(app)
      .post('/api/moderator/rankings/adjust')
      .set(auth('moderator-1'))
      .send({ djId: 'dj1', newPosition: 3, newScore: 55, reason: 'correction after appeal' });

    expect(res.status).toBe(200);
    expect(prismaMock().rankingHistory.create).toHaveBeenCalledTimes(1);
    const historyData = prismaMock().rankingHistory.create.mock.calls[0][0].data;
    expect(historyData.djId).toBe('dj1');
    expect(historyData.week).toBeInstanceOf(Date);
    expect(Number.isNaN(historyData.week.getTime())).toBe(false);
  });

  it('logs (does not silently swallow) a RankingHistory insert failure', async () => {
    prismaMock().rankingHistory.create.mockRejectedValue(new Error('unique constraint'));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logger = require('../utils/logger');

    const res = await request(app)
      .post('/api/moderator/rankings/adjust')
      .set(auth('moderator-1'))
      .send({ djId: 'dj1', newPosition: 3, reason: 'correction after appeal' });

    // The adjustment itself still succeeds; only the history write failed.
    expect(res.status).toBe(200);
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('C4: admin hall-of-fame toggle accepts an absolute value (idempotent retry)', () => {
  let app: express.Application;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authMiddleware } = require('../middleware/auth');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const adminRoutes = require('../routes/admin');

    app = express();
    app.use(express.json());
    app.use('/api/admin', authMiddleware, adminRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock().user.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(users[where.id] || null)
    );
    prismaMock().djProfile.findUnique.mockResolvedValue({ id: 'dj1', hallOfFame: false, stageName: 'DJ One' });
    prismaMock().djProfile.update.mockImplementation(({ where, data }: any) =>
      Promise.resolve({ id: where.id, hallOfFame: data.hallOfFame, stageName: 'DJ One' })
    );
    prismaMock().mix.findUnique.mockResolvedValue({ id: 'mix1', hallOfFame: true, title: 'Hot Mix' });
    prismaMock().mix.update.mockImplementation(({ where, data }: any) =>
      Promise.resolve({ id: where.id, hallOfFame: data.hallOfFame, title: 'Hot Mix' })
    );
  });

  it('sets an absolute hallOfFame value when the body provides one (DJ)', async () => {
    // DJ currently NOT in HoF; explicit value true → set true.
    const res = await request(app)
      .put('/api/admin/djs/dj1/hall-of-fame')
      .set(auth('admin-1'))
      .send({ value: true });

    expect(res.status).toBe(200);
    expect(res.body.data.hallOfFame).toBe(true);
    expect(prismaMock().djProfile.update).toHaveBeenCalledWith({
      where: { id: 'dj1' },
      data: { hallOfFame: true },
    });
  });

  it('retried PUT with the same value does not flip state back (DJ)', async () => {
    // Simulate a retry of the same request: value stays true even though the
    // stored row (stale read) still says hallOfFame: false.
    await request(app).put('/api/admin/djs/dj1/hall-of-fame').set(auth('admin-1')).send({ value: true });
    const retry = await request(app)
      .put('/api/admin/djs/dj1/hall-of-fame')
      .set(auth('admin-1'))
      .send({ value: true });

    expect(retry.status).toBe(200);
    expect(prismaMock().djProfile.update).toHaveBeenLastCalledWith({
      where: { id: 'dj1' },
      data: { hallOfFame: true },
    });
  });

  it('falls back to the legacy toggle when no value is provided (Mix)', async () => {
    // Mix currently IN HoF; no body → toggle to false.
    const res = await request(app)
      .put('/api/admin/mixes/mix1/hall-of-fame')
      .set(auth('admin-1'));

    expect(res.status).toBe(200);
    expect(res.body.data.hallOfFame).toBe(false);
    expect(prismaMock().mix.update).toHaveBeenCalledWith({
      where: { id: 'mix1' },
      data: { hallOfFame: false },
    });
  });

  it('rejects a non-boolean value with 400 (Mix)', async () => {
    const res = await request(app)
      .put('/api/admin/mixes/mix1/hall-of-fame')
      .set(auth('admin-1'))
      .send({ value: 'yes' });

    expect(res.status).toBe(400);
    expect(prismaMock().mix.update).not.toHaveBeenCalled();
  });
});

describe('C5 + C6: ticketing export bound and dashboard destructuring fixed', () => {
  let app: express.Application;
  const eventId = 'evt-1';

  const fakeEvent = {
    id: eventId,
    title: 'Test Event',
    djId: 'owner-dj',
    capacity: 100,
    totalTickets: null,
    onsiteUsername: 'staff',
    onsitePassword: '$2a$12$hashedstaffpassword',
    ticketTypes: [],
  };

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authMiddleware } = require('../middleware/auth');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const eventTicketingRoutes = require('../routes/eventTicketing');

    app = express();
    app.use(express.json());
    app.use('/api/events/:id/ticketing', authMiddleware, eventTicketingRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const p = prismaMock();

    p.user.findUnique.mockImplementation(({ where }: any) => Promise.resolve(users[where.id] || null));
    p.djProfile.findUnique.mockImplementation(({ where }: any) => {
      if (where.userId === 'owner-user') {
        return Promise.resolve({ id: 'owner-dj', subscriptionTier: 'pro', subscriptionExpiresAt: null });
      }
      return Promise.resolve(null);
    });
    p.event.findUnique.mockResolvedValue(fakeEvent);
    p.eventTicket.count.mockResolvedValue(0);
    p.eventTicket.aggregate.mockResolvedValue({ _sum: { quantity: 0, amount: 0 } });
    p.eventTicket.groupBy.mockResolvedValue([]);
    p.eventTicket.findMany.mockResolvedValue([]);
    p.eventTicketType.findMany.mockResolvedValue([]);
    p.eventScanLog.count.mockResolvedValue(0);
  });

  it('C5: customers export bounds findMany with take: 10000', async () => {
    const res = await request(app)
      .get(`/api/events/${eventId}/ticketing/customers/export`)
      .set(auth('owner-user'));

    expect(res.status).toBe(200);
    expect(prismaMock().eventTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10000 })
    );
  });

  it('C5: export prefixes formulas hidden behind leading whitespace', async () => {
    prismaMock().eventTicket.findMany.mockResolvedValue([
      {
        ticketNumber: 'DS-AAAAAA-BBBBBB',
        ticketType: { name: 'GA' },
        buyerName: ' =HYPERLINK("http://evil.example","click")',
        buyerEmail: 'g1@example.com',
        buyerPhone: '\t=1+1',
        quantity: 1,
        amount: 10,
        currency: 'SLE',
        status: 'approved',
        paymentStatus: 'paid',
        createdAt: new Date('2026-09-01T00:00:00Z'),
        approvedAt: null,
        scannedAt: null,
        notes: '',
        user: null,
      },
    ]);

    const res = await request(app)
      .get(`/api/events/${eventId}/ticketing/customers/export`)
      .set(auth('owner-user'));

    expect(res.status).toBe(200);
    expect(res.text).toContain(`' =HYPERLINK(`);
    expect(res.text).toContain(`'\t=1+1`);
  });

  it('C6: dashboard builds its response without throwing (12 queries, 12 names)', async () => {
    const p = prismaMock();
    p.eventTicket.count
      .mockResolvedValueOnce(10)  // total
      .mockResolvedValueOnce(1)   // pending
      .mockResolvedValueOnce(7)   // approved
      .mockResolvedValueOnce(4)   // checked_in
      .mockResolvedValueOnce(0)   // rejected
      .mockResolvedValueOnce(0);  // cancelled
    p.eventTicket.aggregate
      .mockResolvedValueOnce({ _sum: { quantity: 8 } })   // soldSeats
      .mockResolvedValueOnce({ _sum: { quantity: 4 } })   // checkedInSeats
      .mockResolvedValueOnce({ _sum: { amount: 800 } });  // revenue
    // Scan-log count is now a real number in its own slot (previously it
    // landed in `typeBreakdown` and broke `.map`).
    p.eventScanLog.count.mockResolvedValue(4);
    p.eventTicket.groupBy.mockResolvedValue([
      { ticketTypeId: 'tt1', _count: { id: 2 }, _sum: { quantity: 2, amount: 200 } },
    ]);
    p.eventTicket.findMany.mockResolvedValue([{ id: 't1' }]);
    p.eventTicketType.findMany.mockResolvedValue([{ id: 'tt1', name: 'VIP' }]);

    const res = await request(app)
      .get(`/api/events/${eventId}/ticketing/dashboard`)
      .set(auth('owner-user'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toMatchObject({
      totalRevenue: 800,
      ticketsSold: 8,
      pending: 1,
      approved: 7,
      checkedIn: 4,
      capacity: 100,
    });
    // typeBreakdown receives the grouped query result, not the scan-log count
    expect(Array.isArray(res.body.data.typeBreakdown)).toBe(true);
    expect(res.body.data.typeBreakdown).toHaveLength(1);
    expect(res.body.data.typeBreakdown[0].ticketType.name).toBe('VIP');
    expect(res.body.data.recentSales).toEqual([{ id: 't1' }]);
    expect(res.body.data.totalTickets).toBe(10);
  });
});
