import crypto from 'crypto';
import { prisma } from './prisma';

export const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'dashboard',
  'login',
  'logout',
  'dj',
  'user',
  'soundit',
  'decksalone',
  'thedeck',
  'moderator',
  'support',
  'help',
  'about',
  'contact',
  'terms',
  'privacy',
  'settings',
  'rankings',
  'battles',
  'events',
  'mixes',
  'discover',
  'notifications',
  'messages',
  'payments',
]);

/**
 * Validates whether a username is valid format and not reserved.
 */
export function isValidUsername(username: unknown): boolean {
  return (
    typeof username === 'string' &&
    username.length >= 3 &&
    username.length <= 30 &&
    /^[a-z0-9_-]+$/.test(username) &&
    !RESERVED_USERNAMES.has(username.toLowerCase())
  );
}

/**
 * Generates a unique, non-colliding username from an email or base string.
 */
export async function generateUsername(email: string): Promise<string> {
  const prefix = (email.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '')
    .slice(0, 20)
    .replace(/^[-_]+|[-_]+$/g, '');
  const base = prefix.length >= 3 ? prefix : 'user';

  // First try the bare base name
  const baseExists = await prisma.user.findUnique({ where: { username: base } });
  if (!baseExists && !RESERVED_USERNAMES.has(base)) return base;

  // Append a random 4-char suffix — collision probability is astronomically low
  // (36^4 = 1.6M combinations). Retry up to 5 times for safety.
  for (let i = 0; i < 5; i++) {
    const suffix = crypto.randomBytes(2).toString('hex'); // e.g. "a3f2"
    const candidate = `${base}_${suffix}`;
    if (!RESERVED_USERNAMES.has(candidate)) {
      const existing = await prisma.user.findUnique({ where: { username: candidate } });
      if (!existing) return candidate;
    }
  }
  throw new Error('Unable to generate unique username after retries');
}

module.exports = {
  RESERVED_USERNAMES,
  isValidUsername,
  generateUsername,
};
