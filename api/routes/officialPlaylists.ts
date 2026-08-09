const express = require('express');
const { prisma } = require('../utils/prisma');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/official-playlists - List published official playlists
router.get('/', async (req: any, res: any) => {
  try {
    const featuredOnly = req.query.featured === 'true';
    const where: any = { isPublished: true };
    if (featuredOnly) where.isFeatured = true;

    const playlists = await prisma.officialPlaylist.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      include: {
        items: {
          take: 4,
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
        _count: { select: { items: true } },
      },
    });

    return res.json({ success: true, data: playlists });
  } catch (error: any) {
    logger.error('Error fetching official playlists:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to load official playlists' });
  }
});

// GET /api/official-playlists/:slug - Get single official playlist by slug
router.get('/:slug', async (req: any, res: any) => {
  try {
    const { slug } = req.params;
    const playlist = await prisma.officialPlaylist.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        isPublished: true,
      },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            mix: {
              include: {
                dj: {
                  select: {
                    id: true,
                    stageName: true,
                    avatar: true,
                    city: true,
                    verified: true,
                    user: { select: { username: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Official playlist not found' });
    }

    return res.json({ success: true, data: playlist });
  } catch (error: any) {
    logger.error('Error fetching official playlist detail:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to load official playlist details' });
  }
});

module.exports = router;
