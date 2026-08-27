const axios = require('axios');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export type AudioPlatform =
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

interface HearthisParts {
  artist: string;
  slug: string;
  isSet?: boolean;
}

export function parseHearthisUrl(url: string): HearthisParts | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  // Paths: /artist/slug/ or /artist/slug
  const singleMatch = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
  if (singleMatch) {
    const artist = decodeURIComponent(singleMatch[1]);
    const slug = decodeURIComponent(singleMatch[2]);
    // Reject static pages like /search, /tags, etc.
    if (
      !['search', 'tags', 'genres', 'charts', 'login', 'register', 'upload'].includes(
        artist.toLowerCase()
      )
    ) {
      return { artist, slug };
    }
  }

  // Set/playlist paths: /artist/set/slug/ or /artist/set/slug
  const setMatch = parsed.pathname.match(/^\/([^/]+)\/set\/([^/]+)\/?$/);
  if (setMatch) {
    const artist = decodeURIComponent(setMatch[1]);
    const slug = decodeURIComponent(setMatch[2]);
    return { artist, slug, isSet: true };
  }

  return null;
}

async function followAudioRedirect(url: string, depth = 0): Promise<string> {
  if (depth > 5) return url;
  try {
    const res = await axios.head(url, {
      maxRedirects: 0,
      timeout: 10000,
      validateStatus: () => true,
    });
    if (res.status >= 200 && res.status < 300) {
      return res.request?.res?.responseUrl || url;
    }
    const location = res.headers?.location;
    if (location && [301, 302, 303, 307, 308].includes(res.status)) {
      return followAudioRedirect(location, depth + 1);
    }
  } catch (err: any) {
    const response = err?.response;
    if (
      response &&
      [301, 302, 303, 307, 308].includes(response.status) &&
      response.headers?.location
    ) {
      return followAudioRedirect(response.headers.location, depth + 1);
    }
  }
  return url;
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

    const resolved = resolveHearthisTrackData(data);
    if (!resolved) return null;

    // Follow signed redirect chain to the actual MP3 file.
    resolved.audioUrl = await followAudioRedirect(resolved.audioUrl);
    return resolved;
  } catch (err) {
    console.warn('[audioResolver] Hearthis resolution failed:', err.message);
    return null;
  }
}

function resolveHearthisTrackData(data: any): ResolvedAudio | null {
  // Prefer stream_url because it resolves directly to an MP3; download_url often
  // redirects through a temporary secret page that is less reliable for playback.
  const streamUrl = data.stream_url || data.download_url;
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
}

export async function resolveHearthisSet(
  url: string
): Promise<Array<{ resolved: ResolvedAudio; originalUrl: string }>> {
  const parts = parseHearthisUrl(url);
  if (!parts || !parts.isSet) return [];

  try {
    const { data } = await axios.get(
      `https://api-v2.hearthis.at/${encodeURIComponent(parts.artist)}/set/${encodeURIComponent(
        parts.slug
      )}/`,
      { timeout: 15000 }
    );

    if (!Array.isArray(data)) return [];

    const results = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const resolved = resolveHearthisTrackData(item);
      if (!resolved) continue;

      // Resolve signed redirect chain to the final MP3.
      resolved.audioUrl = await followAudioRedirect(resolved.audioUrl);

      const originalUrl =
        item.permalink_url && typeof item.permalink_url === 'string'
          ? item.permalink_url
          : url;

      results.push({ resolved, originalUrl });
    }

    return results;
  } catch (err) {
    console.warn('[audioResolver] Hearthis set resolution failed:', err.message);
    return [];
  }
}

async function resolveSoundcloud(url: string): Promise<ResolvedAudio | null> {
  const normalized = normalizeUrl(url);
  const result: ResolvedAudio = {
    audioUrl: normalized,
    audioSource: 'soundcloud',
  };

  const key = RAPIDAPI_KEY || process.env.RAPIDAPI_KEY;
  if (!key) {
    console.warn('[audioResolver] RAPIDAPI_KEY is not set; skipping SoundCloud metadata enrichment');
    return result;
  }

  if (key) {
    try {
      const { data } = await axios.get('https://soundcloud4.p.rapidapi.com/song/info', {
        params: { track_url: normalized },
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'soundcloud4.p.rapidapi.com',
          'x-rapidapi-key': key,
        },
        timeout: 10000,
      });

      if (data && typeof data === 'object') {
        if (data.title && typeof data.title === 'string') {
          result.title = data.title;
        }
        if (data.duration) {
          const parsed = parseInt(data.duration, 10);
          if (!isNaN(parsed) && parsed > 0) {
            result.duration = Math.round(parsed / 1000);
          }
        }
        if (data.thumbnail && typeof data.thumbnail === 'string') {
          result.coverImage = data.thumbnail;
        } else if (data.author?.avatarURL && typeof data.author.avatarURL === 'string') {
          result.coverImage = data.author.avatarURL;
        }
      }
    } catch (err: any) {
      console.warn('[audioResolver] SoundCloud enrichment failed:', err.message);
    }
  }

  return result;
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
  resolveSoundcloud,
  parseHearthisUrl,
  resolveHearthisSet,
};
