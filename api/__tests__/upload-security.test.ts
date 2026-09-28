/**
 * Regression tests for UPL-3, UPL-4, UPL-10, INFRA-5.
 *
 * UPL-3:  arbitrary file deletion via deleteFile path traversal + unsanitized avatar
 * UPL-4/INFRA-5: SSRF in /api/proxy-image (host allowlist, private-IP block)
 * UPL-10: separator-aware containment in mixes download-file
 */
import request from 'supertest';
import express from 'express';
import fs from 'fs';

// Ensure deterministic local-storage mode for utils/storage
delete process.env.S3_ENDPOINT;
delete process.env.S3_BUCKET;
delete process.env.S3_ACCESS_KEY_ID;
delete process.env.S3_SECRET_ACCESS_KEY;

// Mock DNS so assertSafeProxyUrl can be tested without real network lookups
jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    djProfile: {
      updateMany: jest.fn(),
    },
  },
}));

describe('Upload security (UPL-3 / UPL-4 / UPL-10 / INFRA-5)', () => {
  describe('storage.keyFromUrl / deleteFile traversal rejection', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storage = require('../utils/storage');
    const unlinkSpy = jest.spyOn(fs.promises, 'unlink');

    beforeEach(() => {
      unlinkSpy.mockClear();
      unlinkSpy.mockResolvedValue(undefined as never);
    });

    it('rejects /uploads/../../.env — keyFromUrl returns null, no unlink performed', async () => {
      expect(storage.keyFromUrl('/uploads/../../.env')).toBeNull();
      await storage.deleteFile('/uploads/../../.env');
      expect(unlinkSpy).not.toHaveBeenCalled();
    });

    it('rejects ../avatars/x.webp style traversal — no unlink performed', async () => {
      expect(storage.keyFromUrl('/uploads/../avatars/x.webp')).toBeNull();
      expect(storage.keyFromUrl('/uploads/avatars/../../.env')).toBeNull();
      await storage.deleteFile('/uploads/../avatars/x.webp');
      expect(unlinkSpy).not.toHaveBeenCalled();
    });

    it('rejects backslash traversal variants', async () => {
      expect(storage.keyFromUrl('/uploads/..\\..\\.env')).toBeNull();
      expect(storage.keyFromUrl('/uploads/avatars\\..\\..\\.env')).toBeNull();
    });

    it('still deletes a legit /uploads/avatars/uuid.webp file', async () => {
      const key = storage.keyFromUrl('/uploads/avatars/11111111-2222-3333-4444-555555555555.webp');
      expect(key).toBe('avatars/11111111-2222-3333-4444-555555555555.webp');
      await storage.deleteFile('/uploads/avatars/11111111-2222-3333-4444-555555555555.webp');
      expect(unlinkSpy).toHaveBeenCalledTimes(1);
      const dest = unlinkSpy.mock.calls[0][0] as string;
      expect(dest).toContain('uploads');
      expect(dest).toContain('avatars');
      expect(pathWithinUploads(dest)).toBe(true);
    });

    it('isSafeUploadUrl accepts https URLs and contained /uploads/ paths', () => {
      expect(storage.isSafeUploadUrl('https://decksalone.com/avatars/x.webp')).toBe(true);
      expect(storage.isSafeUploadUrl('/uploads/avatars/uuid.webp')).toBe(true);
    });

    it('isSafeUploadUrl rejects traversal paths, other protocols and junk', () => {
      expect(storage.isSafeUploadUrl('/uploads/../../.env')).toBe(false);
      expect(storage.isSafeUploadUrl('/uploads/../avatars/x.webp')).toBe(false);
      expect(storage.isSafeUploadUrl('file:///etc/passwd')).toBe(false);
      expect(storage.isSafeUploadUrl('javascript:alert(1)')).toBe(false);
      expect(storage.isSafeUploadUrl('relative/path.webp')).toBe(false);
      expect(storage.isSafeUploadUrl('')).toBe(false);
    });

    function pathWithinUploads(p: string): boolean {
      const path = require('path');
      const root = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
      return path.resolve(p).startsWith(root + path.sep);
    }
  });

  describe('profile update avatar validation (UPL-3)', () => {
    let app: express.Application;
    let token: string;

    beforeAll(() => {
      process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { prisma } = require('../utils/prisma');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { signToken } = require('../utils/jwt');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const userRoutes = require('../routes/users');

      const userId = 'test-user-avatar-' + Date.now();
      token = signToken({ id: userId, email: 'avatar@example.com', role: 'USER' });

      prisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        where.id === userId
          ? Promise.resolve({ id: userId, email: 'avatar@example.com', role: 'USER', status: 'ACTIVE' })
          : Promise.resolve(null)
      );
      prisma.user.update.mockResolvedValue({
        id: userId,
        email: 'avatar@example.com',
        username: null,
        name: null,
        bio: null,
        location: null,
        gender: null,
        dateOfBirth: null,
        avatar: '/uploads/avatars/uuid.webp',
        favoriteGenres: [],
        socialLinks: {},
        role: 'USER',
      });
      prisma.djProfile.updateMany.mockResolvedValue({ count: 0 });

      app = express();
      app.use(express.json());
      app.use('/api/users', userRoutes);
    });

    it('returns 400 for avatar=/uploads/../../.env', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatar: '/uploads/../../.env' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for avatar=https://evil.example/x.png (not an allowed form)', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatar: 'https://evil.example/x.png' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('accepts a contained /uploads/ avatar path', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatar: '/uploads/avatars/uuid.webp' });
      expect(res.status).toBe(200);
    });

    it('accepts an absolute https avatar URL', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatar: 'https://decksalone.com/avatars/uuid.webp' });
      expect(res.status).toBe(200);
    });
  });

  describe('image proxy helpers (UPL-4 / INFRA-5)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const imageProxy = require('../utils/imageProxy');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { lookup } = require('dns').promises;

    describe('isAllowedProxyHost', () => {
      it('allows decksalone.com and its subdomains', () => {
        expect(imageProxy.isAllowedProxyHost('decksalone.com')).toBe(true);
        expect(imageProxy.isAllowedProxyHost('www.decksalone.com')).toBe(true);
        expect(imageProxy.isAllowedProxyHost('api.decksalone.com')).toBe(true);
        expect(imageProxy.isAllowedProxyHost('cdn.decksalone.com')).toBe(true);
      });

      it('allows known DJ-platform/CDN hosts', () => {
        expect(imageProxy.isAllowedProxyHost('i1.sndcdn.com')).toBe(true);
        expect(imageProxy.isAllowedProxyHost('res.cloudinary.com')).toBe(true);
      });

      it('rejects unknown hosts', () => {
        expect(imageProxy.isAllowedProxyHost('evil.example')).toBe(false);
        expect(imageProxy.isAllowedProxyHost('169.254.169.254')).toBe(false);
        expect(imageProxy.isAllowedProxyHost('')).toBe(false);
      });
    });

    describe('isPrivateIp', () => {
      it.each([
        ['127.0.0.1'], ['127.1.2.3'], ['10.0.0.1'], ['10.255.255.255'],
        ['172.16.0.1'], ['172.31.255.255'], ['192.168.1.1'],
        ['169.254.169.254'], ['0.0.0.0'],
      ])('blocks private/loopback/link-local IPv4 %s', (ip) => {
        expect(imageProxy.isPrivateIp(ip)).toBe(true);
      });

      it.each([
        ['172.32.0.1'], ['192.167.1.1'], ['11.0.0.1'], ['8.8.8.8'], ['1.2.3.4'],
      ])('allows public IPv4 %s', (ip) => {
        expect(imageProxy.isPrivateIp(ip)).toBe(false);
      });

      it.each([['::1'], ['::'], ['fe80::1'], ['fd00::1'], ['fc00::1'], ['::ffff:127.0.0.1'], ['::ffff:10.0.0.1']])(
        'blocks loopback/link-local/ULA/mapped IPv6 %s',
        (ip) => {
          expect(imageProxy.isPrivateIp(ip)).toBe(true);
        }
      );

      it.each([['2001:db8::1'], ['2606:4700::1111']])('allows public IPv6 %s', (ip) => {
        expect(imageProxy.isPrivateIp(ip)).toBe(false);
      });
    });

    describe('assertSafeProxyUrl', () => {
      beforeEach(() => {
        lookup.mockReset();
      });

      it('rejects http://169.254.169.254/latest/meta-data/ (cloud metadata)', async () => {
        await expect(
          imageProxy.assertSafeProxyUrl('http://169.254.169.254/latest/meta-data/')
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(lookup).not.toHaveBeenCalled();
      });

      it('rejects https://evil.example/x.png (host not allowlisted)', async () => {
        await expect(imageProxy.assertSafeProxyUrl('https://evil.example/x.png')).rejects.toMatchObject({
          statusCode: 400,
        });
        expect(lookup).not.toHaveBeenCalled();
      });

      it('rejects allowlisted host that resolves to a private IP', async () => {
        lookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);
        await expect(imageProxy.assertSafeProxyUrl('https://decksalone.com/cover.webp')).rejects.toMatchObject({
          statusCode: 400,
        });
      });

      it('passes for allowlisted host resolving to a public IP (https://decksalone.com/cover.webp)', async () => {
        lookup.mockResolvedValue([{ address: '104.21.5.6', family: 4 }]);
        const parsed = await imageProxy.assertSafeProxyUrl('https://decksalone.com/cover.webp');
        expect(parsed.hostname).toBe('decksalone.com');
      });

      it('rejects non-HTTP(S) schemes and malformed URLs', async () => {
        await expect(imageProxy.assertSafeProxyUrl('file:///etc/passwd')).rejects.toMatchObject({ statusCode: 400 });
        await expect(imageProxy.assertSafeProxyUrl('ftp://decksalone.com/x.png')).rejects.toMatchObject({ statusCode: 400 });
        await expect(imageProxy.assertSafeProxyUrl('not a url')).rejects.toMatchObject({ statusCode: 400 });
      });
    });

    it('allows only safe raster image content types (no svg)', () => {
      expect(imageProxy.PROXY_ALLOWED_CONTENT_TYPES.has('image/jpeg')).toBe(true);
      expect(imageProxy.PROXY_ALLOWED_CONTENT_TYPES.has('image/png')).toBe(true);
      expect(imageProxy.PROXY_ALLOWED_CONTENT_TYPES.has('image/webp')).toBe(true);
      expect(imageProxy.PROXY_ALLOWED_CONTENT_TYPES.has('image/svg+xml')).toBe(false);
      expect(imageProxy.PROXY_ALLOWED_CONTENT_TYPES.has('text/html')).toBe(false);
    });
  });
});
