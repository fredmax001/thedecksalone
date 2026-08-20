const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, softAuthMiddleware, requireRole } = require('../middleware/auth');
const { conditionalSearchLimiter } = require('../utils/rateLimiter');
const {
  recalculateAllRankingsV2,
  getRisingDjs,
  getBattleLeaders,
  computeDjScoreV2,
} = require('../utils/rankingAlgorithm');
const {
  discoverMixes,
  getTrendingMixes,
  getPersonalizedRecommendations,
  getHallOfFameCandidates,
} = require('../utils/mixDiscovery');
const { getActiveCampaigns, applyCampaignBoost } = require('../utils/campaignBoost');

const router = express.Router();

/* ──────────────────── Discovery filter schemas ──────────────────── */

const discoverMixesSchema = z.object({
  genre: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['discovery', 'newest', 'trending', 'plays', 'likes']).optional(),
});

const discoverDjsSchema = z.object({
  city: z.string().optional(),
  community: z.string().optional(),
  genre: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['ranking', 'followers', 'bookings', 'newest', 'mixes', 'rating']).optional(),
  minFee: z.string().optional(),
  maxFee: z.string().optional(),
});

const discoverUsersSchema = z.object({
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

/* ──────────────────── Mix Discovery ──────────────────── */

// GET /api/discover/mixes — Algorithmic mix discovery
router.get('/mixes', conditionalSearchLimiter, async (req, res) => {
  try {
    const parsed = discoverMixesSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { genre, category, search, page, limit, sortBy } = parsed.data;
    const result = await discoverMixes({
      genre,
      category,
      search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sortBy,
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/discover/mixes/trending — Trending mixes (last 7 days)
router.get('/mixes/trending', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const mixes = await getTrendingMixes(limitNum);
    return res.json({ success: true, data: mixes });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/discover/mixes/for-you — Personalized recommendations (auth required)
router.get('/mixes/for-you', authMiddleware, async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const mixes = await getPersonalizedRecommendations(req.user.id, limitNum);
    return res.json({ success: true, data: mixes });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/discover/mixes/hall-of-fame — High-quality mix candidates
router.get('/mixes/hall-of-fame', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const mixes = await getHallOfFameCandidates(limitNum);
    return res.json({ success: true, data: mixes });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ──────────────────── DJ Discovery ──────────────────── */

// GET /api/discover/djs — Discover DJs with enhanced ranking + campaign boost
router.get('/djs', conditionalSearchLimiter, async (req, res) => {
  try {
    const parsed = discoverDjsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { city, community, genre, search, page, limit, sortBy, minFee, maxFee } = parsed.data;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isPublic: true };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (community) where.community = { contains: community, mode: 'insensitive' };
    if (genre) where.genres = { has: genre };
    if (minFee) where.bookingFeeMin = { gte: parseFloat(minFee) };
    if (maxFee) where.bookingFeeMax = { lte: parseFloat(maxFee) };
    if (search) {
      where.OR = [
        { stageName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { community: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'followers') orderBy.followers = { _count: 'desc' };
    else if (sortBy === 'bookings') orderBy.bookingsAsDj = { _count: 'desc' };
    else if (sortBy === 'newest') orderBy.createdAt = 'desc';
    else if (sortBy === 'mixes') orderBy.mixes = { _count: 'desc' };
    else if (sortBy === 'rating') orderBy.averageRating = 'desc';
    else orderBy.createdAt = 'desc'; // Never sort by stale stored rankingScore

    // Fetch active profile promotion campaigns and apply the same filters to promoted DJs
    const [campaigns, promotedDjs] = await Promise.all([
      getActiveCampaigns('profile'),
      prisma.djProfile.findMany({
        where: { ...where, campaigns: { some: { targetType: 'profile', status: 'active' } } },
        include: {
          user: { select: { username: true } },
          streamingPlatforms: { select: { streams: true } },
          _count: { select: { mixes: true, bookingsAsDj: true, followers: true, events: true } },
        },
      }),
    ]);

    const [djs, total] = await Promise.all([
      prisma.djProfile.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          user: { select: { username: true } },
          streamingPlatforms: { select: { streams: true } },
          _count: { select: { mixes: true, bookingsAsDj: true, followers: true, events: true } },
        },
      }),
      prisma.djProfile.count({ where }),
    ]);

    const enrich = (dj: any, indexOffset = 0) => {
      const realTotalFollowers = dj._count.followers;
      const realTotalMixes = dj._count.mixes;
      const realTotalEvents = dj._count.events;
      const realTotalBookings = dj._count.bookingsAsDj;
      const realTotalStreams = dj.streamingPlatforms.reduce((sum, p) => sum + (p.streams || 0), 0);

      // Compute a real ranking score from actual data (never trust stored fake values)
      const followerScore = Math.min(20, realTotalFollowers / 50);
      const mixScore = Math.min(25, realTotalMixes * 2);
      const bookingScore = Math.min(20, realTotalBookings * 2);
      const streamScore = Math.min(15, realTotalStreams / 1000);
      const ratingScore = Math.min(20, (dj.averageRating || 0) * 4);
      const realRankingScore = Math.round((followerScore + mixScore + bookingScore + streamScore + ratingScore) * 10) / 10;

      return {
        ...dj,
        username: dj.user.username,
        totalFollowers: realTotalFollowers,
        totalMixes: realTotalMixes,
        totalEvents: realTotalEvents,
        totalBookings: realTotalBookings,
        totalStreams: realTotalStreams,
        mixCount: realTotalMixes,
        bookingCount: realTotalBookings,
        rankingScore: realRankingScore, // Override stored fake value
      };
    };

    const enriched = djs.map((dj, index) => ({
      ...enrich(dj),
      position: skip + index + 1,
    }));

    // Merge promoted DJs that may not already be in the paginated result, then apply boost sort
    const promotedEnriched = promotedDjs.map(enrich);
    const mergedMap = new Map<string, any>();
    for (const dj of promotedEnriched) mergedMap.set(dj.id, dj);
    for (const dj of enriched) if (!mergedMap.has(dj.id)) mergedMap.set(dj.id, dj);

    const boosted = applyCampaignBoost(Array.from(mergedMap.values()), campaigns, (dj) => dj.id);

    return res.json({
      success: true,
      data: boosted.slice(0, limitNum),
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/discover/djs/rising — Fastest rising DJs
router.get('/djs/rising', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const djs = await getRisingDjs(limitNum);
    return res.json({ success: true, data: djs });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/discover/djs/battle-leaders — DJs with most battle wins
router.get('/djs/battle-leaders', async (req, res) => {
  try {
    const limitNum = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const djs = await getBattleLeaders(limitNum);
    return res.json({ success: true, data: djs });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ──────────────────── User Discovery ──────────────────── */

// GET /api/discover/users — Discover platform users (non-DJs)
router.get('/users', conditionalSearchLimiter, async (req, res) => {
  try {
    const parsed = discoverUsersSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
    }

    const { search, page, limit } = parsed.data;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      role: 'USER',
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          location: true,
          bio: true,
          favoriteGenres: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: users.map((u) => ({
        ...u,
        displayName: u.name || u.username || 'User',
      })),
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ──────────────────── Ranking Administration ──────────────────── */

// POST /api/discover/recalculate — Trigger full ranking recalculation (admin only)
router.post('/recalculate', authMiddleware, requireRole('ADMIN', 'MODERATOR'), async (req, res) => {
  try {
    const startedAt = Date.now();
    const result = await recalculateAllRankingsV2();
    const durationMs = Date.now() - startedAt;

    return res.json({
      success: true,
      data: {
        message: 'Rankings recalculated successfully',
        djsProcessed: result.length,
        durationMs,
        top3: result.slice(0, 3).map((dj) => ({
          id: dj.id,
          compositeScore: dj.compositeScore,
          battleScore: dj.battleScore,
        })),
      },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/discover/rankings/:djId/score — Get detailed v2 score for a DJ
router.get('/rankings/:djId/score', async (req, res) => {
  try {
    const score = await computeDjScoreV2(req.params.djId);
    if (!score) {
      return res.status(404).json({ success: false, error: 'DJ not found' });
    }
    return res.json({ success: true, data: score });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ──────────────────── Recommended DJs For User ──────────────────── */
// GET /api/discover/djs/recommended — Smart DJ suggestions based on listening taste
router.get('/djs/recommended', softAuthMiddleware, async (req: any, res: any) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 8));
    let preferredGenres: string[] = [];

    if (req.user?.id) {
      const likedMixes = await prisma.mixLike.findMany({
        where: { userId: req.user.id },
        include: { mix: { select: { genre: true } } },
        take: 20,
      });

      const genreCounts: Record<string, number> = {};
      for (const item of likedMixes) {
        if (item.mix?.genre) {
          genreCounts[item.mix.genre] = (genreCounts[item.mix.genre] || 0) + 1;
        }
      }
      preferredGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g);
    }

    // Query DJs matching preferred genres or top ranking DJs
    const where: any = {
      user: { status: 'ACTIVE' },
    };

    if (preferredGenres.length > 0) {
      where.OR = [
        { genres: { hasSome: preferredGenres } },
        { verified: true },
      ];
    }

    const djs = await prisma.djProfile.findMany({
      where,
      take: limit,
      orderBy: [{ verified: 'desc' }, { rankingScore: 'desc' }, { totalFollowers: 'desc' }],
      select: {
        id: true,
        stageName: true,
        slug: true,
        avatar: true,
        city: true,
        verified: true,
        genres: true,
        subscriptionTier: true,
        totalMixes: true,
        totalFollowers: true,
        totalPlays: true,
        rating: true,
        user: {
          select: { username: true },
        },
      },
    });

    return res.json({
      success: true,
      preferredGenres,
      data: djs.map((d: any) => ({
        ...d,
        recommendationReason: preferredGenres.some((g) => d.genres?.includes(g))
          ? `Plays your favorite genres (${preferredGenres.filter((g) => d.genres?.includes(g)).join(', ')})`
          : 'Top trending verified DJ in Sierra Leone',
      })),
    });
  } catch (error: any) {
    console.error('Error fetching recommended DJs:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch DJ recommendations' });
  }
});

/* ──────────────────── Smart For-You Dynamic Playlists ──────────────────── */
// GET /api/discover/playlists/for-you — Algorithmic customized playlist bundles
router.get('/playlists/for-you', softAuthMiddleware, async (req: any, res: any) => {
  try {
    // 1. Fetch public mixes to build taste-based bundles
    const mixes = await prisma.mix.findMany({
      where: { isPublic: true },
      orderBy: [{ plays: 'desc' }, { likes: 'desc' }, { createdAt: 'desc' }],
      take: 60,
      include: {
        dj: {
          select: {
            id: true,
            stageName: true,
            avatar: true,
            verified: true,
            subscriptionTier: true,
          },
        },
      },
    });

    const afrobeatsMixes = mixes.filter((m: any) => (m.genre || '').toLowerCase().includes('afro') || (m.category || '').toLowerCase().includes('afro'));
    const amapianoMixes = mixes.filter((m: any) => (m.genre || '').toLowerCase().includes('amapiano') || (m.genre || '').toLowerCase().includes('house') || (m.title || '').toLowerCase().includes('3-step'));
    const saloneMixes = mixes.filter((m: any) => (m.genre || '').toLowerCase().includes('salone') || (m.title || '').toLowerCase().includes('salone') || (m.category || '').toLowerCase().includes('salone'));
    const reggaeMixes = mixes.filter((m: any) => (m.genre || '').toLowerCase().includes('reggae') || (m.genre || '').toLowerCase().includes('dancehall') || (m.title || '').toLowerCase().includes('riddim') || (m.title || '').toLowerCase().includes('lovers rock'));

    const smartPlaylists = [
      {
        id: 'for-you-daily-1',
        slug: 'salone-afrobeats-heat',
        title: 'Daily Mix 1: Salone & Afrobeats Heat',
        description: 'Your personalized high-energy mix featuring top Afro-fusion and Freetown street anthems.',
        coverImage: afrobeatsMixes[0]?.coverImage || saloneMixes[0]?.coverImage || '/images/genres/afrobeats.jpg',
        category: 'Personalized Daily Mix',
        badge: 'Made For You',
        trackCount: Math.min(12, (afrobeatsMixes.length + saloneMixes.length) || 6),
        items: [...afrobeatsMixes.slice(0, 4), ...saloneMixes.slice(0, 4)],
      },
      {
        id: 'for-you-daily-2',
        slug: 'amapiano-3step-grooves',
        title: 'Daily Mix 2: Amapiano & 3-Step Lounge',
        description: 'Smooth log drums, soulful keys, and rhythmic 3-step selections tailored to your listening vibe.',
        coverImage: amapianoMixes[0]?.coverImage || '/images/genres/amapiano.jpg',
        category: 'Personalized Daily Mix',
        badge: 'Made For You',
        trackCount: Math.min(10, amapianoMixes.length || 5),
        items: amapianoMixes.slice(0, 6),
      },
      {
        id: 'for-you-daily-3',
        slug: 'reggae-lovers-rock-sessions',
        title: 'Daily Mix 3: Reggae & Lovers Rock Sessions',
        description: 'Conscious roots, timeless Lovers Rock, and dancehall heavyweight tracks.',
        coverImage: reggaeMixes[0]?.coverImage || '/images/genres/reggae.jpg',
        category: 'Personalized Daily Mix',
        badge: 'Made For You',
        trackCount: Math.min(10, reggaeMixes.length || 5),
        items: reggaeMixes.slice(0, 6),
      },
      {
        id: 'for-you-weekly-discovery',
        slug: 'weekly-discovery-rising-talents',
        title: 'Weekly Discovery: Rising Stars',
        description: 'Fresh mixtape drops from verified rising DJs across Sierra Leone you haven’t discovered yet.',
        coverImage: mixes[1]?.coverImage || '/images/genres/salone-mix.jpg',
        category: 'Weekly Discovery',
        badge: 'Personalized',
        trackCount: Math.min(12, mixes.length),
        items: mixes.slice(4, 12),
      },
    ];

    return res.json({
      success: true,
      data: smartPlaylists,
    });
  } catch (error: any) {
    console.error('Error generating for-you playlists:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate for-you playlists' });
  }
});

/* ──────────────────── Feed Drop & Unread Notification Stats ──────────────────── */
// GET /api/discover/feed/stats — Calculate new drops count since last timestamp
router.get('/feed/stats', softAuthMiddleware, async (req: any, res: any) => {
  try {
    const sinceQuery = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const validSince = isNaN(sinceQuery.getTime()) ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) : sinceQuery;

    const [newMixesCount, newEventsCount, totalMixes, totalDjs] = await Promise.all([
      prisma.mix.count({
        where: {
          isPublic: true,
          createdAt: { gt: validSince },
        },
      }),
      prisma.event.count({
        where: {
          status: 'UPCOMING',
          createdAt: { gt: validSince },
        },
      }),
      prisma.mix.count({ where: { isPublic: true } }),
      prisma.djProfile.count({ where: { user: { status: 'ACTIVE' } } }),
    ]);

    const totalNewDrops = newMixesCount + newEventsCount;

    return res.json({
      success: true,
      data: {
        since: validSince.toISOString(),
        newMixesCount,
        newEventsCount,
        totalNewDrops,
        totalMixes,
        totalDjs,
      },
    });
  } catch (error: any) {
    console.error('Error fetching feed stats:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch feed stats' });
  }
});

module.exports = router;
