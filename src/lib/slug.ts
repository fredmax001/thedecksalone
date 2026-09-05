/**
 * Frontend slug and mix URL utilities
 */

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove special chars
    .replace(/[\s_-]+/g, '-') // collapse whitespace and underscores to hyphen
    .replace(/^-+|-+$/g, ''); // trim hyphens
}

export interface MixUrlSource {
  id: string;
  slug?: string | null;
  title?: string;
  dj?: {
    stageName?: string;
    user?: {
      username?: string;
    };
  } | string | null;
  djName?: string;
  djUsername?: string;
}

/**
 * Returns clean hearthis-style URL path: /djusername/mix-slug
 * Example: /djfredmax/salone-mix-vol-xvi
 */
export function getMixUrl(mix: MixUrlSource): string {
  if (!mix) return '/mixes';

  let djPart = '';
  if (mix.djUsername) {
    djPart = mix.djUsername;
  } else if (typeof mix.dj === 'object' && mix.dj) {
    djPart = mix.dj.user?.username || slugify(mix.dj.stageName || '') || 'dj';
  } else if (typeof mix.dj === 'string' && mix.dj) {
    djPart = slugify(mix.dj);
  } else if (mix.djName) {
    djPart = slugify(mix.djName);
  } else {
    djPart = 'djfredmax';
  }

  const mixSlug = mix.slug || slugify(mix.title || mix.id) || mix.id;
  return `/${djPart}/${mixSlug}`;
}

/**
 * Returns full absolute URL: https://decksalone.com/djusername/mix-slug
 */
export function getMixShareUrl(mix: MixUrlSource, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://decksalone.com');
  const path = getMixUrl(mix);
  return `${base}${path}`;
}
