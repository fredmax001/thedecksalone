const express = require('express');
const { z } = require('zod');
const { prisma, DJ_PUBLIC_SELECT } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { uploadEventImage, extFromMime } = require('../utils/upload');
const { uploadBuffer, deleteFile } = require('../utils/storage');
const { ok, fail } = require('../utils/response');

const router = express.Router();

// ─── PUBLIC: Home Ad Board — active paid ads + top 3 spotlights ───
// No auth required, called by HomeAdBoard carousel on the homepage
router.get('/home-board', async (req: any, res: any) => {
  try {
    const now = new Date();

    // Active paid ad campaigns
    const paidAds = await prisma.adCampaign.findMany({
      where: {
        status: 'active',
        OR: [
          { endDate: null },
          { endDate: { gt: now } },
        ],
      },
      include: {
        advertiser: {
          select: DJ_PUBLIC_SELECT,
        },
      },
      orderBy: { budget: 'desc' },
      take: 5,
    });

    // Top 3 upcoming published events
    const events = await prisma.event.findMany({
      where: {
        date: { gte: now },
        publishStatus: 'published',
      },
      include: {
        dj: { select: DJ_PUBLIC_SELECT },
      },
      orderBy: { date: 'asc' },
      take: 3,
    });

    // Top 3 ranked DJs (include user for username/slug)
    const djRankings = await prisma.djProfile.findMany({
      where: { rankingPosition: { gt: 0 }, isPublic: true },
      orderBy: { rankingPosition: 'asc' },
      include: {
        user: { select: { username: true } },
      },
      take: 3,
    });

    // Top trending mixes by plays (up to 10 for home carousel)
    const mixes = await prisma.mix.findMany({
      where: { isPublic: true },
      orderBy: { plays: 'desc' },
      include: {
        dj: {
          select: {
            id: true,
            stageName: true,
            avatar: true,
            user: { select: { username: true } },
          },
        },
      },
      take: 10,
    });

    return ok(res, { paidAds, events, djRankings, mixes });
  } catch (error: any) {
    console.error('[campaigns.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// ─── PUBLIC: Platform real metrics counter ───
router.get('/stats', async (req: any, res: any) => {
  try {
    const [totalDjs, verifiedDjs, totalMixes, totalEvents, djProfiles, eventsList] = await Promise.all([
      prisma.djProfile.count(),
      prisma.djProfile.count({ where: { verified: true } }),
      prisma.mix.count(),
      prisma.event.count(),
      prisma.djProfile.findMany({
        select: { city: true },
      }),
      prisma.event.findMany({
        select: { city: true },
      }),
    ]);

    const allCities = new Set([
      ...djProfiles.map((c: any) => c.city?.trim()).filter(Boolean),
      ...eventsList.map((c: any) => c.city?.trim()).filter(Boolean),
    ]);

    return ok(res, {
        totalDjs,
        verifiedDjs,
        totalMixes,
        totalEvents,
        citiesCount: allCities.size || 1,
      });
  } catch (error: any) {
    console.error('[campaigns.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// All campaign routes below require authentication
router.use(authMiddleware);

const campaignStatuses = ['pending_payment', 'active', 'paused', 'rejected', 'completed'];
const targetTypes = ['profile', 'mix', 'battle'];

const createCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  targetType: z.enum(targetTypes as [string, ...string[]]),
  targetId: z.string().optional(),
  budget: z.coerce.number().min(100, 'Minimum campaign budget is SLE 100'),
  currency: z.string().max(10).default('SLE'),
  ctaUrl: z.string().url().optional().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const updateCampaignSchema = createCampaignSchema.partial().extend({
  status: z.enum(campaignStatuses as [string, ...string[]]).optional(),
});

function computeReachScore(budget: number) {
  return budget / 100;
}

// GET /api/campaigns/me - List campaigns for the logged-in DJ
router.get('/me', async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return fail(res, 404, 'DJ profile not found');
    }

    const campaigns = await prisma.adCampaign.findMany({
      where: { advertiserId: dj.id },
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, campaigns);
  } catch (error) {
    console.error('[campaigns.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/campaigns/me/targets - Available targets (mixes/battles) for this DJ
router.get('/me/targets', async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        mixes: { select: { id: true, title: true, coverImage: true } },
        battleEntries: { select: { id: true, battle: { select: { title: true } } } },
      },
    });
    if (!dj) {
      return fail(res, 404, 'DJ profile not found');
    }

    return ok(res, {
        profile: { id: dj.id, name: dj.stageName, avatar: dj.avatar },
        mixes: dj.mixes,
        battles: dj.battleEntries.map((e: any) => ({
          id: e.id,
          title: e.battle?.title || 'Battle Entry',
        })),
      });
  } catch (error) {
    console.error('[campaigns.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/campaigns - Create a new campaign
router.post('/', uploadEventImage.single('creativeImage'), async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return fail(res, 404, 'DJ profile not found');
    }

    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Validate target ownership
    if (data.targetType === 'mix' && data.targetId) {
      const mix = await prisma.mix.findUnique({ where: { id: data.targetId } });
      if (!mix || mix.djId !== dj.id) {
        return fail(res, 400, 'Selected mix does not belong to you');
      }
    } else if (data.targetType === 'battle' && data.targetId) {
      const entry = await prisma.battleEntry.findUnique({ where: { id: data.targetId } });
      if (!entry || entry.djId !== dj.id) {
        return fail(res, 400, 'Selected battle entry does not belong to you');
      }
    }

    let creativeImageUrl = null;
    if (req.file) {
      creativeImageUrl = await uploadBuffer(req.file.buffer, 'campaigns', { contentType: req.file.mimetype, ext: extFromMime(req.file.mimetype) });
    }

    const campaign = await prisma.adCampaign.create({
      data: {
        advertiserId: dj.id,
        name: data.name,
        targetType: data.targetType,
        targetId: data.targetId || null,
        budget: data.budget,
        currency: data.currency,
        reachScore: computeReachScore(data.budget),
        ctaUrl: data.ctaUrl || null,
        creativeImageUrl,
        status: 'pending_payment',
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    return res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    console.error('[campaigns.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// PUT /api/campaigns/:id - Update a campaign (only before active / owner only)
router.put('/:id', uploadEventImage.single('creativeImage'), async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return fail(res, 404, 'DJ profile not found');
    }

    const campaign = await prisma.adCampaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) {
      return fail(res, 404, 'Campaign not found');
    }
    if (campaign.advertiserId !== dj.id) {
      return fail(res, 403, 'Forbidden');
    }
    if (campaign.status === 'active' || campaign.status === 'completed' || campaign.status === 'rejected') {
      return fail(res, 400, 'Campaign cannot be edited in its current state');
    }

    const parsed = updateCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Validate target ownership when changing target
    if (data.targetType === 'mix' && data.targetId) {
      const mix = await prisma.mix.findUnique({ where: { id: data.targetId } });
      if (!mix || mix.djId !== dj.id) {
        return fail(res, 400, 'Selected mix does not belong to you');
      }
    } else if (data.targetType === 'battle' && data.targetId) {
      const entry = await prisma.battleEntry.findUnique({ where: { id: data.targetId } });
      if (!entry || entry.djId !== dj.id) {
        return fail(res, 400, 'Selected battle entry does not belong to you');
      }
    }

    const updateData: any = {
      ...(data.name && { name: data.name }),
      ...(data.targetType && { targetType: data.targetType }),
      ...(data.targetId !== undefined && { targetId: data.targetId || null }),
      ...(data.budget !== undefined && { budget: data.budget, reachScore: computeReachScore(data.budget) }),
      ...(data.currency && { currency: data.currency }),
      ...(data.ctaUrl !== undefined && { ctaUrl: data.ctaUrl || null }),
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
    };

    if (req.file) {
      const url = await uploadBuffer(req.file.buffer, 'campaigns', { contentType: req.file.mimetype, ext: extFromMime(req.file.mimetype) });
      if (campaign.creativeImageUrl) {
        await deleteFile(campaign.creativeImageUrl).catch(() => {});
      }
      updateData.creativeImageUrl = url;
    }

    const updated = await prisma.adCampaign.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return ok(res, updated);
  } catch (error) {
    console.error('[campaigns.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// DELETE /api/campaigns/:id - Delete campaign (owner only, not active)
router.delete('/:id', async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return fail(res, 404, 'DJ profile not found');
    }

    const campaign = await prisma.adCampaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) {
      return fail(res, 404, 'Campaign not found');
    }
    if (campaign.advertiserId !== dj.id && req.user.role !== 'ADMIN') {
      return fail(res, 403, 'Forbidden');
    }

    await prisma.adCampaign.delete({ where: { id: req.params.id } });
    if (campaign.creativeImageUrl) {
      await deleteFile(campaign.creativeImageUrl).catch(() => {});
    }

    return ok(res, { id: req.params.id, message: 'Campaign deleted' });
  } catch (error) {
    console.error('[campaigns.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
