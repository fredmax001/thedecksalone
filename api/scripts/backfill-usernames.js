require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });
const { prisma } = require('../utils/prisma');

const RESERVED = new Set([
  'admin', 'api', 'dashboard', 'login', 'logout', 'dj', 'user', 'soundit',
  'thedeck', 'moderator', 'support', 'help', 'about', 'contact', 'terms',
  'privacy', 'settings',
]);

function slugify(email) {
  const prefix = email.split('@')[0] || 'user';
  return prefix
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '')
    .slice(0, 20)
    .replace(/^[-_]+|[-_]+$/g, '');
}

function randomDigits(n = 4) {
  return Math.floor(Math.random() * 10 ** n)
    .toString()
    .padStart(n, '0');
}

async function generateUniqueUsername(email) {
  let base = slugify(email);
  if (!base || base.length < 3) base = 'user';
  if (base.length > 26) base = base.slice(0, 26);

  let username = base;
  let attempt = 0;
  while (true) {
    const candidate = `${username}${attempt === 0 ? '' : randomDigits()}`;
    if (!RESERVED.has(candidate)) {
      const existing = await prisma.user.findUnique({ where: { username: candidate } });
      if (!existing) return candidate;
    }
    attempt += 1;
    if (attempt > 100) {
      username = `user${randomDigits()}`;
      attempt = 0;
    }
  }
}

async function main() {
  const users = await prisma.user.findMany({ where: { username: null } });
  console.log(`Backfilling ${users.length} users without usernames...`);

  for (const user of users) {
    const username = await generateUniqueUsername(user.email);
    await prisma.user.update({ where: { id: user.id }, data: { username } });
    console.log(`${user.email} -> ${username}`);
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
