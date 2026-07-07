const axios = require('axios');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export type AudioPlatform =
  | 'audiomack'
  | 'hearthis'
  | 'soundcloud'
  | 'youtube'
  | 'mixcloud'
  | 'upload'
  | 'direct'
  | null;

export interface ResolvedAudio {
  audioUrl: string;
  audioSource: Exclude<AudioPlatform, null>;
  title?: string;
  duration?: number;
  coverImage?: string;
}

const DIRECT_AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a|aac|flac|weba)(\?.*)?$/i;

function normalizeUrl(url: string): string {
  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(normalizeUrl(url));
  } catch {
    return null;
  }
}

export function detectPlatform(url: string): AudioPlatform {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === 'audiomack.com' || hostname.endsWith('.audiomack.com')) {
    return 'audiomack';
  }
  if (hostname === 'hearthis.at' || hostname.endsWith('.hearthis.at')) {
    return 'hearthis';
  }
  if (hostname === 'soundcloud.com' || hostname.endsWith('.soundcloud.com')) {
    return 'soundcloud';
  }
  if (
    hostname === 'youtube.com' ||
    hostname === 'www.youtube.com' ||
    hostname === 'youtu.be' ||
    hostname.endsWith('.youtube.com')
  ) {
    return 'youtube';
  }
  if (hostname === 'mixcloud.com' || hostname.endsWith('.mixcloud.com')) {
    return 'mixcloud';
  }
  if (
    DIRECT_AUDIO_EXTENSIONS.test(parsed.pathname) ||
    parsed.pathname.startsWith('/uploads/')
  ) {
    return 'upload';
  }
  return null;
}

interface AudiomackParts {
  type: 'song' | 'album' | 'playlist';
  artist: string;
  slug: string;
}

export function parseAudiomackUrl(url: string): AudiomackParts | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  // Supported paths:
  // /artist/song/slug
  // /artist/album/slug
  // /artist/playlist/slug
  const match = parsed.pathname.match(/^\/([^/]+)\/(song|album|playlist)\/([^/]+)\/?$/);
  if (!match) return null;

  return {
    type: match[2] as AudiomackParts['type'],
    artist: decodeURIComponent(match[1]),
    slug: decodeURIComponent(match[3]),
  };
}

export function buildAudiomackEmbedUrl(parts: AudiomackParts): string {
  return `https://audiomack.com/embed/${parts.type}/${encodeURIComponent(
    parts.artist
  )}/${encodeURIComponent(parts.slug)}`;
}

interface HearthisParts {
  artist: string;
  slug: string;
}

export function parseHearthisUrl(url: string): HearthisParts | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  // Paths: /artist/slug/ or /artist/slug
  const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  const artist = decodeURIComponent(match[1]);
  const slug = decodeURIComponent(match[2]);
  // Reject static pages like /search, /tags, etc.
  if (
    ['search', 'tags', 'genres', 'charts', 'login', 'register', 'upload'].includes(
      artist.toLowerCase()
    )
  ) {
    return null;
  }
  return { artist, slug };
}

async function resolveAudiomack(url: string): Promise<ResolvedAudio | null> {
  const parts = parseAudiomackUrl(url);
  if (!parts) return null;

  const result: ResolvedAudio = {
    audioUrl: buildAudiomackEmbedUrl(parts),
    audioSource: 'audiomack',
  };

  // Optional enrichment via RapidAPI if a key is configured.
  if (RAPIDAPI_KEY) {
    try {
      const { data } = await axios.get(
        'https://audiomack-scraper.p.rapidapi.com/audiomack/song',
        {
          params: { url: normalizeUrl(url) },
          headers: {
            'x-rapidapi-host': 'audiomack-scraper.p.rapidapi.com',
            'x-rapidapi-key': RAPIDAPI_KEY,
          },
          timeout: 8000,
        }
      );
      if (data && typeof data === 'object') {
        if (data.title && typeof data.title === 'string') {
          result.title = data.title;
        }
        if (data.duration) {
          const parsedDuration = parseInt(data.duration, 10);
          if (!isNaN(parsedDuration) && parsedDuration > 0) {
            result.duration = parsedDuration;
          }
        }
        if (data.image && typeof data.image === 'string') {
          result.coverImage = data.image;
        } else if (data.image_base && typeof data.image_base === 'string') {
          result.coverImage = data.image_base;
        }
      }
    } catch (err) {
      // Non-fatal: we still have a working embed URL.
      console.warn('[audioResolver] Audiomack enrichment failed:', err.message);
    }
  }

  return result;
}

async function resolveHearthis(url: string): Promise<ResolvedAudio | null> {
  const parts = parseHearthisUrl(url);
  if (!parts) return null;

  try {
    const { data } = await axios.get(
      `https://api-v2.hearthis.at/${encodeURIComponent(parts.artist)}/${encodeURIComponent(
        parts.slug
      )}`,
      { timeout: 10000 }
    );

    if (!data || typeof data !== 'object') return null;

    const streamUrl = data.stream_url;
    if (!streamUrl || typeof streamUrl !== 'string') return null;

    const durationRaw = data.duration;
    let duration: number | undefined;
    if (durationRaw) {
      const parsed = parseInt(durationRaw, 10);
      if (!isNaN(parsed) && parsed > 0) duration = parsed;
    }

    return {
      audioUrl: streamUrl,
      audioSource: 'hearthis',
      title: data.title && typeof data.title === 'string' ? data.title : undefined,
      duration,
      coverImage:
        data.artwork_url && typeof data.artwork_url === 'string'
          ? data.artwork_url
          : undefined,
    };
  } catch (err) {
    console.warn('[audioResolver] Hearthis resolution failed:', err.message);
    return null;
  }
}

function resolveDirect(url: string): ResolvedAudio | null {
  const platform = detectPlatform(url);
  if (platform === 'upload' || platform === 'direct') {
    return { audioUrl: url, audioSource: 'upload' };
  }
  return null;
}

/**
 * Convert a pasted audio link into a playable source for Deck Salone.
 * Returns null for unsupported/unresolvable URLs.
 */
export async function resolveAudioUrl(
  url: string
): Promise<ResolvedAudio | null> {
  if (!url || typeof url !== 'string') return null;

  const platform = detectPlatform(url);

  if (platform === 'audiomack') {
    return resolveAudiomack(url);
  }
  if (platform === 'hearthis') {
    return resolveHearthis(url);
  }

  const direct = resolveDirect(url);
  if (direct) return direct;

  return null;
}

module.exports = {
  detectPlatform,
  resolveAudioUrl,
  parseAudiomackUrl,
  buildAudiomackEmbedUrl,
  parseHearthisUrl,
};
