/**
 * SSRF-safe image proxy helpers (UPL-4 / INFRA-5).
 *
 * Pure, exported functions so they can be unit-tested without booting the server:
 *  - isAllowedProxyHost(hostname)   host allowlist check
 *  - isPrivateIp(address)           private/loopback/link-local IP check (IPv4 + IPv6)
 *  - assertSafeProxyUrl(imageUrl)   async: parses, allowlists, DNS-resolves and
 *                                   rejects private IPs; throws { statusCode: 400 }
 */
const dns = require('dns').promises;

// Hosts the app actually proxies for (see src/components/StoryPosterModal.tsx and
// DJ-platform artwork). *.decksalone.com covers www/api + any future subdomains.
const ALLOWED_PROXY_HOSTS = new Set([
  'decksalone.com',
  'www.decksalone.com',
  'api.decksalone.com',
  // DJ platforms / CDNs whose artwork appears in stories & posters
  'soundcloud.com',
  'sndcdn.com',
  'i1.sndcdn.com',
  'hearthis.at',
  'mixcloud.com',
  'audiomack.com',
  'cloudinary.com',
  'res.cloudinary.com',
  'ytimg.com',
  'i.ytimg.com',
  'img.youtube.com',
  'googleusercontent.com',
  'fbcdn.net',
  'scontent.cdninstagram.com',
  'cdninstagram.com',
  'twimg.com',
  'pbs.twimg.com',
  'scdn.co',
  'i.scdn.co',
]);

function getAllowedHosts(): Set<string> {
  const hosts = new Set(ALLOWED_PROXY_HOSTS);
  // Optional env extension: IMAGE_PROXY_ALLOWED_HOSTS=host1.com,host2.com
  const extra = process.env.IMAGE_PROXY_ALLOWED_HOSTS;
  if (extra) {
    extra.split(',').forEach((h) => {
      const trimmed = h.trim().toLowerCase();
      if (trimmed) hosts.add(trimmed);
    });
  }
  return hosts;
}

function isAllowedProxyHost(hostname: string): boolean {
  const h = String(hostname || '').toLowerCase();
  if (!h) return false;
  if (getAllowedHosts().has(h)) return true;
  // Allow any *.decksalone.com subdomain
  return h.endsWith('.decksalone.com');
}

function isPrivateIPv4(parts: number[]): boolean {
  const [a, b] = parts;
  if (a === 127) return true;           // loopback
  if (a === 10) return true;            // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true;          // private
  if (a === 169 && b === 254) return true;          // link-local (cloud metadata)
  if (a === 0) return true;             // "this host"
  return false;
}

function ipv6Groups(address: string): number[] | null {
  const lower = address.toLowerCase();
  const halves = lower.split('::');
  if (halves.length > 2) return null;
  let head = halves[0] ? halves[0].split(':') : [];
  let tail = halves[1] ? halves[1].split(':') : [];
  // Embedded IPv4 (e.g. ::ffff:127.0.0.1) occupies the last two groups.
  let embeddedV4: number[] | null = null;
  if (tail.length && tail[tail.length - 1].includes('.')) {
    embeddedV4 = tail.pop()!.split('.').map((n) => parseInt(n, 10));
    if (embeddedV4.length !== 4 || embeddedV4.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  }
  const missing = 8 - head.length - tail.length - (embeddedV4 ? 2 : 0);
  if (missing < 0) return null;
  const groups = [...head, ...Array(missing).fill('0'), ...tail]
    .map((g) => parseInt(g || '0', 16));
  if (groups.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  if (embeddedV4) {
    groups.push((embeddedV4[0] << 8) | embeddedV4[1], (embeddedV4[2] << 8) | embeddedV4[3]);
  }
  return groups.length === 8 ? groups : null;
}

function isPrivateIp(address: string): boolean {
  if (!address) return true; // unknown format: fail closed
  const ipv4 = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const parts = ipv4.slice(1).map((n) => parseInt(n, 10));
    if (parts.some((n) => n > 255)) return true;
    return isPrivateIPv4(parts);
  }
  if (address.includes(':')) {
    const g = ipv6Groups(address);
    if (!g) return true; // unparseable: fail closed
    if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0 && g[6] === 0 && (g[7] === 0 || g[7] === 1)) {
      return true; // :: / ::1 (unspecified / loopback)
    }
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if (g[5] === 0xffff && g[6] === 0 && g[7] === 0) {
      return true; // IPv4-compatible (::/96) — treat as this host
    }
    // IPv4-mapped (::ffff:a.b.c.d) — check the embedded address.
    if (g[5] === 0xffff) {
      return isPrivateIPv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
    }
    return false;
  }
  return true; // unparseable: fail closed
}

class ProxyUrlError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function assertSafeProxyUrl(imageUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new ProxyUrlError(400, 'Invalid image URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ProxyUrlError(400, 'Invalid image URL');
  }
  if (!isAllowedProxyHost(parsed.hostname)) {
    throw new ProxyUrlError(400, 'Image host not allowed');
  }
  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw new ProxyUrlError(400, 'Could not resolve image host');
  }
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new ProxyUrlError(400, 'Private image hosts are not allowed');
    }
  }
  return parsed;
}

const PROXY_ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

module.exports = {
  isAllowedProxyHost,
  isPrivateIp,
  assertSafeProxyUrl,
  ProxyUrlError,
  PROXY_ALLOWED_CONTENT_TYPES,
};
