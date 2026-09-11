import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from the api root or app root so DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const prisma = new PrismaClient();

/**
 * One-off helper for the Smart Playlists launch:
 *  1. Backfills mood/energy on mixes that DJs haven't tagged yet,
 *     using a conservative genre → mood/energy mapping.
 *  2. Seeds a few starter smart playlists (skips ones that already exist).
 *
 * Run: cd app/api && npx ts-node scripts/smart-playlist-seed.ts
 */

// Conservative defaults — DJs can (and should) override these on their mixes.
const GENRE_DEFAULTS: Array<{ match: RegExp; mood: string; energy: string }> = [
  { match: /amapiano|3-step|house|electronic|edm|afro-house|deep house/i, mood: 'party', energy: 'high' },
  { match: /club|party/i, mood: 'party', energy: 'high' },
  { match: /dancehall|soca|calypso|trap|drill/i, mood: 'party', energy: 'high' },
  { match: /afrobeat|afro-fusion|afro-pop|highlife|coupe|soukous|makossa/i, mood: 'uplifting', energy: 'medium' },
  { match: /salone|koloqua|cultural|palm wine/i, mood: 'nostalgic', energy: 'medium' },
  { match: /reggae/i, mood: 'relaxed', energy: 'low' },
  { match: /r&b|soul|gospel|praise/i, mood: 'soulful', energy: 'low' },
  { match: /hip-hop|rap|old skool|throwback/i, mood: 'nostalgic', energy: 'medium' },
];

function defaultsFor(genre: string) {
  return GENRE_DEFAULTS.find((g) => g.match.test(genre || '')) || { mood: 'uplifting', energy: 'medium' };
}

const STARTER_PLAYLISTS = [
  {
    title: 'High-Energy Party Starters',
    description: 'Maximum-energy mixes to get any party moving — club, amapiano and dancehall heat.',
    moods: ['party'],
    energies: ['high'],
    genres: [],
    sortBy: 'trending',
    trackLimit: 25,
    isFeatured: true,
  },
  {
    title: 'Chill Salone Evenings',
    description: 'Relaxed low-energy sets for easy listening — reggae, soul and palm wine vibes.',
    moods: ['relaxed'],
    energies: ['low'],
    genres: [],
    sortBy: 'most_liked',
    trackLimit: 20,
    isFeatured: false,
  },
  {
    title: 'Afrobeats & Amapiano Heat',
    description: 'The freshest uplifting afrobeats, amapiano and afro-house in one place.',
    moods: ['uplifting', 'party'],
    energies: ['medium', 'high'],
    genres: ['Afrobeats', 'Amapiano', 'Afro-House / Deep House'],
    sortBy: 'trending',
    trackLimit: 25,
    isFeatured: true,
  },
  {
    title: 'Salone Heritage & Culture',
    description: 'Nostalgic Sierra Leonean sounds — Salone mixes, cultural rhythms and throwbacks.',
    moods: ['nostalgic', 'soulful'],
    energies: ['low', 'medium'],
    genres: ['Salone Mix', 'Palm Wine / Cultural', 'Old Skool / Throwbacks'],
    sortBy: 'newest',
    trackLimit: 20,
    isFeatured: false,
  },
];

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  // 1. Backfill untagged mixes
  const untagged = await prisma.mix.findMany({
    where: { OR: [{ mood: null }, { energy: null }] },
    select: { id: true, genre: true, mood: true, energy: true },
  });

  let backfilled = 0;
  for (const mix of untagged) {
    const d = defaultsFor(mix.genre);
    await prisma.mix.update({
      where: { id: mix.id },
      data: {
        mood: mix.mood || d.mood,
        energy: mix.energy || d.energy,
      },
    });
    backfilled++;
  }
  console.log(`✅ Backfilled mood/energy on ${backfilled} mixes (${untagged.length} were untagged)`);

  // 2. Seed starter smart playlists (idempotent by title)
  let created = 0;
  for (const sp of STARTER_PLAYLISTS) {
    const existing = await prisma.smartPlaylist.findFirst({ where: { title: sp.title } });
    if (existing) {
      console.log(`⏭  Skipped "${sp.title}" (already exists)`);
      continue;
    }
    await prisma.smartPlaylist.create({
      data: {
        ...sp,
        slug: `${slugify(sp.title)}-${Date.now().toString(36)}`,
      },
    });
    created++;
    console.log(`✅ Created smart playlist "${sp.title}"`);
  }

  console.log(`\nDone. ${created} smart playlists created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
