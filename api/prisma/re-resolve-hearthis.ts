require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

function parseHearthisUrl(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    if (!match) return null;
    const artist = decodeURIComponent(match[1]);
    const slug = decodeURIComponent(match[2]);
    if (['search', 'tags', 'genres', 'charts', 'login', 'register', 'upload'].includes(artist.toLowerCase())) {
      return null;
    }
    return { artist, slug };
  } catch {
    return null;
  }
}

async function reResolveHearthisMixes() {
  try {
    // Find all mixes with HearThis URLs (either by source or URL pattern)
    const mixes = await prisma.mix.findMany({
      where: {
        OR: [
          { audioSource: 'hearthis' },
          { originalUrl: { contains: 'hearthis' } },
          { audioUrl: { contains: 'hearthis' } },
        ],
      },
    });

    console.log(`Found ${mixes.length} HearThis mixes to re-resolve`);

    for (const mix of mixes) {
      const urlToResolve = mix.originalUrl || mix.audioUrl;
      if (!urlToResolve) {
        console.log(`Skipping mix ${mix.id}: no URL to resolve`);
        continue;
      }

      const parts = parseHearthisUrl(urlToResolve);
      if (!parts) {
        console.log(`Skipping mix ${mix.id}: could not parse URL ${urlToResolve}`);
        continue;
      }

      try {
        const { data } = await axios.get(
          `https://api-v2.hearthis.at/${encodeURIComponent(parts.artist)}/${encodeURIComponent(parts.slug)}`,
          { timeout: 10000 }
        );

        if (!data || typeof data !== 'object') {
          console.log(`Mix ${mix.id}: API returned no data`);
          continue;
        }

        const streamUrl = data.download_url || data.stream_url;
        if (!streamUrl) {
          console.log(`Mix ${mix.id}: No stream URL found in API response`);
          continue;
        }

        const durationRaw = data.duration;
        let duration = mix.duration;
        if (durationRaw) {
          const parsed = parseInt(durationRaw, 10);
          if (!isNaN(parsed) && parsed > 0) duration = parsed;
        }

        const coverImage = data.artwork_url && typeof data.artwork_url === 'string'
          ? data.artwork_url
          : mix.coverImage;

        await prisma.mix.update({
          where: { id: mix.id },
          data: {
            audioUrl: streamUrl,
            audioSource: 'upload',
            duration,
            coverImage,
          },
        });

        console.log(`✅ Re-resolved mix ${mix.id}: ${mix.title} → ${streamUrl}`);
      } catch (err) {
        console.log(`❌ Failed to re-resolve mix ${mix.id}: ${err.message}`);
      }
    }

    console.log('Done re-resolving HearThis mixes');
  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reResolveHearthisMixes();
