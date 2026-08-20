const express = require('express');
const { prisma } = require('../utils/prisma');

const router = express.Router();
const DOMAIN = 'https://decksalone.com';

// GET /sitemap.xml — Dynamic XML Sitemap for Google Search Console
router.get('/', async (req: any, res: any) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Fetch active DJs, public mixes, events, and official playlists
    const [djs, mixes, events, playlists] = await Promise.all([
      prisma.djProfile.findMany({
        where: { isPublic: true },
        select: { stageName: true, user: { select: { username: true } }, updatedAt: true },
        take: 500,
      }).catch(() => []),
      prisma.mix.findMany({
        where: { isPublic: true },
        select: { id: true, updatedAt: true },
        take: 500,
      }).catch(() => []),
      prisma.event.findMany({
        select: { id: true, updatedAt: true },
        take: 500,
      }).catch(() => []),
      prisma.officialPlaylist.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
        take: 500,
      }).catch(() => []),
    ]);

    const staticRoutes = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/discover', priority: '0.9', changefreq: 'daily' },
      { url: '/rankings', priority: '0.9', changefreq: 'daily' },
      { url: '/mixes', priority: '0.9', changefreq: 'daily' },
      { url: '/playlists', priority: '0.9', changefreq: 'daily' },
      { url: '/events', priority: '0.8', changefreq: 'daily' },
      { url: '/hall-of-fame', priority: '0.8', changefreq: 'weekly' },
      { url: '/battles', priority: '0.8', changefreq: 'weekly' },
      { url: '/booking', priority: '0.7', changefreq: 'monthly' },
      { url: '/about', priority: '0.6', changefreq: 'monthly' },
      { url: '/help', priority: '0.5', changefreq: 'monthly' },
      { url: '/install', priority: '0.5', changefreq: 'monthly' },
      { url: '/terms', priority: '0.3', changefreq: 'yearly' },
      { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static canonical URLs
    for (const route of staticRoutes) {
      xml += `  <url>\n`;
      xml += `    <loc>${DOMAIN}${route.url}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic DJ Profile URLs
    for (const dj of djs) {
      const handle = dj.user?.username || dj.stageName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const lastMod = dj.updatedAt ? new Date(dj.updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n`;
      xml += `    <loc>${DOMAIN}/dj/${encodeURIComponent(handle)}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic Mix Detail URLs
    for (const mix of mixes) {
      const lastMod = mix.updatedAt ? new Date(mix.updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n`;
      xml += `    <loc>${DOMAIN}/mix/${mix.id}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic Official Playlist URLs
    for (const pl of playlists) {
      const lastMod = pl.updatedAt ? new Date(pl.updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n`;
      xml += `    <loc>${DOMAIN}/playlist/${encodeURIComponent(pl.slug)}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic Event URLs
    for (const evt of events) {
      const lastMod = evt.updatedAt ? new Date(evt.updatedAt).toISOString().split('T')[0] : today;
      xml += `  <url>\n`;
      xml += `    <loc>${DOMAIN}/events/${evt.id}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.set('Content-Type', 'text/xml');
    return res.status(200).send(xml);
  } catch (error: any) {
    console.error('[Sitemap Error]', error);
    return res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
