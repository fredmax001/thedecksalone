const express = require('express');
const { prisma } = require('../utils/prisma');

const router = express.Router();

/**
 * GET /og/dj/:identifier
 * Serves an HTML page with Open Graph meta tags for social media sharing.
 * Bots (Twitter, Facebook, etc.) see meta tags; browsers get JS-redirected to the SPA.
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
    // Sanitize user content to prevent XSS in the meta tag attributes
    const sanitize = (s: string) => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const description = sanitize(
      dj.bio?.slice(0, 200) ||
        `Check out ${dj.stageName} on The Deck Salone, Sierra Leone's premier DJ platform.`
    );
    const image = dj.avatar || dj.coverBanner || `${baseUrl}/cover-placeholder.jpg`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitize(title)}</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${sanitize(title)}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${profileUrl}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="The Deck Salone">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${sanitize(title)}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
  <link rel="canonical" href="${profileUrl}">
  <script>window.location.replace(${JSON.stringify(profileUrl)});</script>
</head>
<body>
  <p>Redirecting to <a href="${profileUrl}">${sanitize(title)}</a>...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    return res.send(html);
  } catch (error) {
    return res.status(500).send('<h1>Server Error</h1>');
  }
});

module.exports = router;
