const express = require('express');
const { prisma } = require('../utils/prisma');

const router = express.Router();

const sanitize = (s: string) => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderMetaHtml(params: {
  title: string;
  description: string;
  url: string;
  image: string;
  type?: string;
}) {
  const { title, description, url, image, type = 'website' } = params;
  const safeTitle = sanitize(title);
  const safeDescription = sanitize(description);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="The Deck Salone">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${image}">
  <link rel="canonical" href="${url}">
  <script>window.location.replace(${JSON.stringify(url)});</script>
</head>
<body>
  <p>Redirecting to <a href="${url}">${safeTitle}</a>...</p>
</body>
</html>`;
}

/**
 * GET /og/dj/:identifier
 */
router.get('/dj/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const dj = await prisma.djProfile.findFirst({
      where: {
        OR: [
          { id: identifier },
          { user: { username: { equals: identifier, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        stageName: true,
        bio: true,
        avatar: true,
        coverBanner: true,
        user: { select: { username: true } },
      },
    });

    if (!dj) {
      return res.status(404).send('<h1>DJ Not Found</h1>');
    }

    const profileUrl = `${baseUrl}/dj/${dj.user.username || dj.id}`;
    const title = `${dj.stageName} — The Deck Salone`;
    const description =
      dj.bio?.slice(0, 200) ||
      `Check out ${dj.stageName} on The Deck Salone, Sierra Leone's premier DJ platform.`;
    const image = dj.avatar || dj.coverBanner || `${baseUrl}/cover-placeholder.jpg`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(renderMetaHtml({ title, description, url: profileUrl, image, type: 'profile' }));
  } catch (error) {
    return res.status(500).send('<h1>Server Error</h1>');
  }
});

/**
 * GET /og/mix/:id
 */
router.get('/mix/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const mix = await prisma.mix.findUnique({
      where: { id },
      include: {
        dj: { select: { id: true, stageName: true, avatar: true, user: { select: { username: true } } } },
      },
    });

    if (!mix) {
      return res.status(404).send('<h1>Mix Not Found</h1>');
    }

    const mixUrl = `${baseUrl}/mix/${mix.id}`;
    const djName = mix.dj?.stageName || 'DJ';
    const title = `${mix.title} by ${djName} — The Deck Salone`;
    const description =
      mix.description?.slice(0, 200) ||
      `Listen to "${mix.title}" by ${djName} on The Deck Salone.`;
    const image = mix.coverImage || mix.dj?.avatar || `${baseUrl}/mix-placeholder.jpg`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(renderMetaHtml({ title, description, url: mixUrl, image, type: 'music.song' }));
  } catch (error) {
    return res.status(500).send('<h1>Server Error</h1>');
  }
});

/**
 * GET /og/user/:username
 */
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatar: true,
        location: true,
      },
    });

    if (!user) {
      return res.status(404).send('<h1>User Not Found</h1>');
    }

    const profileUrl = `${baseUrl}/user/${user.username}`;
    const displayName = user.name || user.username;
    const title = `${displayName} — The Deck Salone`;
    const description =
      user.bio?.slice(0, 200) ||
      `Check out ${displayName}'s profile on The Deck Salone.`;
    const image = user.avatar || `${baseUrl}/default-avatar.jpg`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(renderMetaHtml({ title, description, url: profileUrl, image, type: 'profile' }));
  } catch (error) {
    return res.status(500).send('<h1>Server Error</h1>');
  }
});

module.exports = router;
