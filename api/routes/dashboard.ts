const express = require('express');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { computeDjScore } = require('../utils/ranking');

const router = express.Router();

// GET /api/dashboard - Get DJ dashboard analytics
router.get('/', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!dj) {
      return res.status(403).json({ success: false, error: 'You do not have a DJ profile' });
    }

    const [
      totalMixes,
      totalStreams,
      totalBookings,
      totalReviews,
      recentBookings,
      topMixes,
      recentReviews,
      rankingHistory,
      recentEvents,
      battleEntries,
      payments,
    ] = await Promise.all([
      prisma.mix.count({ where: { djId: dj.id } }),
      prisma.mix.aggregate({
        where: { djId: dj.id },
        _sum: { plays: true },
      }),
      prisma.booking.count({ where: { djId: dj.id } }),
      prisma.review.count({ where: { djId: dj.id } }),
      prisma.booking.findMany({
        where: { djId: dj.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          client: { select: { id: true, email: true } },
        },
      }),
      prisma.mix.findMany({
        where: { djId: dj.id },
        orderBy: { plays: 'desc' },
        take: 5,
      }),
      prisma.review.findMany({
        where: { djId: dj.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, email: true } },
        },
      }),
      prisma.rankingHistory.findMany({
        where: { djId: dj.id },
        orderBy: { week: 'asc' },
        take: 12,
      }),
      prisma.event.findMany({
        where: { djId: dj.id },
        orderBy: { date: 'asc' },
        take: 5,
      }),
      prisma.battleEntry.findMany({
        where: { djId: dj.id },
        include: {
          battle: { select: { title: true, status: true, weekStart: true } },
        },
        orderBy: { id: 'desc' },
        take: 5,
      }),
      prisma.payment.findMany({
        where: { djId: dj.id, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const bookingStatusCounts = await prisma.booking.groupBy({
      by: ['status'],
      where: { djId: dj.id },
      _count: { status: true },
    });

    // Calculate live ranking score
    const liveScores = await computeDjScore(dj.id);

    return res.json({
      success: true,
      data: {
        overview: {
          totalMixes,
          totalStreams: totalStreams._sum.plays || 0,
          totalBookings,
          totalReviews,
          averageRating: dj.averageRating,
          rankingPosition: dj.rankingPosition,
          rankingScore: dj.rankingScore,
          liveScores,
        },
        recentBookings,
        topMixes,
        recentReviews,
        rankingHistory,
        recentEvents,
        battleEntries,
        payments,
        bookingStatusCounts,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dashboard/stats - Quick stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!dj) {
      return res.status(403).json({ success: false, error: 'You do not have a DJ profile' });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const [
      mixesThisMonth,
      bookingsThisMonth,
      newStreams,
      newStreamsThisWeek,
      profileViewsEstimate,
      mixLikesThisMonth,
      topGenre,
      followersGrowth,
    ] = await Promise.all([
      prisma.mix.count({
        where: { djId: dj.id, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.booking.count({
        where: { djId: dj.id, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.mix.aggregate({
        where: { djId: dj.id },
        _sum: { plays: true },
      }),
      prisma.mix.aggregate({
        where: { djId: dj.id, createdAt: { gte: sevenDaysAgo } },
        _sum: { plays: true },
      }),
      // Estimate: total followers * engagement rate (simplified)
      Promise.resolve(Math.floor(dj.totalFollowers * 0.02)),
      prisma.mix.aggregate({
        where: { djId: dj.id, createdAt: { gte: thirtyDaysAgo } },
        _sum: { likes: true },
      }),
      // Get top genre from mixes
      prisma.mix.groupBy({
        by: ['genre'],
        where: { djId: dj.id },
        _count: { genre: true },
        orderBy: { _count: { genre: 'desc' } },
        take: 1,
      }),
      // Follower growth is not directly tracked; use ranking history as proxy
      Promise.resolve({ count: 0 }),
    ]);

    // Monthly activity (last 6 months)
    const monthlyActivity = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = monthStart.toLocaleString('default', { month: 'short' });

      const [monthPlays, monthBookings] = await Promise.all([
        prisma.mix.aggregate({
          where: { djId: dj.id, createdAt: { gte: monthStart, lt: monthEnd } },
          _sum: { plays: true },
        }),
        prisma.booking.count({
          where: { djId: dj.id, createdAt: { gte: monthStart, lt: monthEnd } },
        }),
      ]);

      monthlyActivity.push({
        month: monthLabel,
        plays: monthPlays._sum.plays || 0,
        bookings: monthBookings,
      });
    }

    // Genre breakdown from actual mixes
    const genreBreakdown = await prisma.mix.groupBy({
      by: ['genre'],
      where: { djId: dj.id },
      _count: { genre: true },
      orderBy: { _count: { genre: 'desc' } },
      take: 6,
    });

    const genreData = genreBreakdown.map((g) => ({
      name: g.genre || 'Unknown',
      value: g._count.genre,
    }));

    // Calculate engagement rate
    const engagementRate = dj.totalStreams > 0
      ? Math.round(((dj.totalMixes * 1000) / dj.totalStreams) * 1000) / 10
      : 0;

    return res.json({
      success: true,
      data: {
        mixesThisMonth,
        bookingsThisMonth,
        newStreams: newStreams._sum.plays || 0,
        newStreamsThisWeek: newStreamsThisWeek._sum.plays || 0,
        profileViews: profileViewsEstimate,
        mixLikesThisMonth: mixLikesThisMonth._sum.likes || 0,
        topGenre: topGenre[0]?.genre || 'Unknown',
        engagementRate,
        rankingPosition: dj.rankingPosition,
        rankingScore: dj.rankingScore,
        monthlyActivity,
        genreBreakdown: genreData,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
