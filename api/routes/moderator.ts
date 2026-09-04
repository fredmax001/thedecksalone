const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { uploadCover } = require('../utils/upload');
const { uploadBuffer } = require('../utils/storage');
const logger = require('../utils/logger');
const { ok, fail } = require('../utils/response');

const router = express.Router();

// Enforce Moderator or Admin role on all /api/moderator endpoints
router.use(authMiddleware, requireRole('MODERATOR', 'ADMIN'));

// Helper to log moderator actions
async function createModeratorLog({
  moderatorId,
  moderatorName,
  action,
  targetType,
  targetId,
  targetName,
  previousData,
  newData,
  reason,
}: {
  moderatorId: string;
  moderatorName?: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  previousData?: any;
  newData?: any;
  reason?: string;
}) {
  try {
    await prisma.moderatorAuditLog.create({
      data: {
        moderatorId,
        moderatorName: moderatorName || 'Moderator',
        action,
        targetType,
        targetId: targetId || null,
        targetName: targetName || null,
        previousData: previousData ? JSON.parse(JSON.stringify(previousData)) : null,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
        reason: reason || null,
      },
    });
  } catch (err: any) {
    logger.error('Failed to write moderator audit log:', err.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   1. MODERATOR DASHBOARD STATS
   GET /api/moderator/stats
   ───────────────────────────────────────────────────────────── */
router.get('/stats', async (req: any, res: any) => {
  try {
    const [
      totalDjs,
      verifiedDjs,
      totalMixes,
      awaitingReview,
      reportedMixes,
      reportedUsers,
      officialPlaylistsCount,
      topRankedDjs,
      recentUploads,
    ] = await Promise.all([
      prisma.djProfile.count(),
      prisma.djProfile.count({ where: { verified: true } }),
      prisma.mix.count(),
      prisma.mix.count({ where: { flaggedForReview: true } }),
      prisma.violationReport.count({ where: { status: 'PENDING', mixId: { not: null } } }),
      prisma.violationReport.count({ where: { status: 'PENDING', targetUserId: { not: null } } }),
      prisma.officialPlaylist.count(),
      prisma.djProfile.findMany({
        take: 5,
        orderBy: { rankingPosition: 'asc' },
        select: {
          id: true,
          stageName: true,
          avatar: true,
          rankingPosition: true,
          rankingScore: true,
          verified: true,
        },
      }),
      prisma.mix.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          coverImage: true,
          genre: true,
          createdAt: true,
          isPublic: true,
          dj: { select: { id: true, stageName: true, avatar: true } },
        },
      }),
    ]);

    return ok(res, {
        totalDjs,
        verifiedDjs,
        totalMixes,
        awaitingReview,
        reportedMixes,
        reportedUsers,
        officialPlaylistsCount,
        topRankedDjs,
        recentUploads,
      });
  } catch (error: any) {
    logger.error('Error fetching moderator stats:', error.message);
    return fail(res, 500, 'Failed to load moderator dashboard stats');
  }
});

/* ─────────────────────────────────────────────────────────────
   2. MIX MANAGEMENT & GENRE CURATION
   GET /api/moderator/mixes
   PUT /api/moderator/mixes/:id
   POST /api/moderator/mixes/:id/flag
   POST /api/moderator/mixes/:id/report
   ───────────────────────────────────────────────────────────── */
router.get('/mixes', async (req: any, res: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 50));
    const search = (req.query.search as string || '').trim();
    const genre = req.query.genre as string;
    const flagged = req.query.flagged === 'true';
    const hidden = req.query.hidden === 'true';

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { dj: { stageName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (genre && genre !== 'ALL') {
      where.genre = { equals: genre, mode: 'insensitive' };
    }
    if (flagged) where.flaggedForReview = true;
    if (hidden) where.isPublic = false;

    const [total, mixes] = await Promise.all([
      prisma.mix.count({ where }),
      prisma.mix.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          dj: { select: { id: true, stageName: true, avatar: true, verified: true } },
          _count: { select: { violationReports: true, mixLikes: true, mixComments: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: mixes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching moderator mixes:', error.message);
    return fail(res, 500, 'Failed to fetch mixes');
  }
});

const updateMixSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: z.string().max(2000).optional().nullable(),
  genre: z.string().min(1).optional(),
  secondaryGenres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  moderatorCurated: z.boolean().optional(),
  moderatorNotes: z.string().max(1000).optional().nullable(),
  flaggedForReview: z.boolean().optional(),
  reason: z.string().optional(),
});

router.put('/mixes/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const parsed = updateMixSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
    }

    const existingMix = await prisma.mix.findUnique({
      where: { id },
      include: { dj: { select: { stageName: true } } },
    });
    if (!existingMix) {
      return fail(res, 404, 'Mix not found');
    }

    const { reason, ...updateFields } = parsed.data;

    const updatedMix = await prisma.mix.update({
      where: { id },
      data: updateFields,
      include: {
        dj: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    // Record Audit Log
    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: updateFields.isPublic === false ? 'UNPUBLISH_MIX' : 'UPDATE_MIX_METADATA',
      targetType: 'MIX',
      targetId: id,
      targetName: updatedMix.title,
      previousData: {
        title: existingMix.title,
        genre: existingMix.genre,
        secondaryGenres: existingMix.secondaryGenres,
        isPublic: existingMix.isPublic,
      },
      newData: {
        title: updatedMix.title,
        genre: updatedMix.genre,
        secondaryGenres: updatedMix.secondaryGenres,
        isPublic: updatedMix.isPublic,
      },
      reason: reason || updateFields.moderatorNotes || 'Moderator content update',
    });

    return ok(res, updatedMix);
  } catch (error: any) {
    logger.error('Error updating mix by moderator:', error.message);
    return fail(res, 500, 'Failed to update mix');
  }
});

// Flag mix for Admin review
router.post('/mixes/:id/flag', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const mix = await prisma.mix.findUnique({ where: { id } });
    if (!mix) return fail(res, 404, 'Mix not found');

    const updated = await prisma.mix.update({
      where: { id },
      data: {
        flaggedForReview: true,
        flaggedReason: reason || 'Flagged by moderator for admin review',
      },
    });

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: 'FLAG_MIX_FOR_ADMIN',
      targetType: 'MIX',
      targetId: id,
      targetName: mix.title,
      reason: reason || 'Flagged for Admin review',
    });

    return ok(res, updated);
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─────────────────────────────────────────────────────────────
   3. OFFICIAL PLAYLIST CREATION & CURATION
   GET /api/moderator/playlists
   POST /api/moderator/playlists
   PUT /api/moderator/playlists/:id
   DELETE /api/moderator/playlists/:id
   POST /api/moderator/playlists/:id/items
   DELETE /api/moderator/playlists/:id/items/:itemId
   ───────────────────────────────────────────────────────────── */
router.get('/playlists', async (req: any, res: any) => {
  try {
    const playlists = await prisma.officialPlaylist.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            mix: {
              select: {
                id: true,
                title: true,
                coverImage: true,
                genre: true,
                plays: true,
                dj: { select: { id: true, stageName: true, avatar: true } },
              },
            },
          },
        },
      },
    });

    return ok(res, playlists);
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.post('/playlists', uploadCover.single('coverImageFile'), async (req: any, res: any) => {
  try {
    const { title, description, isFeatured, isPublished } = req.body;
    let coverImage = req.body.coverImage;

    if (!title || title.trim() === '') {
      return fail(res, 400, 'Playlist title is required');
    }

    if (req.file) {
      const ext = req.file.originalname.split('.').pop() || 'jpg';
      coverImage = await uploadBuffer(req.file.buffer, 'covers', { contentType: req.file.mimetype, ext });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    const playlist = await prisma.officialPlaylist.create({
      data: {
        title: title.trim(),
        description: description || null,
        coverImage: coverImage || null,
        slug,
        isFeatured: isFeatured === true || isFeatured === 'true',
        isPublished: isPublished !== undefined ? (isPublished === true || isPublished === 'true') : true,
        createdById: req.user.id,
      },
    });

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: 'CREATE_OFFICIAL_PLAYLIST',
      targetType: 'PLAYLIST',
      targetId: playlist.id,
      targetName: playlist.title,
      reason: 'Created Official Deck Salone Playlist',
    });

    return ok(res, playlist);
  } catch (error: any) {
    logger.error('Error creating official playlist:', error);
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.put('/playlists/:id', uploadCover.single('coverImageFile'), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, description, isFeatured, isPublished } = req.body;
    let coverImage = req.body.coverImage;

    const existing = await prisma.officialPlaylist.findUnique({ where: { id } });
    if (!existing) return fail(res, 404, 'Playlist not found');

    if (req.file) {
      const ext = req.file.originalname.split('.').pop() || 'jpg';
      coverImage = await uploadBuffer(req.file.buffer, 'covers', { contentType: req.file.mimetype, ext });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured === true || isFeatured === 'true';
    if (isPublished !== undefined) updateData.isPublished = isPublished === true || isPublished === 'true';

    const updated = await prisma.officialPlaylist.update({
      where: { id },
      data: updateData,
    });

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: 'UPDATE_OFFICIAL_PLAYLIST',
      targetType: 'PLAYLIST',
      targetId: id,
      targetName: updated.title,
      previousData: { title: existing.title, isPublished: existing.isPublished },
      newData: { title: updated.title, isPublished: updated.isPublished },
    });

    return ok(res, updated);
  } catch (error: any) {
    logger.error('Error updating official playlist:', error);
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.delete('/playlists/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await prisma.officialPlaylist.findUnique({ where: { id } });
    if (!existing) return fail(res, 404, 'Playlist not found');

    await prisma.officialPlaylist.delete({ where: { id } });

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: 'DELETE_OFFICIAL_PLAYLIST',
      targetType: 'PLAYLIST',
      targetId: id,
      targetName: existing.title,
    });

    return res.json({ success: true, message: 'Playlist deleted' });
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// Add single mix to playlist (with duplicate prevention)
router.post('/playlists/:id/items', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { mixId } = req.body;
    if (!mixId) return fail(res, 400, 'mixId required');

    const [playlist, mix, existingItem, itemCount] = await Promise.all([
      prisma.officialPlaylist.findUnique({ where: { id } }),
      prisma.mix.findUnique({ where: { id: mixId } }),
      prisma.officialPlaylistItem.findUnique({ where: { playlistId_mixId: { playlistId: id, mixId } } }),
      prisma.officialPlaylistItem.count({ where: { playlistId: id } }),
    ]);

    if (!playlist) return fail(res, 404, 'Playlist not found');
    if (!mix) return fail(res, 404, 'Mix not found');
    if (existingItem) {
      return fail(res, 409, 'Mix is already in this playlist');
    }

    const item = await prisma.officialPlaylistItem.create({
      data: {
        playlistId: id,
        mixId,
        position: itemCount + 1,
      },
      include: {
        mix: { select: { id: true, title: true, coverImage: true, dj: { select: { stageName: true } } } },
      },
    });

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: 'ADD_MIX_TO_PLAYLIST',
      targetType: 'PLAYLIST',
      targetId: id,
      targetName: `${mix.title} -> ${playlist.title}`,
    });

    return ok(res, item);
  } catch (error: any) {
    logger.error('Error adding mix to playlist:', error);
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// Bulk add mixes to playlist
router.post('/playlists/:id/items/bulk', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { mixIds } = req.body;
    if (!Array.isArray(mixIds) || mixIds.length === 0) {
      return fail(res, 400, 'Array of mixIds is required');
    }

    const playlist = await prisma.officialPlaylist.findUnique({ where: { id } });
    if (!playlist) return fail(res, 404, 'Playlist not found');

    const [existingItems, currentCount] = await Promise.all([
      prisma.officialPlaylistItem.findMany({
        where: { playlistId: id },
        select: { mixId: true },
      }),
      prisma.officialPlaylistItem.count({ where: { playlistId: id } }),
    ]);

    const existingMixIds = new Set(existingItems.map((i: any) => i.mixId));
    const newMixIds = mixIds.filter((mId: string) => !existingMixIds.has(mId));

    if (newMixIds.length === 0) {
      return res.json({ success: true, addedCount: 0, message: 'All selected mixes are already in the playlist' });
    }

    let pos = currentCount;
    const createData = newMixIds.map((mId: string) => ({
      playlistId: id,
      mixId: mId,
      position: ++pos,
    }));

    await prisma.officialPlaylistItem.createMany({
      data: createData,
      skipDuplicates: true,
    });

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: 'BULK_ADD_MIXES_TO_PLAYLIST',
      targetType: 'PLAYLIST',
      targetId: id,
      targetName: `${newMixIds.length} mixes -> ${playlist.title}`,
    });

    return res.json({ success: true, addedCount: newMixIds.length });
  } catch (error: any) {
    logger.error('Error bulk adding mixes to playlist:', error);
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// Reorder playlist items
router.put('/playlists/:id/reorder', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { itemIds } = req.body; // ordered array of officialPlaylistItem IDs
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return fail(res, 400, 'itemIds array required');
    }

    const updates = itemIds.map((itemId: string, index: number) =>
      prisma.officialPlaylistItem.update({
        where: { id: itemId },
        data: { position: index + 1 },
      })
    );

    await prisma.$transaction(updates);

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: 'REORDER_OFFICIAL_PLAYLIST',
      targetType: 'PLAYLIST',
      targetId: id,
      reason: 'Reordered tracklist sequence',
    });

    return res.json({ success: true, message: 'Playlist reordered successfully' });
  } catch (error: any) {
    logger.error('Error reordering playlist:', error);
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// Remove item from playlist and re-sequence remaining items
router.delete('/playlists/:id/items/:itemId', async (req: any, res: any) => {
  try {
    const { id, itemId } = req.params;
    await prisma.officialPlaylistItem.delete({ where: { id: itemId } });

    // Resequence remaining items
    const remainingItems = await prisma.officialPlaylistItem.findMany({
      where: { playlistId: id },
      orderBy: { position: 'asc' },
    });

    if (remainingItems.length > 0) {
      const updates = remainingItems.map((item: any, idx: number) =>
        prisma.officialPlaylistItem.update({
          where: { id: item.id },
          data: { position: idx + 1 },
        })
      );
      await prisma.$transaction(updates);
    }

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: 'REMOVE_MIX_FROM_PLAYLIST',
      targetType: 'PLAYLIST',
      targetId: id,
    });

    return res.json({ success: true, message: 'Item removed from playlist' });
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

const { recalculateAllRankingsV2 } = require('../utils/rankingAlgorithm');

/* ─────────────────────────────────────────────────────────────
   4. DJ RANKING MANAGEMENT & AUDIT TRAIL
   GET /api/moderator/rankings
   POST /api/moderator/rankings/recalculate
   POST /api/moderator/rankings/adjust
   POST /api/moderator/djs/:id/feature
   ───────────────────────────────────────────────────────────── */
router.get('/rankings', async (req: any, res: any) => {
  try {
    const djs = await prisma.djProfile.findMany({
      orderBy: [
        { rankingScore: 'desc' },
        { monthlyListeners: 'desc' },
        { totalMixUploads: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        stageName: true,
        avatar: true,
        city: true,
        verified: true,
        rankingPosition: true,
        rankingScore: true,
        communityScore: true,
        industryScore: true,
        monthlyListeners: true,
        totalMixUploads: true,
        isModeratorFeatured: true,
        isRisingDj: true,
        user: { select: { id: true, username: true, email: true } },
      },
    });

    // Assign clean sequential, deduplicated rankings based on actual scores
    const deduplicated = djs.map((dj: any, index: number) => ({
      ...dj,
      rankingPosition: index + 1,
    }));

    return ok(res, deduplicated);
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// Recalculate all rankings via platform scoring algorithm
router.post('/rankings/recalculate', async (req: any, res: any) => {
  try {
    if (typeof recalculateAllRankingsV2 === 'function') {
      await recalculateAllRankingsV2();
    }

    const djs = await prisma.djProfile.findMany({
      orderBy: [
        { rankingScore: 'desc' },
        { monthlyListeners: 'desc' },
        { totalMixUploads: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        stageName: true,
        avatar: true,
        city: true,
        verified: true,
        rankingPosition: true,
        rankingScore: true,
        communityScore: true,
        industryScore: true,
        monthlyListeners: true,
        totalMixUploads: true,
        isModeratorFeatured: true,
        isRisingDj: true,
        user: { select: { id: true, username: true, email: true } },
      },
    });

    const deduplicated = djs.map((dj: any, index: number) => ({
      ...dj,
      rankingPosition: index + 1,
    }));

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.username || req.user.email || req.user.name || 'Moderator',
      action: 'RECALCULATE_RANKINGS',
      targetType: 'SYSTEM',
      targetName: 'Leaderboard Algorithm',
      newData: { totalDjs: deduplicated.length },
    });

    return ok(res, deduplicated, 'All platform rankings successfully recalculated and synchronized!');
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// Manual ranking position/score adjustment with required audit log
router.post('/rankings/adjust', async (req: any, res: any) => {
  try {
    const { djId, newPosition, newScore, reason } = req.body;
    if (!djId || !reason || reason.trim() === '') {
      return fail(res, 400, 'djId and a mandatory reason are required for audit trail');
    }

    const dj = await prisma.djProfile.findUnique({
      where: { id: djId },
      select: { id: true, stageName: true, rankingPosition: true, rankingScore: true },
    });
    if (!dj) return fail(res, 404, 'DJ profile not found');

    const previousPosition = dj.rankingPosition;
    const previousScore = dj.rankingScore;

    const updateData: any = {};
    if (newPosition !== undefined) updateData.rankingPosition = Number(newPosition);
    if (newScore !== undefined) updateData.rankingScore = Number(newScore);

    const updated = await prisma.djProfile.update({
      where: { id: djId },
      data: updateData,
    });

    // Record entry in RankingHistory for historical audit
    await prisma.rankingHistory.create({
      data: {
        djId,
        position: updated.rankingPosition,
        score: updated.rankingScore,
        communityScore: dj.rankingScore,
        industryScore: 0,
      },
    }).catch(() => {});

    // Mandatory Moderator Audit Log
    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: 'RANKING_ADJUSTMENT',
      targetType: 'RANKING',
      targetId: djId,
      targetName: dj.stageName,
      previousData: { position: previousPosition, score: previousScore },
      newData: { position: updated.rankingPosition, score: updated.rankingScore },
      reason: reason.trim(),
    });

    return ok(res, updated, `Ranking updated for ${dj.stageName}. Adjustment logged in audit trail.`);
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// Feature DJ or Highlight Rising DJ
router.post('/djs/:id/feature', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { isModeratorFeatured, isRisingDj } = req.body;

    const dj = await prisma.djProfile.findFirst({
      where: {
        OR: [{ id }, { userId: id }],
      },
    });
    if (!dj) return fail(res, 404, 'DJ profile not found');

    const updateData: any = {};
    if (isModeratorFeatured !== undefined) updateData.isModeratorFeatured = Boolean(isModeratorFeatured);
    if (isRisingDj !== undefined) updateData.isRisingDj = Boolean(isRisingDj);

    const updated = await prisma.djProfile.update({
      where: { id: dj.id },
      data: updateData,
      select: {
        id: true,
        stageName: true,
        avatar: true,
        city: true,
        verified: true,
        rankingPosition: true,
        rankingScore: true,
        communityScore: true,
        industryScore: true,
        monthlyListeners: true,
        totalMixUploads: true,
        isModeratorFeatured: true,
        isRisingDj: true,
        user: { select: { id: true, username: true, email: true } },
      },
    });

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.username || req.user.email || req.user.name || 'Moderator',
      action: 'FEATURE_DJ',
      targetType: 'DJ',
      targetId: dj.id,
      targetName: dj.stageName,
      newData: updateData,
    });

    return ok(res, updated);
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─────────────────────────────────────────────────────────────
   5. REPORTS & COMMUNITY MODERATION
   GET /api/moderator/reports
   POST /api/moderator/reports/:id/action
   ───────────────────────────────────────────────────────────── */
router.get('/reports', async (req: any, res: any) => {
  try {
    const status = req.query.status as string;
    const where: any = {};
    if (status && status !== 'ALL') where.status = status;

    const reports = await prisma.violationReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, username: true, email: true, avatar: true } },
        targetUser: { select: { id: true, username: true, email: true, avatar: true, status: true } },
        mix: { select: { id: true, title: true, coverImage: true, isPublic: true } },
        event: { select: { id: true, title: true } },
        comment: { select: { id: true, content: true } },
      },
    });

    return ok(res, reports);
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.post('/reports/:id/action', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    // Action types: 'NO_VIOLATION' | 'WARNING' | 'REMOVE_CONTENT' | 'UNPUBLISH' | 'RESTRICT' | 'ESCALATE_ADMIN'

    const report = await prisma.violationReport.findUnique({
      where: { id },
      include: { mix: true, targetUser: true },
    });
    if (!report) return fail(res, 404, 'Report not found');

    let status = 'RESOLVED';
    let actionTaken = action || 'RESOLVED';

    if (action === 'NO_VIOLATION') {
      status = 'DISMISSED';
      actionTaken = 'NO_VIOLATION';
    } else if (action === 'REMOVE_CONTENT' || action === 'UNPUBLISH') {
      if (report.mixId) {
        await prisma.mix.update({
          where: { id: report.mixId },
          data: { isPublic: false, flaggedForReview: true, flaggedReason: notes || 'Unpublished due to community report' },
        });
      }
    } else if (action === 'ESCALATE_ADMIN') {
      status = 'INVESTIGATING';
      actionTaken = 'ESCALATED_TO_ADMIN';
      if (report.mixId) {
        await prisma.mix.update({
          where: { id: report.mixId },
          data: { flaggedForReview: true, flaggedReason: notes || 'Escalated to Super Admin' },
        });
      }
    }

    const updatedReport = await prisma.violationReport.update({
      where: { id },
      data: {
        status: status as any,
        actionTaken,
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
      },
    });

    await createModeratorLog({
      moderatorId: req.user.id,
      moderatorName: req.user.name || req.user.email,
      action: `REPORT_ACTION_${actionTaken}`,
      targetType: 'REPORT',
      targetId: id,
      targetName: report.reason,
      reason: notes || `Moderator action: ${actionTaken}`,
    });

    return ok(res, updatedReport);
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/* ─────────────────────────────────────────────────────────────
   6. AUDIT LOGS
   GET /api/moderator/audit-logs
   ───────────────────────────────────────────────────────────── */
router.get('/audit-logs', async (req: any, res: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));

    const [total, logs] = await Promise.all([
      prisma.moderatorAuditLog.count(),
      prisma.moderatorAuditLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('[moderator.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
