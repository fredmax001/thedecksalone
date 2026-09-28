import request from 'supertest';
import express from 'express';

jest.mock('../utils/prisma', () => ({
  prisma: {
    event: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    djProfile: {
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

describe('Event ticketing security (ETK-1, ETK-2, TKT-3 PII-read)', () => {
  let app: express.Application;
  let ownerToken: string;
  let proToken: string;
  const eventId = 'evt-1';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock = () => require('../utils/prisma').prisma as any;

  const ownerUser = {
    id: 'owner-user',
    email: 'owner@example.com',
    role: 'DJ',
    status: 'ACTIVE',
    djProfile: { id: 'owner-dj', subscriptionTier: 'pro' },
  };

  const proUser = {
    id: 'pro-user',
    email: 'pro@example.com',
    role: 'DJ',
    status: 'ACTIVE',
    djProfile: { id: 'pro-dj', subscriptionTier: 'pro' },
  };

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
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signToken } = require('../utils/jwt');
    ownerToken = signToken({ id: ownerUser.id, email: ownerUser.email, role: 'DJ' });
    proToken = signToken({ id: proUser.id, email: proUser.email, role: 'DJ' });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const eventTicketingRoutes = require('../routes/eventTicketing');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ticketRoutes = require('../routes/tickets');

    app = express();
    app.use(express.json());
    app.use('/api/events/:id/ticketing', eventTicketingRoutes);
    app.use('/api/events/:id/tickets', ticketRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const p = prismaMock();

    // authMiddleware user lookup + getEventWithAuth/canScanEvent user lookup
    p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === ownerUser.id) return Promise.resolve(ownerUser);
      if (where.id === proUser.id) return Promise.resolve(proUser);
      return Promise.resolve(null);
    });

    // requireProOrAdmin subscription lookup (getUserSubscription: where userId)
    p.djProfile.findUnique.mockImplementation(({ where }: { where: { userId?: string } }) => {
      if (where.userId === ownerUser.id) {
        return Promise.resolve({ id: 'owner-dj', subscriptionTier: 'pro', subscriptionExpiresAt: null });
      }
      if (where.userId === proUser.id) {
        return Promise.resolve({ id: 'pro-dj', subscriptionTier: 'pro', subscriptionExpiresAt: null });
      }
      return Promise.resolve(null);
    });

    p.event.findUnique.mockResolvedValue(fakeEvent);

    // Dashboard aggregations
    p.eventTicket.count.mockResolvedValue(0);
    p.eventTicket.aggregate.mockResolvedValue({ _sum: { quantity: 0, amount: 0 } });
    p.eventTicket.groupBy.mockResolvedValue([]);
    p.eventTicket.findMany.mockResolvedValue([]);
    // NOTE: the /dashboard handler destructures 12 Promise.all values into 11
    // names (pre-existing off-by-one), so the scan-log count lands in the
    // `typeBreakdown` slot and must be array-like for `.map` to survive.
    p.eventScanLog.count.mockResolvedValue([] as unknown as number);
    p.eventTicketType.findMany.mockResolvedValue([]);
  });

  describe('ETK-1: staff password hash never leaves the API', () => {
    it('GET /ticketing/dashboard omits onsitePassword from the event object', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}/ticketing/dashboard`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.event).toBeDefined();
      expect(res.body.data.event.onsitePassword).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('onsitePassword');
      expect(JSON.stringify(res.body)).not.toContain('$2a$12$');
      // Staff username is intentionally retained for the client UI
      expect(res.body.data.event.onsiteUsername).toBe('staff');
    });

    it('GET /ticketing/onsite/dashboard omits onsitePassword from the event object', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}/ticketing/onsite/dashboard`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.event).toBeDefined();
      expect(res.body.data.event.onsitePassword).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('$2a$12$');
    });
  });

  describe('ETK-2: guest-list reads are owner/staff/admin only', () => {
    it('Pro-tier DJ who is not the owner gets 403 from /onsite/guests', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}/ticketing/onsite/guests`)
        .set('Authorization', `Bearer ${proToken}`);

      expect(res.status).toBe(403);
      expect(prismaMock().eventTicket.findMany).not.toHaveBeenCalled();
    });

    it('Pro-tier DJ who is not the owner gets 403 from /onsite/dashboard', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}/ticketing/onsite/dashboard`)
        .set('Authorization', `Bearer ${proToken}`);

      expect(res.status).toBe(403);
    });

    it('event owner still gets their guest list (happy path)', async () => {
      const p = prismaMock();
      p.eventTicket.findMany.mockResolvedValue([
        {
          id: 'tkt-1',
          ticketNumber: 'DS-AAAAAA-BBBBBB',
          status: 'approved',
          buyerName: 'Guest One',
          user: { id: 'guest-user', name: 'Guest One', username: 'guestone', avatar: null, email: 'guest@example.com', phone: '232000000' },
          ticketType: { id: 'tt-1', name: 'General', price: 50, currency: 'SLE' },
          scanLogs: [],
        },
      ]);
      p.eventTicket.count.mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/events/${eventId}/ticketing/onsite/guests`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].user.email).toBe('guest@example.com');
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('TKT-3 (PII-read part): legacy scan endpoint drops the Pro+ shortcut', () => {
    it('Pro-tier DJ who is not the owner gets 403 from legacy POST /tickets/scan', async () => {
      const res = await request(app)
        .post(`/api/events/${eventId}/tickets/scan`)
        .set('Authorization', `Bearer ${proToken}`)
        .send({ qrCode: 'DS-AAAAAA-BBBBBB' });

      expect(res.status).toBe(403);
    });
  });
});
