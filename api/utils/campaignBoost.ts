const { prisma } = require('./prisma');

type BoostTargetType = 'profile' | 'mix' | 'battle';

interface BoostableItem {
  id: string;
  [key: string]: any;
}

interface CampaignBoost {
  campaignId: string;
  reachScore: number;
  budget: number;
  targetId: string | null;
  creativeImageUrl?: string | null;
  ctaUrl?: string | null;
  advertiser?: {
    id: string;
    stageName: string;
    avatar?: string | null;
  };
}

/**
 * Fetch active campaigns for a given target type.
 * Active = status 'active' and (no end date or end date in the future)
 * and (no start date or start date in the past).
 */
async function getActiveCampaigns(targetType: BoostTargetType): Promise<CampaignBoost[]> {
  const now = new Date();
  const campaigns = await prisma.adCampaign.findMany({
    where: {
      targetType,
      status: 'active',
      AND: [
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      ],
    },
    include: {
      advertiser: { select: { id: true, stageName: true, avatar: true } },
    },
    orderBy: { reachScore: 'desc' },
  });
  return campaigns.map((c: any) => ({
    campaignId: c.id,
    reachScore: c.reachScore || 0,
    budget: c.budget || 0,
    targetId: c.targetId,
    creativeImageUrl: c.creativeImageUrl,
    ctaUrl: c.ctaUrl,
    advertiser: c.advertiser,
  }));
}

// Helper to merge campaign metadata into an item
function attachBoost(item: any, campaign: CampaignBoost) {
  return {
    ...item,
    promoted: true,
    campaignId: campaign.campaignId,
    reachScore: campaign.reachScore,
    campaignBudget: campaign.budget,
    creativeImageUrl: campaign.creativeImageUrl || item.creativeImageUrl || item.coverImage || item.avatar,
    ctaUrl: campaign.ctaUrl,
    advertiser: campaign.advertiser,
  };
}

/**
 * Apply active campaign boosts to a list of items.
 * Items that match a campaign targetId get promoted and sorted to the top by reachScore,
 * then by their original base score. Items without a campaign keep their original order.
 */
function applyCampaignBoost<T extends BoostableItem>(
  items: T[],
  campaigns: CampaignBoost[],
  getTargetId: (item: T) => string
): any[] {
  const campaignMap = new Map<string, CampaignBoost>();
  for (const c of campaigns) {
    if (c.targetId) campaignMap.set(c.targetId, c);
  }

  const boosted: any[] = [];
  const regular: any[] = [];

  for (const item of items) {
    const campaign = campaignMap.get(getTargetId(item));
    if (campaign) {
      boosted.push(attachBoost(item, campaign));
    } else {
      regular.push(item);
    }
  }

  // Sort boosted by reachScore descending
  boosted.sort((a, b) => b.reachScore - a.reachScore);

  return [...boosted, ...regular];
}

module.exports = {
  getActiveCampaigns,
  applyCampaignBoost,
};
