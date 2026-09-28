import request from 'supertest';
import express from 'express';

jest.mock('../utils/prisma', () => ({
  prisma: {
    event: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    eventRSVP: {
      findUnique: jest.fn(),
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

  const financeUser = {
    id: 'finance-user',
    email: 'finance@example.com',
    role: 'FINANCE_ADMIN',
    status: 'ACTIVE',
    djProfile: null,
  };

  let financeToken: string;

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
    financeToken = signToken({ id: financeUser.id, email: financeUser.email, role: 'FINANCE_ADMIN' });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyToken } = require('../utils/jwt');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const eventTicketingRoutes = require('../routes/eventTicketing');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ticketRoutes = require('../routes/tickets');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const eventRoutes = require('../routes/events');

    app = express();
    app.use(express.json());
    app.use('/api/events/:id/ticketing', eventTicketingRoutes);
    app.use('/api/events/:id/tickets', ticketRoutes);
    // The production mount runs the events router without auth middleware; this
    // shim simulates an authenticated requester (with djProfile attached) so the
    // owner-only branch of GET /api/events/:id is exercised.
    app.use('/api/events', (req: any, _res: any, next: any) => {
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) {
        const decoded = verifyToken(header.split(' ')[1]);
        const id = decoded && typeof decoded === 'object' ? decoded.id : null;
        if (id === ownerUser.id) req.user = ownerUser;
        else if (id === financeUser.id) req.user = financeUser;
      }
      next();
    }, eventRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const p = prismaMock();

    // authMiddleware user lookup + getEventWithAuth/canScanEvent user lookup
    p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === ownerUser.id) return Promise.resolve(ownerUser);
      if (where.id === proUser.id) return Promise.resolve(proUser);
      if (where.id === financeUser.id) return Promise.resolve(financeUser);
      return Promise.resolve(null);
    });

    p.eventRSVP.findUnique.mockResolvedValue(null);

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
    // C6 fix: the /dashboard handler now destructures all 12 Promise.all
    // values, so the scan-log count lands in its own (unused) slot.
    p.eventScanLog.count.mockResolvedValue(0);
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

  describe('ETK-1 residual: event detail never returns the staff password', () => {
    it('owner gets onsitePasswordSet boolean but no onsitePassword', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.onsitePassword).toBeUndefined();
      expect(res.body.data.onsitePasswordSet).toBe(true);
      // Staff username is intentionally retained for the client UI
      expect(res.body.data.onsiteUsername).toBe('staff');
      expect(JSON.stringify(res.body)).not.toContain('$2a$12$');
    });

    it('FINANCE_ADMIN gets neither onsitePassword nor the set boolean', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.onsitePassword).toBeUndefined();
      expect(res.body.data.onsitePasswordSet).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('$2a$12$');
    });
  });

  describe('ETK-2 residual: scan responses redact attendee email for non-privileged scanners', () => {
    const scannedTicket = {
      id: 'tkt-scan-1',
      eventId: 'evt-1',
      ticketNumber: 'DS-SCAN1-000001',
      status: 'approved',
      quantity: 1,
      userId: 'guest-user',
      user: { id: 'guest-user', name: 'Guest One', username: 'guestone', avatar: null, email: 'guest@example.com' },
      ticketType: { name: 'General' },
    };

    it('pro-tier scanner POST /scan gets name but no user.email', async () => {
      const p = prismaMock();
      p.eventTicket.findFirst.mockResolvedValue({ ...scannedTicket });
      p.eventTicket.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post(`/api/events/${eventId}/ticketing/scan`)
        .set('Authorization', `Bearer ${proToken}`)
        .send({ qrPayload: 'DS-SCAN1-000001' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.name).toBe('Guest One');
      expect(res.body.data.user.username).toBe('guestone');
      expect(res.body.data.user.email).toBeUndefined();
    });

    it('event owner POST /scan still gets user.email', async () => {
      const p = prismaMock();
      p.eventTicket.findFirst.mockResolvedValue({ ...scannedTicket });
      p.eventTicket.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post(`/api/events/${eventId}/ticketing/scan`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ qrPayload: 'DS-SCAN1-000001' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('guest@example.com');
    });

    it('pro-tier scanner gets no user.email via the ALREADY_SCANNED 409 body', async () => {
      const p = prismaMock();
      p.eventTicket.findFirst.mockResolvedValue({
        ...scannedTicket,
        status: 'checked_in',
        scannedAt: new Date(),
        checkedInBy: 'owner-user',
      });

      const res = await request(app)
        .post(`/api/events/${eventId}/ticketing/scan`)
        .set('Authorization', `Bearer ${proToken}`)
        .send({ qrPayload: 'DS-SCAN1-000001' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ALREADY_SCANNED');
      expect(res.body.data.ticket.user.name).toBe('Guest One');
      expect(res.body.data.ticket.user.email).toBeUndefined();
    });

    it('pro-tier manual checkin redacts user.email; owner keeps it', async () => {
      const p = prismaMock();
      p.eventTicket.findUnique.mockResolvedValue({ ...scannedTicket });
      p.eventTicket.updateMany.mockResolvedValue({ count: 1 });

      const proRes = await request(app)
        .post(`/api/events/${eventId}/ticketing/scan/tkt-scan-1/checkin`)
        .set('Authorization', `Bearer ${proToken}`);
      expect(proRes.status).toBe(200);
      expect(proRes.body.data.user.name).toBe('Guest One');
      expect(proRes.body.data.user.email).toBeUndefined();

      p.eventTicket.findUnique.mockResolvedValue({ ...scannedTicket });
      const ownerRes = await request(app)
        .post(`/api/events/${eventId}/ticketing/scan/tkt-scan-1/checkin`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.data.user.email).toBe('guest@example.com');
    });
  });

  describe('ETK-2 residual: FINANCE_ADMIN cannot read the guest list', () => {
    it('FINANCE_ADMIN gets 403 from /customers and no ticket rows are read', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}/ticketing/customers`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(403);
      expect(prismaMock().eventTicket.findMany).not.toHaveBeenCalled();
    });

    it('FINANCE_ADMIN gets 403 from /customers/export', async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}/ticketing/customers/export`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(403);
    });

    it('event owner still gets the customer list', async () => {
      const p = prismaMock();
      p.eventTicket.findMany.mockResolvedValue([]);
      p.eventTicket.count.mockResolvedValue(0);

      const res = await request(app)
        .get(`/api/events/${eventId}/ticketing/customers`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(p.eventTicket.findMany).toHaveBeenCalled();
    });
  });
});
