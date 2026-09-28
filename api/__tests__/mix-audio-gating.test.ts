/**
 * Regression tests for UPL-1, UPL-2, UPL-8.
 *
 * UPL-1 (CRITICAL): paid/exclusive mix bytes must not be fetchable via public
 *   static /uploads/mixes/*; local audio only flows through the authorized
 *   GET /api/mixes/:id/audio endpoint, and API responses hand out that
 *   endpoint URL instead of raw local paths.
 * UPL-2 (HIGH): /uploads documents/, subscription-proofs/, tickets/ are behind
 *   a staff JWT gate; mixes/ is no longer statically served at all.
 * UPL-8 (MEDIUM): POST /api/mixes/:id/download no longer leaks directAudioUrl.
 */
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mix-audio-test-'));
fs.mkdirSync(path.join(uploadsDir, 'mixes'), { recursive: true });
fs.writeFileSync(path.join(uploadsDir, 'mixes', 'a1.mp3'), 'fake-mp3-bytes');
process.env.UPLOADS_DIR = uploadsDir;

jest.mock('../utils/prisma', () => ({
  ...(jest.requireActual('../utils/prisma') as object),
  prisma: {
    mix: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    mixRepost: { findUnique: jest.fn() },
    mixLike: { findMany: jest.fn() },
    follow: { findUnique: jest.fn() },
    djProfile: { findFirst: jest.fn() },
    eventTicket: { findFirst: jest.fn() },
  },
}));

jest.mock('../utils/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  clearCache: jest.fn(),
  withCache: jest.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
}));

jest.mock('../utils/cache', () => ({
  withCache: jest.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  clearCache: jest.fn(),
}));

jest.mock('../utils/rateLimiter', () => ({
  playLimiter: (req: any, res: any, next: any) => next(),
  conditionalSearchLimiter: (req: any, res: any, next: any) => next(),
  uploadLimiter: (req: any, res: any, next: any) => next(),
  audioLimiter: (req: any, res: any, next: any) => next(),
}));

jest.mock('../utils/monthlyListeners', () => ({
  recordMixPlay: jest.fn(),
  recalculateMonthlyListeners: jest.fn(),
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
  // mixes.ts passes uploadMix directly as route middleware
  uploadMix: passthrough,
  uploadMixAudio: { single: () => passthrough },
  uploadMixCover: { single: () => passthrough },
  extFromMime: jest.fn(),
}));

describe('Mix audio gating (UPL-1 / UPL-2 / UPL-8)', () => {
  let app: express.Application;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock = () => require('../utils/prisma').prisma as any;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { signToken } = require('../utils/jwt');

  const djUserId = 'dj-user-1';

  const localMix = {
    id: 'mix-local',
    title: 'Local Mix',
    isPublic: true,
    isExclusive: false,
    audioUrl: '/uploads/mixes/a1.mp3',
    dj: { id: 'dj1', userId: djUserId, stageName: 'DJ One', subscriptionTier: 'free' },
  };
  const externalMix = {
    id: 'mix-ext',
    title: 'External Mix',
    isPublic: true,
    isExclusive: false,
    audioUrl: 'https://soundcloud.com/artist/track',
    dj: { id: 'dj2', userId: 'dj-user-2', stageName: 'DJ Two', subscriptionTier: 'free' },
  };
  const exclusiveMix = {
    id: 'mix-exclusive',
    title: 'Exclusive Mix',
    isPublic: true,
    isExclusive: true,
    allowPublicDownloads: false,
    repostToDownload: false,
    followToDownload: false,
    audioUrl: '/uploads/mixes/a1.mp3',
    dj: { id: 'dj1', userId: djUserId, stageName: 'DJ One', subscriptionTier: 'pro' },
  };

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mixRoutes = require('../routes/mixes');
    app = express();
    app.use(express.json());
    app.use('/api/mixes', mixRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock().user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === djUserId) {
        return Promise.resolve({ id: djUserId, role: 'DJ', status: 'ACTIVE' });
      }
      return Promise.resolve(null);
    });
  });

  describe('UPL-1: API responses rewrite local audio URLs', () => {
    it('GET /api/mixes rewrites local audioUrl, keeps external URLs, hides raw /uploads paths', async () => {
      prismaMock().mix.findMany.mockResolvedValue([localMix, externalMix, exclusiveMix]);
      prismaMock().mix.count.mockResolvedValue(3);

      const res = await request(app).get('/api/mixes');
      expect(res.status).toBe(200);

      const byId = Object.fromEntries(res.body.data.map((m: any) => [m.id, m.audioUrl]));
      expect(byId['mix-local']).toBe('/api/mixes/mix-local/audio');
      expect(byId['mix-ext']).toBe('https://soundcloud.com/artist/track');
      expect(byId['mix-exclusive']).toBe('/api/mixes/mix-exclusive/audio');

      // Raw local paths must not appear anywhere in the response
      expect(JSON.stringify(res.body)).not.toContain('/uploads/');
    });

    it('GET /api/mixes/:id rewrites a local audioUrl', async () => {
      prismaMock().mix.findFirst.mockResolvedValue(localMix);
      const res = await request(app).get('/api/mixes/mix-local');
      expect(res.status).toBe(200);
      expect(res.body.data.audioUrl).toBe('/api/mixes/mix-local/audio');
    });

    it('GET /api/mixes/by-slug/:dj/:slug rewrites a local audioUrl', async () => {
      // by-slug first looks up the DJ; fall through to the global fallback.
      const p = prismaMock();
      p.djProfile.findFirst.mockResolvedValue(null);
      p.mix.findFirst.mockResolvedValue(localMix);

      const res = await request(app).get('/api/mixes/by-slug/dj-one/local-mix');
      expect(res.status).toBe(200);
      expect(res.body.data.audioUrl).toBe('/api/mixes/mix-local/audio');
    });
  });

  describe('UPL-1: GET /api/mixes/:id/audio authorized streaming', () => {
    it('streams a public non-exclusive local mix anonymously with the file bytes', async () => {
      prismaMock().mix.findUnique.mockResolvedValue(localMix);
      const res = await request(app).get('/api/mixes/mix-local/audio');
      expect(res.status).toBe(200);
      expect(Buffer.from(res.body).toString()).toBe('fake-mp3-bytes');
    });

    it('returns 403 (not 404) for an exclusive mix when anonymous', async () => {
      prismaMock().mix.findUnique.mockResolvedValue(exclusiveMix);
      const res = await request(app).get('/api/mixes/mix-exclusive/audio');
      expect(res.status).toBe(403);
    });

    it('streams an exclusive mix for its owner', async () => {
      prismaMock().mix.findUnique.mockResolvedValue(exclusiveMix);
      const token = signToken({ id: djUserId, role: 'DJ' });
      const res = await request(app)
        .get('/api/mixes/mix-exclusive/audio')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Buffer.from(res.body).toString()).toBe('fake-mp3-bytes');
    });

    it('streams an exclusive mix for a subscribed (USER-role) listener via ?token=', async () => {
      prismaMock().mix.findUnique.mockResolvedValue(exclusiveMix);
      prismaMock().user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === 'listener-1') {
          return Promise.resolve({ id: 'listener-1', role: 'USER', status: 'ACTIVE' });
        }
        return Promise.resolve(null);
      });
      const token = signToken({ id: 'listener-1', role: 'USER' });
      // <audio> elements cannot send Authorization headers — query token path.
      const res = await request(app).get(`/api/mixes/mix-exclusive/audio?token=${token}`);
      expect(res.status).toBe(200);
      expect(Buffer.from(res.body).toString()).toBe('fake-mp3-bytes');
    });

    it('returns 404 for a missing mix and honors the exclusive checkDownloadAccess predicate', async () => {
      prismaMock().mix.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/api/mixes/does-not-exist/audio');
      expect(res.status).toBe(404);
    });

    it('302-redirects external audio URLs instead of proxying them', async () => {
      prismaMock().mix.findUnique.mockResolvedValue(externalMix);
      const res = await request(app).get('/api/mixes/mix-ext/audio');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://soundcloud.com/artist/track');
    });

    it('AUTH-1 residual: ?token= with a stale tokenVersion is rejected (401)', async () => {
      prismaMock().mix.findUnique.mockResolvedValue(localMix);
      // User bumped to tokenVersion 1 after a password change; the old token
      // still carries tokenVersion 0.
      prismaMock().user.findUnique.mockResolvedValue({ id: 'listener-1', role: 'USER', status: 'ACTIVE', tokenVersion: 1 });
      const staleToken = signToken({ id: 'listener-1', role: 'USER', tokenVersion: 0 });

      const res = await request(app).get(`/api/mixes/mix-local/audio?token=${staleToken}`);
      expect(res.status).toBe(401);
    });

    it('AUTH-1 residual: ?token= with a matching tokenVersion still streams', async () => {
      prismaMock().mix.findUnique.mockResolvedValue(localMix);
      prismaMock().user.findUnique.mockResolvedValue({ id: 'listener-1', role: 'USER', status: 'ACTIVE', tokenVersion: 1 });
      const token = signToken({ id: 'listener-1', role: 'USER', tokenVersion: 1 });

      const res = await request(app).get(`/api/mixes/mix-local/audio?token=${token}`);
      expect(res.status).toBe(200);
      expect(Buffer.from(res.body).toString()).toBe('fake-mp3-bytes');
    });
  });

  describe('UPL-8: POST /api/mixes/:id/download response shape', () => {
    it('returns downloadUrl + downloads but no directAudioUrl', async () => {
      const downloadable = { ...localMix, allowPublicDownloads: true };
      prismaMock().mix.findUnique.mockResolvedValue(downloadable);
      prismaMock().mix.update.mockResolvedValue({ id: 'mix-local', downloads: 42, title: 'Local Mix' });

      const res = await request(app).post('/api/mixes/mix-local/download');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.downloadUrl).toBe('/api/mixes/mix-local/download-file');
      expect(res.body.downloads).toBe(42);
      expect(res.body.directAudioUrl).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('/uploads/');
    });
  });

  describe('UPL-2: gated static uploads middleware', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { gatedUploadsAuth } = jest.requireActual('../utils/upload');

    const runGate = async (reqPath: string, user?: { id: string; role: string; tokenVersion?: number }) => {
      const token = user ? signToken(user) : undefined;
      const req: any = {
        path: reqPath,
        headers: token ? { authorization: `Bearer ${token}` } : {},
        query: {},
      };
      const res: any = {
        statusCode: 0,
        status(code: number) { this.statusCode = code; return this; },
        json() { return this; },
        end() { return this; },
        setHeader() { return this; },
      };
      let nextCalled = false;
      await gatedUploadsAuth(req, res, () => { nextCalled = true; });
      return { statusCode: res.statusCode, nextCalled };
    };

    it('refuses to statically serve mixes/ at all (404)', async () => {
      const { statusCode, nextCalled } = await runGate('/mixes/a1.mp3');
      expect(statusCode).toBe(404);
      expect(nextCalled).toBe(false);
    });

    it('returns 401 for subscription-proofs without a token', async () => {
      const { statusCode, nextCalled } = await runGate('/subscription-proofs/proof.png');
      expect(statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    it('returns 403 for an authenticated non-staff user on documents/', async () => {
      prismaMock().user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER', status: 'ACTIVE' });
      const { statusCode, nextCalled } = await runGate('/documents/id.pdf', { id: 'u1', role: 'USER' });
      expect(statusCode).toBe(403);
      expect(nextCalled).toBe(false);
    });

    it('allows FINANCE_ADMIN to view subscription-proofs/', async () => {
      prismaMock().user.findUnique.mockResolvedValue({ id: 'fin1', role: 'FINANCE_ADMIN', status: 'ACTIVE' });
      const { statusCode, nextCalled } = await runGate('/subscription-proofs/proof.png', { id: 'fin1', role: 'FINANCE_ADMIN' });
      expect(statusCode).toBe(0);
      expect(nextCalled).toBe(true);
    });

    it('AUTH-1 residual: rejects a staff token whose tokenVersion is stale (401)', async () => {
      // User was revoked (tokenVersion bumped to 2); the old token carries 1.
      prismaMock().user.findUnique.mockResolvedValue({ id: 'fin1', role: 'FINANCE_ADMIN', status: 'ACTIVE', tokenVersion: 2 });
      const { statusCode, nextCalled } = await runGate('/subscription-proofs/proof.png', { id: 'fin1', role: 'FINANCE_ADMIN', tokenVersion: 1 });
      expect(statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    it('allows the buyer of a ticket to view their payment screenshot in tickets/', async () => {
      prismaMock().user.findUnique.mockResolvedValue({ id: 'buyer-1', role: 'USER', status: 'ACTIVE' });
      prismaMock().eventTicket.findFirst.mockResolvedValue({
        userId: 'buyer-1',
        event: { dj: { userId: 'organizer-1' } },
      });
      const { statusCode, nextCalled } = await runGate('/tickets/abc.png', { id: 'buyer-1', role: 'USER' });
      expect(statusCode).toBe(0);
      expect(nextCalled).toBe(true);
    });

    it('allows the event organizer (DJ) to view a ticket payment screenshot', async () => {
      prismaMock().user.findUnique.mockResolvedValue({ id: 'organizer-1', role: 'DJ', status: 'ACTIVE' });
      prismaMock().eventTicket.findFirst.mockResolvedValue({
        userId: 'buyer-1',
        event: { dj: { userId: 'organizer-1' } },
      });
      const { statusCode, nextCalled } = await runGate('/tickets/abc.png', { id: 'organizer-1', role: 'DJ' });
      expect(statusCode).toBe(0);
      expect(nextCalled).toBe(true);
    });

    it('keeps public folders (avatars/) ungated', async () => {
      const { statusCode, nextCalled } = await runGate('/avatars/x.webp');
      expect(statusCode).toBe(0);
      expect(nextCalled).toBe(true);
    });
  });
});
