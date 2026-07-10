const express = require('express');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { computeDjScore } = require('../utils/ranking');
const { getMonthlyListeners } = require('../utils/monthlyListeners');

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
      totalFollowers,
      totalEvents,
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
      prisma.follow.count({ where: { djId: dj.id } }),
      prisma.event.count({ where: { djId: dj.id } }),
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
    const monthlyListeners = await getMonthlyListeners(dj.id);

    return res.json({
      success: true,
      data: {
        overview: {
          totalMixes,
          totalStreams: totalStreams._sum.plays || 0,
          totalBookings,
          totalReviews,
          totalEvents,
          averageRating: dj.averageRating,
          rankingPosition: dj.rankingPosition,
          rankingScore: dj.rankingScore,
          totalFollowers,
          monthlyListeners,
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
      totalStreamsAllTime,
      newStreamsThisWeek,
      mixLikesThisMonth,
      topGenre,
      totalMixesAllTime,
      monthlyListeners,
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
      prisma.mix.count({ where: { djId: dj.id } }),
      getMonthlyListeners(dj.id),
    ]);

    // Monthly activity (last 6 months) — single query instead of 12 sequential ones
    const monthlyRaw: Array<{ month: Date; plays: bigint; bookings: bigint }> =
      await prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', m."createdAt") AS month,
          COALESCE(SUM(m.plays), 0)         AS plays,
          0::bigint                          AS bookings
        FROM mixes m
        WHERE m."djId" = ${dj.id}
          AND m."createdAt" > NOW() - INTERVAL '6 months'
        GROUP BY 1

        UNION ALL

        SELECT
          DATE_TRUNC('month', b."createdAt") AS month,
          0::bigint                          AS plays,
          COUNT(*)::bigint                   AS bookings
        FROM bookings b
        WHERE b."djId" = ${dj.id}
          AND b."createdAt" > NOW() - INTERVAL '6 months'
        GROUP BY 1
      `;

    // Merge plays and bookings by month label
    const monthMap = new Map<string, { plays: number; bookings: number }>();
    for (const row of monthlyRaw) {
      const label = new Date(row.month).toLocaleString('default', { month: 'short' });
      const entry = monthMap.get(label) || { plays: 0, bookings: 0 };
      entry.plays += Number(row.plays);
      entry.bookings += Number(row.bookings);
      monthMap.set(label, entry);
    }

    // Fill in all 6 months in order, defaulting to 0 for months with no data
    const monthlyActivity = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const data = monthMap.get(label) || { plays: 0, bookings: 0 };
      return { month: label, ...data };
    });

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

    // Calculate engagement rate using real database counts
    const engagementRate = totalStreamsAllTime._sum.plays > 0
      ? Math.round(((totalMixesAllTime * 1000) / totalStreamsAllTime._sum.plays) * 1000) / 10
      : 0;

    return res.json({
      success: true,
      data: {
        mixesThisMonth,
        bookingsThisMonth,
        newStreams: totalStreamsAllTime._sum.plays || 0,
        newStreamsThisWeek: newStreamsThisWeek._sum.plays || 0,
        profileViews: null,
        monthlyListeners,
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
