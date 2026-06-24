const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { voteLimiter } = require('../utils/rateLimiter');
const { calculateBattleBaseScore } = require('../utils/ranking');

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
      return res.status(400).json({ success: false, error: 'Invalid filter parameters' });
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
    return res.status(500).json({ success: false, error: error.message });
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
      return res.json({ success: true, data: null, message: 'No active battle' });
    }

    // Enrich entries with vote counts and positions
    const enrichedEntries = battle.entries.map((entry, index) => ({
      ...entry,
      position: index + 1,
      voteCount: entry.votesCast.length,
    }));

    return res.json({
      success: true,
      data: { ...battle, entries: enrichedEntries },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
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
      return res.status(404).json({ success: false, error: 'Battle not found' });
    }

    const enrichedEntries = battle.entries.map((entry, index) => ({
      ...entry,
      position: index + 1,
      voteCount: entry.votesCast.length,
    }));

    return res.json({
      success: true,
      data: { ...battle, entries: enrichedEntries },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/battles - Create battle (admin/moderator only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const parsed = createBattleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/battles/:id/enter - Enter battle as DJ
router.post('/:id/enter', authMiddleware, async (req, res) => {
  try {
    const parsed = enterBattleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const dj = await prisma.djProfile.findUnique({ where: { userId: req.user.id } });
    if (!dj) {
      return res.status(403).json({ success: false, error: 'Must be a DJ to enter battles' });
    }

    const battle = await prisma.battle.findUnique({
      where: { id: req.params.id },
      include: { entries: true },
    });

    if (!battle || battle.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Battle is not active' });
    }

    // Check if DJ already entered
    const existing = battle.entries.find((e) => e.djId === dj.id);
    if (existing) {
      return res.status(409).json({ success: false, error: 'You already entered this battle' });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/battles/:id/vote - Vote for an entry
router.post('/:id/vote', authMiddleware, voteLimiter, async (req, res) => {
  try {
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { entryId } = parsed.data;

    const battle = await prisma.battle.findUnique({
      where: { id: req.params.id },
      include: { entries: true },
    });

    if (!battle || battle.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Battle is not active' });
    }

    // Check if entry belongs to this battle
    const entry = battle.entries.find((e) => e.id === entryId);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found in this battle' });
    }

    // Check if user already voted
    const existingVote = await prisma.battleVote.findUnique({
      where: { entryId_userId: { entryId, userId: req.user.id } },
    });
    if (existingVote) {
      return res.status(409).json({ success: false, error: 'You already voted for this entry' });
    }

    // Check if user voted for another entry in this battle
    const otherVotes = await prisma.battleVote.findFirst({
      where: {
        userId: req.user.id,
        entry: { battleId: req.params.id },
      },
    });
    if (otherVotes) {
      return res.status(409).json({ success: false, error: 'You already voted in this battle' });
    }

    const vote = await prisma.battleVote.create({
      data: {
        entryId,
        userId: req.user.id,
      },
    });

    // Update entry vote count and recalculate final score
    const updatedEntry = await prisma.battleEntry.update({
      where: { id: entryId },
      data: { votes: { increment: 1 } },
    });

    // Recalculate final score: baseScore (60%) + voteScore (40%)
    // Vote score = (votes / totalVotesInBattle) * 100 * 0.4
    const allEntries = await prisma.battleEntry.findMany({
      where: { battleId: req.params.id },
      select: { id: true, votes: true, baseScore: true },
    });

    const totalVotes = allEntries.reduce((sum, e) => sum + e.votes, 0);

    // Recalculate final scores for all entries in this battle
    for (const e of allEntries) {
      const voteShare = totalVotes > 0 ? e.votes / totalVotes : 0;
      const voteScore = voteShare * 40; // 40% weight for votes
      const finalScore = e.baseScore * 0.6 + voteScore; // 60% weight for base score

      await prisma.battleEntry.update({
        where: { id: e.id },
        data: { voteScore, finalScore: Math.round(finalScore * 100) / 100 },
      });
    }

    return res.json({ success: true, data: vote });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/battles/:id/close - Close a battle and declare winners (admin/moderator)
router.post('/:id/close', authMiddleware, async (req, res) => {
  try {
    if (!['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
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
      return res.status(404).json({ success: false, error: 'Battle not found' });
    }

    if (battle.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Battle is already closed' });
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

    return res.json({
      success: true,
      data: {
        battle: updated,
        winners: sortedEntries.slice(0, 3).map((e, i) => ({
          position: i + 1,
          dj: e.dj,
          score: e.finalScore,
          votes: e.votesCast.length,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
