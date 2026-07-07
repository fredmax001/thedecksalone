const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { uploadEventImage } = require('../utils/upload');
const { uploadBuffer, deleteFile } = require('../utils/storage');

const router = express.Router();

// All campaign routes require authentication
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
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }

    const campaigns = await prisma.adCampaign.findMany({
      where: { advertiserId: dj.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: campaigns });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
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
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }

    return res.json({
      success: true,
      data: {
        profile: { id: dj.id, name: dj.stageName, avatar: dj.avatar },
        mixes: dj.mixes,
        battles: dj.battleEntries.map((e: any) => ({
          id: e.id,
          title: e.battle?.title || 'Battle Entry',
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/campaigns - Create a new campaign
router.post('/', uploadEventImage.single('creativeImage'), async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }

    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Validate target ownership
    if (data.targetType === 'mix' && data.targetId) {
      const mix = await prisma.mix.findUnique({ where: { id: data.targetId } });
      if (!mix || mix.djId !== dj.id) {
        return res.status(400).json({ success: false, error: 'Selected mix does not belong to you' });
      }
    } else if (data.targetType === 'battle' && data.targetId) {
      const entry = await prisma.battleEntry.findUnique({ where: { id: data.targetId } });
      if (!entry || entry.djId !== dj.id) {
        return res.status(400).json({ success: false, error: 'Selected battle entry does not belong to you' });
      }
    }

    let creativeImageUrl = null;
    if (req.file) {
      creativeImageUrl = await uploadBuffer(req.file.buffer, 'campaigns', { contentType: req.file.mimetype, ext: req.file.originalname.split('.').pop() || 'webp' });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/campaigns/:id - Update a campaign (only before active / owner only)
router.put('/:id', uploadEventImage.single('creativeImage'), async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }

    const campaign = await prisma.adCampaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    if (campaign.advertiserId !== dj.id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (campaign.status === 'active' || campaign.status === 'completed' || campaign.status === 'rejected') {
      return res.status(400).json({ success: false, error: 'Campaign cannot be edited in its current state' });
    }

    const parsed = updateCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Validate target ownership when changing target
    if (data.targetType === 'mix' && data.targetId) {
      const mix = await prisma.mix.findUnique({ where: { id: data.targetId } });
      if (!mix || mix.djId !== dj.id) {
        return res.status(400).json({ success: false, error: 'Selected mix does not belong to you' });
      }
    } else if (data.targetType === 'battle' && data.targetId) {
      const entry = await prisma.battleEntry.findUnique({ where: { id: data.targetId } });
      if (!entry || entry.djId !== dj.id) {
        return res.status(400).json({ success: false, error: 'Selected battle entry does not belong to you' });
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
      const url = await uploadBuffer(req.file.buffer, 'campaigns', { contentType: req.file.mimetype, ext: req.file.originalname.split('.').pop() || 'webp' });
      if (campaign.creativeImageUrl) {
        await deleteFile(campaign.creativeImageUrl).catch(() => {});
      }
      updateData.creativeImageUrl = url;
    }

    const updated = await prisma.adCampaign.update({
      where: { id: req.params.id },
      data: updateData,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/campaigns/:id - Delete campaign (owner only, not active)
router.delete('/:id', async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }

    const campaign = await prisma.adCampaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    if (campaign.advertiserId !== dj.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.adCampaign.delete({ where: { id: req.params.id } });
    if (campaign.creativeImageUrl) {
      await deleteFile(campaign.creativeImageUrl).catch(() => {});
    }

    return res.json({ success: true, data: { id: req.params.id, message: 'Campaign deleted' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
