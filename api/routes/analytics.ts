const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../utils/prisma');
const { softAuthMiddleware } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { analyticsVisitLimiter } = require('../utils/rateLimiter');

const router = express.Router();

function hashIp(ip: string | undefined) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

// POST /api/analytics/visit - lightweight public beacon
router.post('/visit', softAuthMiddleware, analyticsVisitLimiter, async (req, res) => {
  try {
    const { path, city, country, referrer } = req.body || {};
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip;

    let visitCity = city || null;
    let visitCountry = country || null;

    if (req.user?.id && !visitCity && !visitCountry) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { location: true, djProfile: { select: { city: true, country: true } } },
      });
      visitCity = user?.djProfile?.city || user?.location || null;
      visitCountry = user?.djProfile?.country || null;
    }

    // SOC-10: cap path length to prevent DB write amplification via oversized values
    const rawPath = path || req.headers.referer || '/';
    if (typeof rawPath !== 'string' || rawPath.length > 500) {
      return fail(res, 400, 'Invalid path');
    }

    await prisma.siteVisit.create({
      data: {
        path: rawPath,
        userId: req.user?.id || null,
        ipHash: hashIp(ip),
        city: visitCity,
        country: visitCountry,
        userAgent: req.headers['user-agent'] || null,
        referrer: referrer || req.headers.referer || null,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[analytics.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
