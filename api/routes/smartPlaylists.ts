const express = require('express');
const { prisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { ok, fail } = require('../utils/response');
const { generateSmartPlaylistItems } = require('../services/smartPlaylist.service');

const router = express.Router();

// Attach generated items to a smart playlist (shape mirrors official playlist responses)
async function withItems(playlist: any, take = 4) {
  const { items, total } = await generateSmartPlaylistItems(playlist);
  return {
    ...playlist,
    items: items.slice(0, take).map((mix: any, i: number) => ({
      id: `${playlist.id}-item-${mix.id}`,
      position: i,
      mix,
    })),
    trackCount: total,
    isSmart: true,
  };
}

// GET /api/smart-playlists - List published smart playlists
router.get('/', async (req: any, res: any) => {
  try {
    const featuredOnly = req.query.featured === 'true';
    const where: any = { isPublished: true };
    if (featuredOnly) where.isFeatured = true;

    const playlists = await prisma.smartPlaylist.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    const withPreviews = await Promise.all(playlists.map((p: any) => withItems(p)));
    return ok(res, withPreviews);
  } catch (error: any) {
    logger.error('Error fetching smart playlists:', error.message);
    return fail(res, 500, 'Failed to load smart playlists');
  }
});

// GET /api/smart-playlists/:slug - Get single smart playlist by slug with full generated tracklist
router.get('/:slug', async (req: any, res: any) => {
  try {
    const { slug } = req.params;
    const playlist = await prisma.smartPlaylist.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        isPublished: true,
      },
    });

    if (!playlist) {
      return fail(res, 404, 'Smart playlist not found');
    }

    return ok(res, await withItems(playlist, playlist.trackLimit || 20));
  } catch (error: any) {
    logger.error('Error fetching smart playlist detail:', error.message);
    return fail(res, 500, 'Failed to load smart playlist details');
  }
});

module.exports = router;
