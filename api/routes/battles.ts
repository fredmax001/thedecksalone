const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { voteLimiter } = require('../utils/rateLimiter');
const { calculateBattleBaseScore } = require('../utils/ranking');
const { ok, fail } = require('../utils/response');

const router = express.Router();

const battleFilterSchema = z.object({
  status: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const createBattleSchema = z.object({
  title: z.string().min(1).max(200),
  weekStart: z.string().datetime(),
  weekEnd: z.string().datetime(),
  theme: z.string().optional(),
  metricType: z.enum(['COMPOSITE', 'PLAYS', 'STREAMS', 'FOLLOWERS', 'LIKES']).optional(),
});

const enterBattleSchema = z.object({
  mixId: z.string().optional(),
});

const voteSchema = z.object({
  entryId: z.string(),
});

/**
 * The Deck Salone Battle System — Metric-Based Weekly Competition
 * =================================================================
 * Battles are NOT live DJ battles. They are weekly metric-based competitions
 * where DJs enter by submitting a mix, and their performance is scored using:
 * 1. Base Score (60%) — Calculated from DJ metrics (plays, streams, followers, etc.)
 * 2. Vote Score (40%) — Derived from community votes
 *
 * This ensures battles are fair, transparent, and resistant to manipulation.
 */

// GET /api/battles - List battles
router.get('/', async (req, res) => {
  try {
    const parsed = battleFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid filter parameters');
    }

    const { status, page, limit } = parsed.data;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;

    const [battles, total] = await Promise.all([
      prisma.battle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          entries: {
            include: {
              dj: { select: { id: true, stageName: true, avatar: true } },
              votesCast: { select: { id: true } },
            },
          },
        },
      }),
      prisma.battle.count({ where }),
    ]);

    return res.json({
      success: true,
      data: battles,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('[battles.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/battles/current - Get current active battle with leaderboard
router.get('/current', async (req, res) => {
  try {
    const battle = await prisma.battle.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        entries: {
          include: {
            dj: { select: { id: true, stageName: true, avatar: true } },
            votesCast: { select: { id: true } },
          },
          orderBy: { finalScore: 'desc' },
        },
      },
    });

    if (!battle) {
      return ok(res, null, 'No active battle');
    }

    // Enrich entries with vote counts and positions
    const enrichedEntries = battle.entries.map((entry, index) => ({
      ...entry,
      position: index + 1,
      voteCount: entry.votesCast.length,
    }));

    return ok(res, { ...battle, entries: enrichedEntries });
  } catch (error) {
    console.error('[battles.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// GET /api/battles/:id - Get single battle
router.get('/:id', async (req, res) => {
  try {
    const battle = await prisma.battle.findUnique({
      where: { id: req.params.id },
      include: {
        entries: {
          include: {
            dj: { select: { id: true, stageName: true, avatar: true } },
            votesCast: { select: { id: true } },
          },
          orderBy: { finalScore: 'desc' },
        },
      },
    });

    if (!battle) {
      return fail(res, 404, 'Battle not found');
    }

    const enrichedEntries = battle.entries.map((entry, index) => ({
      ...entry,
      position: index + 1,
      voteCount: entry.votesCast.length,
    }));

    return ok(res, { ...battle, entries: enrichedEntries });
  } catch (error) {
    console.error('[battles.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/battles - Create battle (admin/moderator only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return fail(res, 403, 'Forbidden');
    }

    const parsed = createBattleSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
    }

    const { title, weekStart, weekEnd, theme, metricType } = parsed.data;

    const battle = await prisma.battle.create({
      data: {
        title,
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        theme: theme || null,
        metricType: metricType || 'COMPOSITE',
      },
      include: { entries: true },
    });

    return res.status(201).json({ success: true, data: battle });
  } catch (error) {
    console.error('[battles.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/battles/:id/enter - Enter battle as DJ
router.post('/:id/enter', authMiddleware, async (req, res) => {
  try {
    const parsed = enterBattleSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input');
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return fail(res, 403, 'Must be a DJ to enter battles');
    }

    const battle = await prisma.battle.findUnique({
      where: { id: req.params.id },
      include: { entries: true },
    });

    if (!battle || battle.status !== 'ACTIVE') {
      return fail(res, 400, 'Battle is not active');
    }

    // Check if DJ already entered
    const existing = battle.entries.find((e) => e.djId === dj.id);
    if (existing) {
      return fail(res, 409, 'You already entered this battle');
    }

    // Calculate base score from DJ metrics at time of entry
    const baseScore = await calculateBattleBaseScore(dj.id, battle.metricType);

    const entry = await prisma.battleEntry.create({
      data: {
        battleId: req.params.id,
        djId: dj.id,
        mixId: parsed.data.mixId || null,
        baseScore,
        finalScore: baseScore, // Initially, final score = base score (no votes yet)
      },
      include: {
        dj: { select: { id: true, stageName: true, avatar: true } },
      },
    });

    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('[battles.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/battles/:id/vote - Vote for an entry
router.post('/:id/vote', authMiddleware, voteLimiter, async (req, res) => {
  try {
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input');
    }

    const { entryId } = parsed.data;

    const vote = await prisma.$transaction(async (tx: any) => {
      // 1. Verify battle status
      const battle = await tx.battle.findUnique({
        where: { id: req.params.id },
        include: { entries: true },
      });

      if (!battle || battle.status !== 'ACTIVE') {
        throw new Error('BATTLE_NOT_ACTIVE');
      }

      // 2. Check if entry belongs to this battle
      const entry = battle.entries.find((e: any) => e.id === entryId);
      if (!entry) {
        throw new Error('ENTRY_NOT_FOUND');
      }

      // 3. Check if user already voted for this entry
      const existingVote = await tx.battleVote.findUnique({
        where: { entryId_userId: { entryId, userId: req.user.id } },
      });
      if (existingVote) {
        throw new Error('ALREADY_VOTED_ENTRY');
      }

      // 4. Check if user voted for another entry in this battle
      const otherVotes = await tx.battleVote.findFirst({
        where: {
          userId: req.user.id,
          entry: { battleId: req.params.id },
        },
      });
      if (otherVotes) {
        throw new Error('ALREADY_VOTED_BATTLE');
      }

      // 5. Create vote
      const newVote = await tx.battleVote.create({
        data: {
          entryId,
          userId: req.user.id,
        },
      });

      // 6. Increment entry vote count
      await tx.battleEntry.update({
        where: { id: entryId },
        data: { votes: { increment: 1 } },
      });

      // 7. Atomically recalculate final scores: baseScore (60%) + voteScore (40%)
      const allEntries = await tx.battleEntry.findMany({
        where: { battleId: req.params.id },
        select: { id: true, votes: true, baseScore: true },
      });

      const totalVotes = allEntries.reduce((sum: number, e: any) => sum + e.votes, 0);

      for (const e of allEntries) {
        const voteShare = totalVotes > 0 ? e.votes / totalVotes : 0;
        const voteScore = voteShare * 40; // 40% weight for votes
        const finalScore = e.baseScore * 0.6 + voteScore; // 60% weight for base score

        await tx.battleEntry.update({
          where: { id: e.id },
          data: { voteScore, finalScore: Math.round(finalScore * 100) / 100 },
        });
      }

      return newVote;
    });

    return ok(res, vote);
  } catch (error: any) {
    if (error.message === 'BATTLE_NOT_ACTIVE') {
      return fail(res, 400, 'Battle is not active');
    }
    if (error.message === 'ENTRY_NOT_FOUND') {
      return fail(res, 404, 'Entry not found in this battle');
    }
    if (error.message === 'ALREADY_VOTED_ENTRY') {
      return fail(res, 409, 'You already voted for this entry');
    }
    if (error.message === 'ALREADY_VOTED_BATTLE') {
      return fail(res, 409, 'You already voted in this battle');
    }
    console.error('[battles.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});


// POST /api/battles/:id/close - Close a battle and declare winners (admin/moderator)
router.post('/:id/close', authMiddleware, async (req, res) => {
  try {
    if (!['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return fail(res, 403, 'Forbidden');
    }

    const battle = await prisma.battle.findUnique({
      where: { id: req.params.id },
      include: {
        entries: {
          include: {
            dj: { select: { id: true, stageName: true } },
            votesCast: { select: { id: true } },
          },
        },
      },
    });

    if (!battle) {
      return fail(res, 404, 'Battle not found');
    }

    if (battle.status !== 'ACTIVE') {
      return fail(res, 400, 'Battle is already closed');
    }

    // Sort entries by final score
    const sortedEntries = [...battle.entries].sort((a, b) => b.finalScore - a.finalScore);

    // Award badges to top 3
    for (let i = 0; i < Math.min(3, sortedEntries.length); i++) {
      const entry = sortedEntries[i];
      const badge = i === 0 ? 'Battle Champion' : i === 1 ? 'Battle Runner-Up' : 'Battle Third Place';

      await prisma.djProfile.update({
        where: { id: entry.djId },
        data: {
          badges: { push: badge },
          // Small ranking boost for winning
          rankingScore: { increment: i === 0 ? 2 : i === 1 ? 1 : 0.5 },
        },
      });
    }

    const updated = await prisma.battle.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' },
    });

    return ok(res, {
        battle: updated,
        winners: sortedEntries.slice(0, 3).map((e, i) => ({
          position: i + 1,
          dj: e.dj,
          score: e.finalScore,
          votes: e.votesCast.length,
        })),
      });
  } catch (error) {
    console.error('[battles.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
